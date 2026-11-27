import { institutionById, programById } from '../data/academics.ts';
import type { Program } from '../data/academics.ts';
import { educationLabels } from '../data/veyra.ts';
import { clamp, record } from './journal.ts';
import { seededRandom } from './random.ts';
import { createProgramClass, createSchoolClass, educationAt, isSchoolStage } from './school.ts';
import type { AcademicAction, AcademicRecord, AcademicState, Enrollment, GraduationPath, QualificationLevel } from './academicTypes.ts';
import type { Character, Life, SchoolStage } from './types.ts';

const schoolDurations: Record<SchoolStage, number> = { primary: 6, secondary: 3, high: 3 };
const schoolAges: Record<SchoolStage, number> = { primary: 6, secondary: 12, high: 15 };
const qualificationRank: Record<QualificationLevel, number> = { 'high-school': 0, vocational: 1, undergraduate: 2, postgraduate: 3 };

export function academicStateAtBirth(): AcademicState {
  return { enrollment: null, path: 'undecided', gapUntil: null, leftSchool: false, history: [], qualifications: [], applications: [], scholarships: [] };
}

function startingPerformance(character: Character) {
  return Math.round((character.attributes.smarts + character.attributes.discipline) / 2);
}

function schoolEnrollment(character: Character, stage: SchoolStage): Enrollment {
  const startedYear = character.birthYear + schoolAges[stage];
  const yearsCompleted = Math.min(schoolDurations[stage] - 1, Math.max(0, character.age - schoolAges[stage]));
  return {
    id: `school-${stage}`, institutionId: `public-${character.city}`, programId: `school-${stage}`,
    level: stage, startedYear, duration: schoolDurations[stage], yearsCompleted, yearsFunded: yearsCompleted + 1,
    tuition: 0, performance: startingPerformance(character), performanceRecorded: true, attendance: 86, stress: 10,
  };
}

export function institutionName(id: string) {
  return institutionById.get(id)?.name ?? (id.startsWith('public-') ? `${id.slice(7)} Public Schools` : id);
}

export function academicProgramName(id: string) {
  const stage = id.slice(7);
  return programById.get(id)?.title ?? (isSchoolStage(stage) ? educationLabels[stage] : id);
}

export function migrateAcademics(life: Life) {
  const { character } = life;
  const stage = character.education;
  if (isSchoolStage(stage)) life.academic.enrollment = { ...schoolEnrollment(character, stage), performanceRecorded: false };
  if (stage === 'completed' && character.age >= 18) {
    const year = character.birthYear + 18;
    life.academic.qualifications.push({
      level: 'high-school', title: 'High School Diploma', institutionId: `public-${character.city}`,
      programId: 'school-high', year, performance: null, careerEligibility: ['entry-level'],
    });
  }
}

export function highestQualification(life: Life) {
  return life.academic.qualifications.reduce<AcademicState['qualifications'][number] | undefined>((best, item) =>
    !best || qualificationRank[item.level] >= qualificationRank[best.level] ? item : best, undefined);
}

export function educationStatus(life: Life) {
  const enrollment = life.academic.enrollment;
  if (enrollment) return academicProgramName(enrollment.programId);
  if (life.character.age < 6) return educationLabels.early;
  return highestQualification(life)?.title ?? 'Not enrolled';
}

export function chooseEducationPath(life: Life, path: GraduationPath) {
  life.academic.path = path;
  life.academic.gapUntil = path === 'gap-year' ? life.year + 1 : null;
}

export function isTuitionDue(enrollment: Enrollment) {
  return enrollment.yearsFunded === enrollment.yearsCompleted;
}

export function admissionsScore(life: Life, program: Program) {
  const { attributes, talent } = life.character;
  const previous = life.academic.qualifications.findLast(({ level }) => level === program.requires)?.performance;
  const historyGrade = previous ?? life.academic.history.at(-1)?.performance ?? startingPerformance(life.character);
  return clamp(Math.round(historyGrade * .56 + attributes.smarts * .26 + attributes.discipline * .18 +
    (program.aptitude && program.aptitude === talent ? 7 : 0)));
}

export function admissionMinimum(program: Program) {
  return program.level === 'equivalency' ? program.minimumScore :
    Math.max(program.minimumScore, institutionById.get(program.institutionId)?.admissionScore ?? 0);
}

export function latestApplication(life: Life, programId: string) {
  return life.academic.applications.findLast((item) => item.programId === programId);
}

function issueForApplication(life: Life, program: Program) {
  if (life.character.age < 18) return 'Applications open at age 18.';
  if (life.academic.enrollment) return 'Finish or leave your current program first.';
  if (life.academic.gapUntil !== null && life.year < life.academic.gapUntil) return 'Your gap year is still in progress.';
  if (life.academic.qualifications.some((item) => item.programId === program.id ||
    (program.level === 'equivalency' && item.level === 'high-school'))) return 'You already hold this qualification.';
  if (life.academic.history.some((item) => item.programId === program.id && item.endedYear === life.year && item.outcome === 'withdrawn')) {
    return 'You can reapply to this program next year.';
  }
  if (program.requires && !life.academic.qualifications.some(({ level }) => level === program.requires)) {
    return program.requires === 'high-school' ? 'A high school qualification is required.' : 'An undergraduate degree is required.';
  }
  if (program.prerequisite && !life.academic.qualifications.some(({ programId }) => programId === program.prerequisite)) {
    return `Requires ${academicProgramName(program.prerequisite)}.`;
  }
  return null;
}

