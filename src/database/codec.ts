import { eventById } from '../data/events.ts';
import { academicStateAtBirth, migrateAcademics } from '../engine/academics.ts';
import { academicLevels } from '../engine/academicTypes.ts';
import { validateProfile } from '../engine/create.ts';
import { advanceContactOccupation, createSchoolClass, isSchoolStage } from '../engine/school.ts';
import { maxAge } from '../engine/simulation.ts';
import { stats } from '../engine/types.ts';
import type { Life, ProfileInput } from '../engine/types.ts';
import { cities } from '../data/veyra.ts';
import { validAcademicState } from './academicCodec.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown) => integer(value, 0, 100);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const bondKeys = ['affection', 'trust', 'respect', 'compatibility', 'resentment', 'familiarity'];
const categories = ['life', 'family', 'school', 'health', 'community', 'decision'];
const effects = (value: unknown) => record(value) && Object.entries(value).every(([key, amount]) =>
  (key === 'bank' || stats.some((stat) => stat === key)) && integer(amount, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));

function savedPerson(person: unknown): person is Record<string, unknown> {
  if (!record(person)) return false;
  const bond = person.bond;
  return typeof person.id === 'string' && typeof person.name === 'string' && integer(person.age, 0, maxAge) &&
    typeof person.occupation === 'string' && cities.some((city) => city === person.city) &&
    bounded(person.health) && typeof person.alive === 'boolean' &&
    record(bond) && bondKeys.every((key) => bounded(bond[key]));
}

export function decodeLife(json: string): Life {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('This saved life is damaged.');
  }
  if (!record(value)) throw new Error('This saved life is damaged.');
  if (value.version !== 1 && value.version !== 2) throw new Error('This saved life uses an unsupported version.');
  const { character, family, schoolContacts, journal, pending, scheduled, seen, usedActions, transactions, year } = value;
  if (!record(character) || typeof character.firstName !== 'string' || typeof character.lastName !== 'string' ||
    validateProfile(character as ProfileInput) || !integer(character.age, 0, maxAge) ||
    !integer(year, 1950, 2100 + maxAge) || year !== Number(character.birthYear) + character.age ||
    !integer(character.bank, 0, Number.MAX_SAFE_INTEGER) ||
    !['early', 'primary', 'secondary', 'high', 'completed'].some((stage) => stage === character.education) ||
    !['curious', 'steady', 'outgoing', 'thoughtful'].some((trait) => trait === character.personality) ||
    (character.causeOfDeath !== null && typeof character.causeOfDeath !== 'string') ||
    !integer(value.seed, 0, 0xffffffff) || !integer(value.random, 0, 0xffffffff)) {
    throw new Error('This saved life has invalid character data.');
  }
  const attributes = character.attributes;
  const age = character.age;
  if (!record(attributes) || !stats.every((stat) => bounded(attributes[stat])) ||
    !Array.isArray(family) || !family.every((person: unknown) =>
      savedPerson(person) && (person.role === 'Mother' || person.role === 'Father')) ||
    ((value.version === 2 || schoolContacts !== undefined) && (!Array.isArray(schoolContacts) ||
      !schoolContacts.every((person: unknown) => savedPerson(person) && academicLevels.some((level) => level === person.stage) &&
        typeof person.friend === 'boolean' && (isSchoolStage(person.stage) ?
          (person.role === 'Teacher' || person.role === 'Classmate') && (person.role === 'Classmate' || !person.friend) &&
            person.cohortId === undefined :
          value.version === 2 && typeof person.cohortId === 'string' && (person.role === 'Professor' || person.role === 'Student') &&
            (person.role === 'Student' ? integer(person.graduationAge, 18, maxAge) : !person.friend))) ||
      new Set([...family, ...schoolContacts].map((person) => person.id)).size !== family.length + schoolContacts.length)) ||
    !Array.isArray(journal) || !journal.length || !journal.every((entry: unknown) => record(entry) &&
      integer(entry.age, 0, age) && typeof entry.text === 'string' && categories.some((category) => category === entry.category) && effects(entry.changes)) ||
    !strings(seen) || !strings(usedActions) ||
    (pending !== null && (typeof pending !== 'string' || !eventById.get(pending)?.choices?.length || !seen.includes(pending))) ||
    !Array.isArray(scheduled) || !scheduled.every((entry: unknown) => record(entry) &&
      integer(entry.year, year + 1, 2100 + maxAge + 2) && typeof entry.text === 'string' && effects(entry.effects)) ||
    !Array.isArray(transactions) || !transactions.every((item: unknown) => record(item) &&
      integer(item.year, Number(character.birthYear), year) && typeof item.label === 'string' &&
      integer(item.amount, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER))) {
    throw new Error('This saved life has invalid simulation data.');
  }
  const life = value as Life;
  if (value.version === 1) {
    life.version = 2;
    life.academic = academicStateAtBirth();
    migrateAcademics(life);
    if (schoolContacts === undefined) {
      life.schoolContacts = [];
      const stage = life.character.education;
      if (isSchoolStage(stage)) life.schoolContacts = createSchoolClass(life, stage);
    }
    for (const person of life.schoolContacts) if (person.alive) advanceContactOccupation(person);
  } else if (!validAcademicState(value.academic, Number(character.birthYear), year)) {
    throw new Error('This saved life has invalid academic data.');
  }
  return life;
}
