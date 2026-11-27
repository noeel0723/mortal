import { programById } from '../data/academics.ts';
import { academicSkillLabels, jobCompetencies } from '../data/skillLinks.ts';
import type { Job } from '../data/jobs.ts';
import type { SkillId } from '../data/skills.ts';
import { incidentalPractice } from './skills.ts';
import type { Life } from './types.ts';

export function programCompetencies(programId: string): SkillId[] {
  const program = programById.get(programId);
  if (!program) return ['writing', 'mathematics'];
  return [...new Set(program.skills.flatMap((label) => {
    if (!Object.hasOwn(academicSkillLabels, label)) throw new Error(`Missing skill mapping for academic metadata: ${label}`);
    return academicSkillLabels[label]!;
  }))];
}

export function developAcademicSkills(life: Life, programId: string, amount: number) {
  const program = programById.get(programId);
  for (const id of programCompetencies(programId)) incidentalPractice(life, id, amount, program ? 55 : 20);
}

export function jobSkillStrength(life: Life, job: Job) {
  const ids = jobCompetencies(job);
  const overall = ids.reduce((sum, id) => sum + (life.skills.entries[id]?.proficiency ?? 0), 0) / ids.length;
  return Math.max(0, overall - 20);
}

export function developJobSkills(life: Life, job: Job, amount: number) {
  for (const id of jobCompetencies(job)) incidentalPractice(life, id, amount, 65);
}
