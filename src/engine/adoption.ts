import { npcGivenNames, npcSurnames } from '../data/npcNames.ts';
import { cities, genders } from '../data/veyra.ts';
import { adoptionCost, registerChild, roomForChild } from './familyLife.ts';
import { recordNotice } from './eventNotices.ts';
import { familyPlanningWillingness } from './household.ts';
import { ensureNpc, makeNpc, npcRandom } from './npcs.ts';
import { findContact } from './school.ts';
import type { City, Life } from './types.ts';

export const adoptionApplicationFee = 500;

export function adoptionCandidates(life: Life, year = life.year, city: City = life.character.city) {
  const random = npcRandom(life, `adoption:${city}`, year);
  const surnames = [...npcSurnames];
  return Array.from({ length: 5 }, (_, index) => {
    const id = `npc-adoption-${year}-${index + 1}`;
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
  if (life.social.adoption) return 'Your adoption application is already being reviewed.';
  if (life.usedActions.includes('family-planning')) return 'Family planning is available again next year.';
  if (life.character.bank < adoptionApplicationFee) return 'Your balance does not cover the application fee.';
  return null;
}

export function adoptChild(life: Life, id: string, willingPartner?: string) {
  const issue = adoptionIssue(life);
  if (issue) return issue;
  const selected = adoptionCandidates(life).find(({ person }) => person.id === id);
  if (!selected) return 'This child profile is no longer available.';
  const marriage = life.social.romances.find(({ status }) => status === 'married');
  const spouse = findContact(life, marriage?.person);
  const partner = spouse?.alive && spouse.city === life.character.city && life.social.household?.living !== 'separate' &&
    (willingPartner === spouse.id || familyPlanningWillingness(life, spouse) >= 52) ? spouse.id : undefined;
  life.social.adoption = { candidate: id, city: life.character.city, applied: life.year, due: life.year + 1,
    fee: adoptionApplicationFee, ...(partner ? { partner } : {}) };
  recordNotice(life, 'family', 'Application Submitted', `I applied to adopt ${selected.person.name}. The agency will review the application next year.`,
    { bank: -adoptionApplicationFee }, 'personal');
  return null;
}

export function advanceAdoption(life: Life) {
  const application = life.social.adoption;
  if (!application || application.due > life.year) return;
  delete life.social.adoption;
  if (life.character.causeOfDeath) return;
  const selected = adoptionCandidates(life, application.applied, application.city).find(({ person }) => person.id === application.candidate);
  const partner = findContact(life, application.partner);
  const stillTogether = !application.partner || (partner?.alive && partner.city === life.character.city && life.social.household?.living !== 'separate' &&
    life.social.romances.some(({ person, status }) => person === partner.id && status === 'married'));
  const fee = adoptionCost - application.fee;
  const affordable = life.character.bank >= fee;
  const stable = life.character.attributes.health >= 40 && life.character.attributes.stress < 90;
  if (!selected || !roomForChild(life) || !stillTogether || !affordable || !stable) {
    recordNotice(life, 'family', 'Adoption Application Closed', 'The agency closed the application after reviewing our current finances, health, and household. I can submit a new application when my circumstances allow.');
    return;
  }
  selected.person.age += life.year - application.applied;
  selected.person.city = life.character.city;
  registerChild(life, selected.person, partner, true, selected.smarts, fee);
  ensureNpc(life, selected.person).traits.discipline = selected.behavior;
}
