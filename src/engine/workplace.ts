import { employerById } from '../data/employers.ts';
import { generateAppearance } from './appearance.ts';
import { recordContactDeath } from './death.ts';
import { clamp } from './journal.ts';
import { npcNamePicker } from './npcNames.ts';
import { seededRandom } from './random.ts';
import type { WorkContact } from './careerTypes.ts';
import type { Contact, Life } from './types.ts';

export const coworkerAcquaintanceThreshold = 70;
export function isWorkContact(person: Contact): person is WorkContact {
  return 'employerId' in person;
}

export function isWorkAcquaintance(person: Contact) {
  return isWorkContact(person) && person.alive && !person.friend && person.bond.affection > coworkerAcquaintanceThreshold;
}

export function canMakeFriend(person: Contact) {
  return isWorkContact(person) || person.role === 'Acquaintance' || person.role === 'Friend' ||
    ('stage' in person && (person.role === 'Classmate' || person.role === 'Student'));
}

export function activeCoworkers(life: Life) {
  return life.career.contacts.filter(({ employerId }) => employerId === life.career.current?.employerId);
}

export function ensureWorkplace(life: Life, employerId: string) {
  if (life.career.contacts.some((person) => person.employerId === employerId)) return;
  const seed = [...employerId].reduce((value, char) => Math.imul(value ^ char.charCodeAt(0), 16777619), life.seed);
  const random = seededRandom(seed);
  const employer = employerById.get(employerId)!;
  const pickName = npcNamePicker(life);
  const roles = ['Supervisor', 'Manager', 'Co-worker', 'Co-worker', 'Co-worker'] as const;
  const occupation = ['Team Supervisor', 'Department Manager', 'Staff Associate', 'Staff Associate', 'Staff Associate'] as const;
  roles.forEach((role, index) => {
    const id = `work-${employerId}-${index}`;
    const identity = pickName(seededRandom(random.integer(0, 0xffffffff)));
    life.career.contacts.push({
      id, ...identity, appearance: generateAppearance(life.seed, id), employerId, role, friend: false,
      age: random.integer(index < 2 ? 30 : 21, index < 2 ? 57 : 49), occupation: occupation[index]!,
      city: employer.city, health: random.integer(74, 98), alive: true,
      bond: { affection: random.integer(25, 52), trust: random.integer(25, 51), respect: random.integer(36, 62),
        compatibility: random.integer(25, 62), resentment: random.integer(0, 7), familiarity: random.integer(10, 24) },
    });
  });
}

export function ageWorkplace(life: Life, maxAge: number) {
  for (const person of life.career.contacts) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || !person.health) {
      recordContactDeath(life, person, !person.health ? 'Declining health' : 'Natural causes', 'career');
    }
  }
}
