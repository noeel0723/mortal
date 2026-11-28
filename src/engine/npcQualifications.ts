import { programById } from '../data/academics.ts';
import type { Program } from '../data/academics.ts';
import type { Job } from '../data/jobs.ts';
import type { NpcProfile } from './socialTypes.ts';

export const educationRank = { 'Early childhood': 0, School: 1, 'High school': 2, Vocational: 3, Undergraduate: 4, Postgraduate: 5 };
const jobRank = { 'high-school': 2, vocational: 3, undergraduate: 4, postgraduate: 5 };
const programEducation = { vocational: 'Vocational', undergraduate: 'Undergraduate', postgraduate: 'Postgraduate' } as const;

export function programYears(program: Program) {
  const prerequisite = program.prerequisite ? programById.get(program.prerequisite) : undefined;
  return program.duration + (program.level === 'postgraduate' ? prerequisite?.duration ?? 3 : 0);
}

export function validNpcProgram(id: unknown, education: NpcProfile['education'], age: number) {
  const program = typeof id === 'string' ? programById.get(id) : undefined;
  return !!program && program.level !== 'equivalency' && programEducation[program.level] === education && age >= 18 + programYears(program);
}

export function qualifiedNpc(lifeAge: number, profile: NpcProfile, job: Job) {
  if (lifeAge < job.age || profile.experience < job.experience ||
    (job.qualification && educationRank[profile.education] < jobRank[job.qualification])) return false;
  if (!job.tags.length) return true;
  const program = profile.educationProgram && programById.get(profile.educationProgram);
  return !!program && validNpcProgram(program.id, profile.education, lifeAge) &&
    job.tags.some((tag) => program.careerEligibility.includes(tag));
}
