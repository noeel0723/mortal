import type { Person } from './types.ts';

export const industries = ['Technology', 'Healthcare', 'Finance', 'Education', 'Engineering', 'Administration', 'Hospitality', 'Retail', 'Legal', 'Creative & Media'] as const;
export type Industry = typeof industries[number];
export type EmploymentType = 'part-time' | 'full-time';
export type EndReason = 'resigned' | 'changed jobs' | 'dismissed' | 'retired' | 'died';
export const workRoles = ['Supervisor', 'Manager', 'Co-worker'] as const;
export type WorkContact = Person<typeof workRoles[number]> & { employerId: string; friend: boolean };
export type SalaryChange = { year: number; salary: number; reason: 'raise' | 'promotion' };
export type Promotion = { year: number; from: string; to: string };

export type JobRecord = {
  jobId: string;
  initialJobId: string;
  employerId: string;
  startedYear: number;
  startingSalary: number;
  salary: number;
  salaryHistory: SalaryChange[];
  promotions: Promotion[];
};
export type CurrentJob = JobRecord & {
  hours: number;
  performance: number;
  satisfaction: number;
  security: number;
  stress: number;
  warnings: number;
  review: 'new' | 'steady' | 'strong' | 'warning' | 'promoted';
};
export type PastJob = JobRecord & { endedYear: number; reason: EndReason };
export type ApplicationResult = 'offered' | 'rejected' | 'ineligible' | 'accepted' | 'declined' | 'expired';
export type JobApplication = {
  id: string;
  jobId: string;
  employerId: string;
  salary: number;
  year: number;
  result: ApplicationResult;
  reason?: string;
};
export type CareerState = {
  current: CurrentJob | null;
  seeking: boolean;
  retiredYear: number | null;
  experience: number;
  industryExperience: Partial<Record<Industry, number>>;
  reputation: number;
  history: PastJob[];
  applications: JobApplication[];
  contacts: WorkContact[];
};
export type CareerAction =
  | { type: 'seek-work' | 'work-harder' | 'request-raise' | 'resign' | 'retire' }
  | { type: 'apply-job' | 'accept-job' | 'decline-job'; vacancy: string }
  | { type: 'work-hours'; hours: number };
export type CareerEffect = Partial<Pick<CurrentJob, 'performance' | 'satisfaction' | 'security' | 'stress'>> & { reputation?: number };
