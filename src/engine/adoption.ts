import { npcGivenNames, npcSurnames } from '../data/npcNames.ts';
import { cities, genders } from '../data/veyra.ts';
import { adoptionCost, registerChild, roomForChild } from './familyLife.ts';
import { ensureNpc, makeNpc, npcRandom } from './npcs.ts';
import { findContact } from './school.ts';
import type { Life } from './types.ts';

export function adoptionCandidates(life: Life) {
  const random = npcRandom(life, `adoption:${life.character.city}`, life.year);
  const surnames = [...npcSurnames];
  return Array.from({ length: 5 }, (_, index) => {
    const id = `npc-adoption-${life.year}-${index + 1}`;
    const gender = random.pick(genders);
    const firstName = random.pick(npcGivenNames[gender]);
    const lastName = surnames.splice(random.integer(0, surnames.length - 1), 1)[0]!;
    const age = index < 3 ? index + 1 : random.integer(1, 3);
    const birthplace = random.pick(cities);
    const person = { ...makeNpc(life, id, age, 'Child', `${firstName} ${lastName}`), lastName, birthCity: birthplace };
    return { person, birthplace, smarts: random.integer(35, 88), looks: random.integer(35, 88), behavior: random.integer(40, 95) };
  }).filter(({ person }) => !Object.hasOwn(life.social.children, person.id));
}

export function adoptionIssue(life: Life) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  if (life.character.age < 18) return 'Adoption opens at age 18.';
  if (!roomForChild(life)) return 'Your household is full.';
  if (life.usedActions.includes('family-planning')) return 'Family planning is available again next year.';
  if (life.character.bank < adoptionCost) return 'Your balance does not cover adoption.';
  return null;
}

export function adoptChild(life: Life, id: string) {
  const issue = adoptionIssue(life);
  if (issue) return issue;
  const selected = adoptionCandidates(life).find(({ person }) => person.id === id);
  if (!selected) return 'This child profile is no longer available.';
  const marriage = life.social.romances.find(({ status }) => status === 'married');
  const spouse = findContact(life, marriage?.person);
  const partner = spouse?.alive && spouse.age >= 18 && spouse.city === life.character.city ? spouse : undefined;
  life.usedActions.push('family-planning');
  registerChild(life, selected.person, partner, true, selected.smarts);
  ensureNpc(life, selected.person).traits.discipline = selected.behavior;
  return null;
}
