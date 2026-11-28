import { genderLabels } from './data/veyra.ts';
import type { adoptionCandidates } from './engine/adoption.ts';
import { adoptionCost } from './engine/familyLife.ts';
import { surgeons, surgeryFee, surgeryIssue } from './engine/plasticSurgery.ts';
import type { findProcedure } from './engine/plasticSurgery.ts';
import type { Life } from './engine/types.ts';
import { money } from './i18n/en.ts';

export const accessoryFields = [
  { key: 'hat', label: 'Hat', icon: 'hat', remove: 'No Hat' },
  { key: 'glasses', label: 'Glasses', icon: 'glasses', remove: 'No Glasses' },
] as const;

export type Candidate = ReturnType<typeof adoptionCandidates>[number];

export function adoptionProfile(candidate: Candidate) {
  const { person, birthplace, smarts, looks, behavior } = candidate;
  return {
    details: [
      { label: 'Gender identity', value: genderLabels[person.gender] },
      { label: 'Age', value: person.age },
      { label: 'Birthplace', value: birthplace },
      { label: 'Adoption fee', value: money(adoptionCost) },
    ],
    meters: [
      { label: 'Health', value: person.health }, { label: 'Smarts', value: smarts },
      { label: 'Looks', value: looks }, { label: 'Behavior', value: behavior },
    ],
  };
}

export function surgeonRows(life: Life, procedure: NonNullable<ReturnType<typeof findProcedure>>) {
  return surgeons.map((surgeon) => {
    const fee = surgeryFee(procedure, surgeon);
    const detail = `${surgeon.quality} · ${money(fee)} · ${surgeon.chance}% success`;
    const issue = surgeryIssue(life) ?? (life.character.bank < fee ? 'Insufficient funds' : null);
    return { surgeon, detail, issue };
  });
}
