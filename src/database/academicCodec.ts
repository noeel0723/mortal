import { institutionById, programById } from '../data/academics.ts';
import { cities } from '../data/veyra.ts';
import { academicLevels, educationPaths } from '../engine/academicTypes.ts';
import { isSchoolStage } from '../engine/school.ts';

const qualifications = ['high-school', 'vocational', 'undergraduate', 'postgraduate'];
const outcomes = ['completed', 'graduated', 'withdrawn', 'failed'];
const results = ['accepted', 'rejected', 'enrolled'];
const schoolStages = ['primary', 'secondary', 'high'];
const schoolProgram = (id: unknown) => schoolStages.some((stage) => id === `school-${stage}`);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const int = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const stat = (value: unknown) => int(value, 0, 100);
const knownInstitution = (id: unknown) => typeof id === 'string' &&
  (institutionById.has(id) || cities.some((city) => id === `public-${city}`));
const knownProgram = (id: unknown) => typeof id === 'string' && (programById.has(id) || schoolProgram(id));
const validLevel = (value: unknown) => academicLevels.some((level) => level === value);
const nullableGrade = (value: unknown) => value === null || stat(value);

export function validAcademicState(value: unknown, birthYear: number, year: number) {
  if (!record(value) || typeof value.leftSchool !== 'boolean' || !educationPaths.some((path) => path === value.path) ||
    (value.gapUntil !== null && (value.path !== 'gap-year' || value.gapUntil !== year + 1)) ||
    !Array.isArray(value.history) || !Array.isArray(value.qualifications) ||
    !Array.isArray(value.applications) || !Array.isArray(value.scholarships)) return false;

  const dated = (item: unknown) => int(item, birthYear, year);
  const applications = value.applications;
  if (!applications.every((app: unknown) => record(app) && typeof app.programId === 'string' &&
    programById.has(app.programId) && dated(app.year) && app.id === `${app.programId}-${app.year}` &&
    stat(app.score) && results.some((result) => result === app.result))) return false;
  if (new Set(applications.map((app) => app.id)).size !== applications.length) return false;

  const awards = value.scholarships;
  if (!awards.every((award: unknown) => {
    if (!record(award) || typeof award.programId !== 'string') return false;
    const program = programById.get(award.programId);
    const application = applications.find((entry) => entry.id === award.applicationId);
    return !!program?.scholarshipScore && !!application && application.result !== 'rejected' &&
      application.programId === award.programId && int(award.awardedYear, application.year, year) &&
      award.annualAmount === program.tuition && int(award.receivedTotal, 0, program.duration * program.tuition) &&
      award.receivedTotal % program.tuition === 0;
  }) || new Set(awards.map((award) => award.applicationId)).size !== awards.length) return false;

  if (!value.history.every((entry: unknown) => record(entry) && knownInstitution(entry.institutionId) &&
    knownProgram(entry.programId) && validLevel(entry.level) && dated(entry.startedYear) &&
    int(entry.endedYear, Number(entry.startedYear), year) && nullableGrade(entry.performance) &&
    outcomes.some((outcome) => outcome === entry.outcome))) return false;

  if (!value.qualifications.every((entry: unknown) => record(entry) && knownInstitution(entry.institutionId) &&
    knownProgram(entry.programId) && typeof entry.title === 'string' && int(entry.year, birthYear + 18, year) &&
    nullableGrade(entry.performance) && qualifications.some((level) => level === entry.level) &&
    Array.isArray(entry.careerEligibility) && entry.careerEligibility.every((job: unknown) => typeof job === 'string')) ||
    new Set(value.qualifications.map((entry) => entry.programId)).size !== value.qualifications.length) return false;

  const enrollment = value.enrollment;
  if (enrollment === null) return true;
  if (!record(enrollment) || typeof enrollment.id !== 'string' || typeof enrollment.programId !== 'string' ||
    !knownInstitution(enrollment.institutionId) || !validLevel(enrollment.level) || !dated(enrollment.startedYear) ||
    !int(enrollment.duration, 1, 10) || !int(enrollment.yearsCompleted, 0, enrollment.duration - 1) ||
    !int(enrollment.yearsFunded, enrollment.yearsCompleted, enrollment.yearsCompleted + 1) ||
    !stat(enrollment.performance) || typeof enrollment.performanceRecorded !== 'boolean' ||
    !stat(enrollment.attendance) || !stat(enrollment.stress)) return false;
  if (isSchoolStage(enrollment.level)) {
    return enrollment.id === enrollment.programId && enrollment.programId === `school-${enrollment.level}` &&
      enrollment.tuition === 0 && enrollment.yearsFunded === enrollment.yearsCompleted + 1;
  }
  const program = programById.get(enrollment.programId);
  return !!program && program.level === enrollment.level && program.institutionId === enrollment.institutionId &&
    program.tuition === enrollment.tuition && program.duration === enrollment.duration &&
    applications.some((item) => item.id === enrollment.id && item.programId === program.id &&
      item.result === 'enrolled' && item.year <= Number(enrollment.startedYear));
}
