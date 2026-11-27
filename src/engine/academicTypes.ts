export const academicLevels = ['primary', 'secondary', 'high', 'equivalency', 'vocational', 'undergraduate', 'postgraduate'] as const;
export type AcademicLevel = typeof academicLevels[number];
export type ProgramLevel = Exclude<AcademicLevel, 'primary' | 'secondary' | 'high'>;
export const educationPaths = ['undecided', 'university', 'vocational', 'workforce', 'gap-year'] as const;
export type EducationPath = typeof educationPaths[number];
export type GraduationPath = Exclude<EducationPath, 'undecided'>;
export type QualificationLevel = 'high-school' | 'vocational' | 'undergraduate' | 'postgraduate';

export type Enrollment = {
  id: string;
  institutionId: string;
  programId: string;
  level: AcademicLevel;
  startedYear: number;
  duration: number;
  yearsCompleted: number;
  yearsFunded: number;
  tuition: number;
  performance: number;
  performanceRecorded: boolean;
  attendance: number;
  stress: number;
};

export type AcademicRecord = {
  institutionId: string;
  programId: string;
  level: AcademicLevel;
  startedYear: number;
  endedYear: number;
  performance: number | null;
  outcome: 'completed' | 'graduated' | 'withdrawn' | 'failed';
};

export type Qualification = {
  level: QualificationLevel;
  title: string;
  institutionId: string;
  programId: string;
  year: number;
  performance: number | null;
  careerEligibility: string[];
};

export type Application = {
  id: string;
  programId: string;
  year: number;
  result: 'accepted' | 'rejected' | 'enrolled';
  score: number;
};

export type Scholarship = {
  applicationId: string;
  programId: string;
  awardedYear: number;
  annualAmount: number;
  receivedTotal: number;
};

export type AcademicState = {
  enrollment: Enrollment | null;
  path: EducationPath;
  gapUntil: number | null;
  leftSchool: boolean;
  history: AcademicRecord[];
  qualifications: Qualification[];
  applications: Application[];
  scholarships: Scholarship[];
};

export type AcademicAction =
  | { type: 'apply-program' | 'enroll-program' | 'apply-scholarship'; programId: string }
  | { type: 'pay-tuition' | 'drop-out' };
