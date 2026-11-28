import { recordNotice, resultMeter } from './eventNotices.ts';
import { seededRandom } from './random.ts';
import type { Gender, Life } from './types.ts';
import type { Emoji } from '../theme/tokens.ts';

type Procedure = { id: string; title: string; detail: string; icon: Emoji; cost: number; improvement: number; gender?: Gender };

export const procedures = [
  { id: 'botox', title: 'Botox', detail: 'Soften expression lines', icon: 'syringe', cost: 1900, improvement: 5 },
  { id: 'eyelid', title: 'Eyelid Surgery', detail: 'Refresh the eye area', icon: 'eye', cost: 4500, improvement: 8 },
  { id: 'face-lift', title: 'Face Lift', detail: 'Lift facial contours', icon: 'person', cost: 7800, improvement: 14 },
  { id: 'liposuction', title: 'Liposuction', detail: 'Change body contours', icon: 'medical', cost: 5400, improvement: 9 },
  { id: 'nose', title: 'Nose Reshaping', detail: 'Change the shape of your nose', icon: 'nose', cost: 5700, improvement: 10 },
  { id: 'tummy-tuck', title: 'Tummy Tuck', detail: 'Contour the abdomen', icon: 'medical', cost: 6200, improvement: 11 },
  { id: 'chest-augmentation', title: 'Chest Augmentation', detail: 'Add volume to the chest', icon: 'medical', cost: 6900, improvement: 10, gender: 'woman' },
  { id: 'chest-contouring', title: 'Chest Contouring', detail: 'Define the chest profile', icon: 'medical', cost: 6900, improvement: 10, gender: 'man' },
] as const satisfies readonly Procedure[];
export type ProcedureId = typeof procedures[number]['id'];

export const surgeons = [
  { id: 'local', name: 'Dr. Avery Brooks', quality: 'Standard', chance: 58, multiplier: 1 },
  { id: 'experienced', name: 'Dr. Maya Patel', quality: 'Experienced', chance: 78, multiplier: 1.55 },
  { id: 'specialist', name: 'Dr. Aoi Takahashi', quality: 'Specialist', chance: 94, multiplier: 2.3 },
] as const;
export type SurgeonId = typeof surgeons[number]['id'];

export function availableProcedures(life: Life) {
  return procedures.filter((item) => !('gender' in item) || life.character.gender === 'nonbinary' || life.character.gender === item.gender);
}

export function findProcedure(life: Life, id?: string) {
  return availableProcedures(life).find((procedure) => procedure.id === id);
}

export const surgeryFee = (procedure: Procedure, surgeon: typeof surgeons[number]) => Math.round(procedure.cost * surgeon.multiplier);

export function surgeryIssue(life: Life) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  return life.character.age < 18 ? 'Available from age 18.' : null;
}

export function performSurgery(life: Life, procedureId: ProcedureId, surgeonId: SurgeonId) {
  const issue = surgeryIssue(life);
  if (issue) return issue;
  const procedure = findProcedure(life, procedureId);
  const surgeon = surgeons.find(({ id }) => id === surgeonId);
  if (!procedure || !surgeon) return 'Choose a procedure and a surgeon.';
  const fee = surgeryFee(procedure, surgeon);
  if (life.character.bank < fee) return 'Your balance does not cover this surgeon.';
  const random = seededRandom(life.random);
  const successful = random.next() * 100 < surgeon.chance;
  const looks = successful ? procedure.improvement + random.integer(0, 3) : -random.integer(5, 13);
  life.random = random.state;
  const before = life.character.attributes.looks;
  const service = procedure.title.toLowerCase();
  const story = successful ? `${surgeon.name} completed my ${service}. I was pleased with the result after it healed.` :
    `I had a complication after my ${service} with ${surgeon.name}. The result left me unhappy with my appearance.`;
  const notice = recordNotice(life, 'health', successful ? 'Cosmetic Procedure Complete' : 'Surgery Complication', story,
    { looks, bank: -fee }, 'medical');
  notice.meter = resultMeter('Looks', before, life.character.attributes.looks);
  return null;
}
