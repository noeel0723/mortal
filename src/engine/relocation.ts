import { cities } from '../data/veyra.ts';
import { recordNotice } from './eventNotices.ts';
import { committedRomance } from './love.ts';
import { ensureNpc } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { agreesToMove, openConcern } from './relationships.ts';
import { findContact } from './school.ts';
import type { City, Life } from './types.ts';

export const relocationQuote = (life: Life, city: City) => localExpense(life.world, city, 6200, true);

export function relocationIssue(life: Life, city: City) {
  if (!cities.includes(city)) return 'Choose a city in Veyra.';
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (life.character.age < 18) return 'Relocation opens at age 18.';
  if (life.character.city === city) return 'You already live here.';
  if (life.academic.enrollment) return 'Finish or withdraw from your current program before moving.';
  if (life.career.current) return 'Resign from your current job before moving.';
  if (life.usedActions.includes('relocate')) return 'You already relocated this year.';
  if (life.character.bank < relocationQuote(life, city)) return 'Your balance does not cover relocation.';
  return null;
}

export function relocate(life: Life, city: City) {
  const issue = relocationIssue(life, city);
  if (issue) return issue;
  const from = life.character.city;
  const price = relocationQuote(life, city);
  const spouse = committedRomance(life);
  const household = life.social.people.filter((person) => person.alive && person.age < 18 && life.social.children[person.id] &&
    life.social.parents[person.id]?.includes('self'));
  const partner = spouse?.status === 'married' ? findContact(life, spouse.person) : undefined;
  const moveTogether = !!partner?.alive && agreesToMove(life, partner);
  for (const person of moveTogether && partner ? [...household, partner] : household) {
    if (person.city === city) continue;
    ensureNpc(life, person).movedFrom = person.city;
    person.city = city;
  }
  life.character.city = city;
  if (partner?.alive && !moveTogether) {
    openConcern(life, partner.id, 'distance', 34);
    recordNotice(life, 'community', 'Living Apart', `${partner.name} decided to stay in ${partner.city} for now. We’ll need to talk about living apart.`);
  }
  life.property.residence = 'rent';
  life.usedActions.push('relocate');
  recordNotice(life, 'life', 'A New City', `I moved from ${from} to a rented home in ${city}.`,
    { bank: -price, happiness: 2, stress: 2 }, 'housing');
  return null;
}
