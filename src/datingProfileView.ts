import { jobById } from './data/jobs.ts';
import { skills } from './data/skills.ts';
import { educationStatus } from './engine/academics.ts';
import { employmentStatus } from './engine/career.ts';
import { datingProfileFields } from './engine/dating.ts';
import type { DatingProfile } from './engine/dating.ts';
import type { Life } from './engine/types.ts';

export const profileFields = Object.entries(datingProfileFields).map(([key, { label, options }]) => ({
  key: key as keyof DatingProfile, label, options: Object.entries(options).map(([id, option]) => ({ id, label: option.label })),
}));

export function datingProfileIdentity(life: Life) {
  const { character, career } = life;
  const job = career.current && jobById.get(career.current.jobId);
  const occupation = job?.title ?? (life.academic.enrollment ? educationStatus(life) : employmentStatus(life));
  return {
    name: `${character.firstName} ${character.lastName}`, occupation,
    interests: life.skills.hobbies.map((id) => skills[id].name),
  };
}