function availableOffer(life: Life, programId: string) {
  const application = latestApplication(life, programId);
  return application?.result === 'accepted' && life.year <= application.year + 2 ? application : undefined;
}

function scholarshipFor(life: Life, applicationId: string) {
  return life.academic.scholarships.find((item) => item.applicationId === applicationId);
}

export function termCost(life: Life, enrollment: Enrollment) {
  return enrollment.tuition - (scholarshipFor(life, enrollment.id)?.annualAmount ?? 0);
}

export function academicActionIssue(life: Life, action: AcademicAction): string | null {
  if (life.character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve your pending decision in the journal first.';
  const enrollment = life.academic.enrollment;
  if (action.type === 'drop-out') return enrollment ? null : 'You are not enrolled.';
  if (action.type === 'pay-tuition') {
    if (!enrollment || !isTuitionDue(enrollment)) return 'There is no tuition due.';
    return termCost(life, enrollment) > life.character.bank ? 'You cannot afford this year’s tuition.' : null;
  }
  if (!('programId' in action)) return 'This education action is unavailable.';
  const program = programById.get(action.programId);
  if (!program) return 'This program is unavailable.';
  const offer = availableOffer(life, program.id);
  if (action.type === 'apply-scholarship') {
    const eligibility = enrollment?.programId === program.id ? enrollment : offer;
    if (!eligibility || !program.scholarshipScore) return 'This scholarship requires an eligible offer or enrollment.';
    if (scholarshipFor(life, eligibility.id)) return 'A scholarship has already been awarded for this program.';
    if (admissionsScore(life, program) < program.scholarshipScore &&
      !(life.character.bank < program.tuition && admissionsScore(life, program) >= admissionMinimum(program))) {
      return `Requires a score of ${program.scholarshipScore}, or financial need and a score of ${admissionMinimum(program)}.`;
    }
    return null;
  }
  const issue = issueForApplication(life, program);
  if (issue) return issue;
  if (action.type === 'apply-program') {
    if (offer) return 'You already have a valid offer.';
    if (latestApplication(life, program.id)?.year === life.year) return 'You already applied to this program this year.';
    return null;
  }
  if (!offer) return 'Apply and receive an offer before enrolling.';
  const aid = scholarshipFor(life, offer.id)?.annualAmount ?? 0;
  return program.tuition - aid > life.character.bank ? 'You cannot afford the first year. Check scholarship eligibility.' : null;
}

function fundTerm(life: Life, enrollment: Enrollment) {
  if (!isTuitionDue(enrollment) || termCost(life, enrollment) > life.character.bank) return false;
  const aid = scholarshipFor(life, enrollment.id);
  const year = enrollment.yearsCompleted + 1;
  const title = academicProgramName(enrollment.programId);
  if (aid && aid.annualAmount) {
    aid.receivedTotal += aid.annualAmount;
    record(life, 'school', `I received my ${title} scholarship for year ${year}.`, { bank: aid.annualAmount });
  }
  if (enrollment.tuition) record(life, 'school', `I paid ${title} tuition for year ${year}.`, { bank: -enrollment.tuition });
  enrollment.yearsFunded += 1;
  return true;
}

function recordCompletion(life: Life, enrollment: Enrollment, outcome: AcademicRecord['outcome']) {
  life.academic.history.push({
    institutionId: enrollment.institutionId, programId: enrollment.programId, level: enrollment.level,
    startedYear: enrollment.startedYear, endedYear: life.year,
    performance: enrollment.performanceRecorded ? enrollment.performance : null, outcome,
  });
  life.academic.enrollment = null;
}

export function performAcademicAction(life: Life, action: AcademicAction) {
  const issue = academicActionIssue(life, action);
  if (issue) return issue;
  if (action.type === 'pay-tuition') {
    fundTerm(life, life.academic.enrollment!);
  } else if (action.type === 'drop-out') {
    const enrollment = life.academic.enrollment!;
    if (isSchoolStage(enrollment.level)) life.academic.leftSchool = true;
    recordCompletion(life, enrollment, 'withdrawn');
    record(life, 'school', `I withdrew from ${academicProgramName(enrollment.programId)}.`);
  } else if ('programId' in action) {
    const program = programById.get(action.programId)!;
    if (action.type === 'apply-program') {
      const score = admissionsScore(life, program);
      const random = seededRandom(life.random);
      const roll = random.integer(-7, 5);
      life.random = random.state;
      const accepted = score >= admissionMinimum(program) - 4 && score + roll >= admissionMinimum(program);
      life.academic.applications.push({
        id: `${program.id}-${life.year}`, programId: program.id, year: life.year, score,
        result: accepted ? 'accepted' : 'rejected',
      });
      record(life, 'school', accepted ? `I was offered a place in ${program.title}.` : `My application for ${program.title} was declined.`);
    } else if (action.type === 'apply-scholarship') {
      const id = life.academic.enrollment?.programId === program.id ? life.academic.enrollment.id : availableOffer(life, program.id)!.id;
      life.academic.scholarships.push({ applicationId: id, programId: program.id, awardedYear: life.year, annualAmount: program.tuition, receivedTotal: 0 });
      record(life, 'school', `I was awarded a tuition scholarship for ${program.title}.`);
    } else {
      const offer = availableOffer(life, program.id)!;
      offer.result = 'enrolled';
      const enrollment: Enrollment = {
        id: offer.id, programId: program.id, level: program.level, institutionId: program.institutionId,
        startedYear: life.year, duration: program.duration, yearsCompleted: 0, yearsFunded: 0, tuition: program.tuition,
        performance: startingPerformance(life.character), performanceRecorded: true, attendance: 86, stress: 12,
      };
      life.academic.enrollment = enrollment;
      life.schoolContacts.push(...createProgramClass(life, enrollment));
      record(life, 'school', `I enrolled in ${program.title} at ${institutionName(program.institutionId)}.`);
      fundTerm(life, enrollment);
    }
  }
  return null;
}

function annualPerformance(life: Life, enrollment: Enrollment, random: ReturnType<typeof seededRandom>) {
  const { attributes, talent } = life.character;
  const aptitude = programById.get(enrollment.programId)?.aptitude ?? 'academic';
  enrollment.attendance = clamp(Math.round(enrollment.attendance * .6 + ((attributes.discipline + attributes.health) / 2) * .4 + random.integer(-3, 3)));
  enrollment.stress = clamp(enrollment.stress - 6 + Math.round(attributes.stress / 15));
  const target = attributes.smarts * .28 + attributes.discipline * .23 + enrollment.attendance * .23 +
    attributes.health * .15 + (100 - enrollment.stress) * .11 + (talent === aptitude ? 5 : 0);
  enrollment.performance = clamp(Math.round(enrollment.performance * .6 + target * .4 + random.integer(-4, 3)));
  enrollment.performanceRecorded = true;
}

function graduate(life: Life, enrollment: Enrollment, program?: Program) {
  const schoolDiploma = enrollment.level === 'high';
  const level = schoolDiploma || enrollment.level === 'equivalency' ? 'high-school' :
    program?.level === 'vocational' || program?.level === 'postgraduate' ? program.level : 'undergraduate';
  const title = program?.qualification ?? 'High School Diploma';
  life.academic.qualifications.push({
    level, title, institutionId: enrollment.institutionId, programId: enrollment.programId,
    year: life.year, performance: enrollment.performance, careerEligibility: [...(program?.careerEligibility ?? ['entry-level'])],
  });
  recordCompletion(life, enrollment, 'graduated');
  record(life, 'school', schoolDiploma ? 'I graduated from high school.' : `I earned my ${title}.`, { smarts: 2, discipline: 1 });
  return level === 'high-school';
}

export function advanceAcademics(life: Life, random: ReturnType<typeof seededRandom>) {
  const { character, academic } = life;
  if (academic.gapUntil !== null && life.year >= academic.gapUntil) academic.gapUntil = null;
  const nextStage = educationAt(character.age);
  character.education = nextStage;
  const enrollment = academic.enrollment;
  let graduatedHigh = false;
  if (enrollment && !isTuitionDue(enrollment)) {
    annualPerformance(life, enrollment, random);
    enrollment.yearsCompleted += 1;
    const program = programById.get(enrollment.programId);
    if (enrollment.yearsCompleted >= enrollment.duration) {
      if (enrollment.level === 'primary' || enrollment.level === 'secondary') {
        recordCompletion(life, enrollment, 'completed');
      } else if (enrollment.performance < (program ? 45 : 35) || enrollment.attendance < 45) {
        recordCompletion(life, enrollment, 'failed');
        record(life, 'school', `I finished ${academicProgramName(enrollment.programId)} without meeting the graduation requirements.`);
      } else {
        graduatedHigh = graduate(life, enrollment, program);
      }
    } else if (!fundTerm(life, enrollment)) {
      record(life, 'school', `My next year of ${academicProgramName(enrollment.programId)} is on hold until I can pay tuition.`);
    }
  }
  if (!academic.enrollment && !academic.leftSchool && isSchoolStage(nextStage)) {
    academic.enrollment = schoolEnrollment(character, nextStage);
    if (!life.schoolContacts.some((contact) => contact.stage === nextStage && !contact.cohortId)) {
      life.schoolContacts.push(...createSchoolClass(life, nextStage));
    }
    record(life, 'school', `I started ${educationLabels[nextStage].toLowerCase()}.`, { smarts: 2, discipline: 1 });
  }
  return graduatedHigh;
}
