import { ensureNpc } from './npcs.ts';
import { findContact } from './school.ts';
import type { City, Contact, Life } from './types.ts';

export function dependentChildren(life: Life) {
  return life.social.people.filter((person) => person.alive && person.age < 18 && Object.hasOwn(life.social.children, person.id));
}

export function householdMembers(life: Life): { person: Contact; role: 'Spouse' | 'Child' }[] {
  const members = dependentChildren(life).map((person) => ({ person, role: 'Child' as const }));
  const spouses = life.social.romances.filter(({ status }) => status === 'married')
    .map(({ person }) => findContact(life, person)).filter((person) => person?.alive);
  return [...spouses.map((person) => ({ person: person!, role: 'Spouse' as const })), ...members];
}

export function moveHousehold(life: Life, city: City) {
  const members = householdMembers(life);
  for (const { person } of members) {
    if (person.city === city) continue;
    ensureNpc(life, person).movedFrom = person.city;
    person.city = city;
    const relationship = life.social.relationships[person.id];
    if (relationship) delete relationship.move;
  }
  return members.length > 0;
}
