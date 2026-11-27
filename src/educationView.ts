import { institutionById, programById, programs } from './data/academics.ts';
import type { Program } from './data/academics.ts';
import {
  academicActionIssue, academicProgramName, admissionMinimum, admissionsScore, educationStatus,
  highestQualification, institutionName, isTuitionDue, latestApplication, termCost,
} from './engine/academics.ts';
import { isSchoolStage } from './engine/school.ts';
import { activities, activityIssue } from './engine/simulation.ts';
import type { AcademicAction, EducationPath, Enrollment, ProgramLevel } from './engine/academicTypes.ts';
import type { Action, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

const paths: Record<EducationPath, string> = {
  undecided: 'Undecided', university: 'University', vocational: 'Vocational training',
  workforce: 'Workforce', 'gap-year': 'Gap year',
};

export type EducationControl = { label: string; icon: Emoji; action: Action; issue: string | null; detail?: string };

export function educationTab(life: Life) {
  const level = life.academic.enrollment?.level;
  if (!level) return 'Career';
  if (isSchoolStage(level)) return 'School';
  return level === 'undergraduate' || level === 'postgraduate' ? 'University' : 'Education';
}

export function educationOverview(life: Life) {
  const { enrollment, path, gapUntil } = life.academic;
  return [
    { label: 'Current status', value: enrollment || life.character.age < 6 ? educationStatus(life) : 'Not enrolled' },
    { label: 'Highest qualification', value: highestQualification(life)?.title ?? 'None yet' },
    ...(enrollment ? [{ label: 'Institution', value: institutionName(enrollment.institutionId) }] : []),
    { label: 'Chosen path', value: path === 'gap-year' && gapUntil === null ? 'Gap year completed' : paths[path] },
  ];
}

export function gradeLabel(enrollment: Enrollment) {
  return enrollment.performanceRecorded ? `${enrollment.performance}%` : 'Grade unavailable';
}

const schoolNames = { primary: 'Primary School', secondary: 'Secondary School', high: 'High School' } as const;

export function institutionCard(life: Life, enrollment: Enrollment) {
  return isSchoolStage(enrollment.level)
    ? { name: `${life.character.city} ${schoolNames[enrollment.level]}`, detail: undefined, icon: 'school' as const }
    : { name: institutionName(enrollment.institutionId), detail: academicProgramName(enrollment.programId), icon: 'university' as const };
}

export function academicControl(life: Life, action: AcademicAction, label: string, icon: Emoji): EducationControl {
  return { action, label, icon, issue: academicActionIssue(life, action) };
}

export function enrollmentControls(life: Life) {
  const enrollment = life.academic.enrollment;
  if (!enrollment) return [];
  const controls: EducationControl[] = [];
  if (isTuitionDue(enrollment)) controls.push(academicControl(life, { type: 'pay-tuition' }, `Pay Tuition · ${money(termCost(life, enrollment))}`, 'bank'));
  const program = programById.get(enrollment.programId);
  if (program?.scholarshipScore && !life.academic.scholarships.some((item) => item.applicationId === enrollment.id)) {
    controls.push(academicControl(life, { type: 'apply-scholarship', programId: program.id }, 'Apply for Scholarship', 'university'));
  }
  return controls;
}

export function enrollmentRows(life: Life) {
  const enrollment = life.academic.enrollment;
  if (!enrollment) return [{ label: 'Enrollment', value: 'Not enrolled' }];
  const award = life.academic.scholarships.find((item) => item.applicationId === enrollment.id);
  return [
    { label: 'Institution', value: institutionName(enrollment.institutionId) },
    { label: 'Academic year', value: `${enrollment.yearsCompleted + 1} of ${enrollment.duration}` },
    { label: 'Attendance', value: `${enrollment.attendance}%` },
    { label: 'Academic stress', value: `${enrollment.stress}%` },
    ...(enrollment.tuition ? [{ label: 'Tuition each year', value: money(enrollment.tuition) }] : []),
    ...(award ? [{ label: 'Scholarship per year', value: money(award.annualAmount) }] : []),
    ...(isTuitionDue(enrollment) ? [{ label: 'Enrollment', value: 'On hold · tuition due' }] : []),
  ];
}

export function academicActivities(life: Life): EducationControl[] {
  const enrollment = life.academic.enrollment;
  if (!enrollment) return [];
  const school = isSchoolStage(enrollment.level);
  const entries = [
    { activity: 'study', label: 'Study Harder', icon: 'study', detail: 'Improve your performance and discipline.' },
    { activity: 'library', label: 'Visit Library', icon: 'library', detail: 'Review course material at your own pace.' },
    { activity: 'socialize', label: school ? 'Socialize with Classmates' : 'Socialize with Students', icon: 'relationships', detail: 'Build confidence and reduce academic stress.' },
    { activity: 'extracurricular', label: 'Join Extracurricular Activities', icon: 'extracurricular', detail: 'Build school engagement and discipline.' },
    { activity: 'academic-talk', label: school ? 'Talk to Teacher' : 'Talk to Professor', icon: 'talk', detail: 'Get feedback on your academic progress.' },
    { activity: 'exams', label: 'Prepare for Exams', icon: 'exam', detail: 'Improve performance at the cost of extra stress.' },
  ] as const;
  return entries.filter(({ activity }) => school || (activity !== 'library' && activity !== 'extracurricular')).map(({ activity, label, icon, detail }) => ({
    label, icon, action: { type: 'activity', activity },
    issue: life.pending ? 'Resolve the pending decision first.' :
      life.character.causeOfDeath ? 'This life has already ended.' : activityIssue(life, activity),
    detail: `${activities[activity].energy} energy · ${detail}`,
  }));
}

const programGroups: { level: ProgramLevel; title: string }[] = [
  { level: 'equivalency', title: 'Adult high school' }, { level: 'vocational', title: 'Vocational programs' },
  { level: 'undergraduate', title: 'Undergraduate programs' }, { level: 'postgraduate', title: 'Postgraduate programs' },
];

export function availableProgramGroups(life: Life) {
  if (life.character.age < 18) return [];
  const highSchool = life.academic.qualifications.some(({ level }) => level === 'high-school');
  const groups = (life.academic.path === 'university' ? [...programGroups.slice(2), ...programGroups.slice(0, 2)] : programGroups);
  return groups.filter(({ level }) => highSchool ? level !== 'equivalency' : level === 'equivalency')
    .map((group) => ({ ...group, programs: programs.filter(({ level }) => level === group.level) }));
}

export function programRows(life: Life, program: Program) {
  const institution = institutionById.get(program.institutionId)!;
  const application = latestApplication(life, program.id);
  const currentOffer = application?.result === 'accepted' && life.year <= application.year + 2;
  const aid = application && life.academic.scholarships.find((item) => item.applicationId === application.id);
  return [
    { label: 'Institution', value: `${institution.name} · ${institution.city}` },
    { label: 'Institution reputation', value: `${institution.reputation}/100` },
    { label: 'Duration', value: `${program.duration} ${program.duration === 1 ? 'year' : 'years'}` },
    { label: 'Annual tuition', value: money(program.tuition) },
    { label: 'Admission score', value: `${admissionsScore(life, program)} / ${admissionMinimum(program)} target` },
    { label: 'Qualification', value: program.qualification },
    { label: 'Skills', value: program.skills.join(', ') },
    ...(program.scholarshipScore ? [{ label: 'Scholarship', value: aid ? `Awarded · ${money(aid.annualAmount)}/year` : 'Merit or financial need' }] : []),
    ...(application ? [{ label: 'Latest application', value: currentOffer ? `Accepted · valid until ${application.year + 2}` :
      application.result === 'accepted' ? 'Offer expired' : application.result === 'enrolled' ? 'Enrollment accepted' : `Declined · ${application.year}` }] : []),
  ];
}

export function programControls(life: Life, program: Program) {
  const application = latestApplication(life, program.id);
  const valid = application?.result === 'accepted' && life.year <= application.year + 2;
  if (!valid) return [academicControl(life, { type: 'apply-program', programId: program.id }, 'Apply to Program', 'university')];
  const controls = [academicControl(life, { type: 'enroll-program', programId: program.id }, 'Enroll in Program', 'accept')];
  if (program.scholarshipScore && !life.academic.scholarships.some((item) => item.applicationId === application.id)) {
    controls.unshift(academicControl(life, { type: 'apply-scholarship', programId: program.id }, 'Apply for Scholarship', 'university'));
  }
  return controls;
}

export function academicRecordGroups(life: Life) {
  const { enrollment, history, qualifications, scholarships } = life.academic;
  return [
    { title: 'Current enrollment', rows: enrollment ?
      [{ label: academicProgramName(enrollment.programId), value: institutionName(enrollment.institutionId) },
        { label: 'Performance', value: gradeLabel(enrollment) }, ...enrollmentRows(life).slice(1)] :
      [{ label: 'Enrollment', value: 'Not enrolled' }] },
    { title: 'Attendance history', rows: history.map((item, index) => ({
      key: String(index), label: `${item.startedYear}–${item.endedYear} · ${academicProgramName(item.programId)}`,
      value: `${institutionName(item.institutionId)} · ${item.outcome}${item.performance === null ? '' : ` · ${item.performance}%`}`,
    })) },
    { title: 'Qualifications', rows: qualifications.map((item) => ({
      key: item.programId, label: `${item.year} · ${item.title}`,
      value: `${institutionName(item.institutionId)} · ${item.performance === null ? 'Grade unavailable' : `${item.performance}%`}`,
    })) },
    { title: 'Scholarships', rows: scholarships.map((item) => ({
      key: item.applicationId, label: `${item.awardedYear} · ${academicProgramName(item.programId)}`,
      value: `${money(item.annualAmount)}/year · ${money(item.receivedTotal)} received`,
    })) },
  ];
}
