import { employerById } from '../data/employers.ts';
import { genders, givenNames, surnames } from '../data/veyra.ts';
import { contactIdentity } from './appearance.ts';
import { clamp } from './journal.ts';
import { seededRandom } from './random.ts';
import type { WorkContact } from './careerTypes.ts';
import type { Contact, Life } from './types.ts';

export function isWorkContact(person: Contact): person is WorkContact {
  return 'employerId' in person;
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
  const occupied = new Set([...life.family, ...life.schoolContacts, ...life.career.contacts].map(({ name }) => name));
  occupied.add(`${life.character.firstName} ${life.character.lastName}`);
  const names = genders.flatMap((gender) => givenNames[gender].flatMap((first) => surnames.map((last) => `${first} ${last}`)));
  const available = names.filter((name) => !occupied.has(name));
  const pool = available.length >= 5 ? available : names;
  const roles = ['Supervisor', 'Manager', 'Co-worker', 'Co-worker', 'Co-worker'] as const;
  const occupation = ['Team Supervisor', 'Department Manager', 'Staff Associate', 'Staff Associate', 'Staff Associate'] as const;
  roles.forEach((role, index) => {
    const id = `work-${employerId}-${index}`;
    const name = pool.splice(random.integer(0, pool.length - 1), 1)[0]!;
    life.career.contacts.push({
      id, name, ...contactIdentity(life.seed, id, name, role), employerId, role, friend: false,
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
    if (person.age >= maxAge || !person.health) person.alive = false;
  }
}
