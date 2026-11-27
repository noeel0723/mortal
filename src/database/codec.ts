import { eventById } from '../data/events.ts';
import { libraryHobbies } from '../data/libraryEvents.ts';
import { assetById, starterHome } from '../data/shops.ts';
import { academicStateAtBirth, migrateAcademics } from '../engine/academics.ts';
import { academicLevels } from '../engine/academicTypes.ts';
import { initialCareer } from '../engine/career.ts';
import { initialFinance } from '../engine/finance.ts';
import { transactionCategories } from '../engine/financeTypes.ts';
import { illnessLevels, illnesses, playerPatient } from '../engine/healthTypes.ts';
import { contactIdentity, generateAppearance, validAppearance } from '../engine/appearance.ts';
import { validateProfile } from '../engine/create.ts';
import { advanceContactOccupation, createSchoolClass, isSchoolStage } from '../engine/school.ts';
import { maxAge } from '../engine/simulation.ts';
import { initialProperty, movingAge } from '../engine/property.ts';
import { stats } from '../engine/types.ts';
import type { Life, ProfileInput } from '../engine/types.ts';
import { cities, genders } from '../data/veyra.ts';
import { validAcademicState } from './academicCodec.ts';
import { validateCareer, validateFinance } from './careerCodec.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const bounded = (value: unknown) => integer(value, 0, 100);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
const bondKeys = ['affection', 'trust', 'respect', 'compatibility', 'resentment', 'familiarity'];
const categories = ['life', 'family', 'school', 'health', 'community', 'decision', 'career', 'finance'];
const effects = (value: unknown) => record(value) && Object.entries(value).every(([key, amount]) =>
  (key === 'bank' || stats.some((stat) => stat === key)) && integer(amount, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER));

function savedPerson(person: unknown, withAppearance: boolean): person is Record<string, unknown> {
  if (!record(person)) return false;
  const bond = person.bond;
  return typeof person.id === 'string' && typeof person.name === 'string' && integer(person.age, 0, maxAge) &&
    typeof person.occupation === 'string' && cities.some((city) => city === person.city) &&
    bounded(person.health) && typeof person.alive === 'boolean' &&
    record(bond) && bondKeys.every((key) => bounded(bond[key])) &&
    (!withAppearance || (genders.some((gender) => gender === person.gender) && validAppearance(person.appearance)));
}

function validHealthAndNotices(life: Life) {
  const patients = new Set([...life.family, ...life.schoolContacts, ...life.career.contacts, ...life.communityFriends]
    .filter((person) => person.alive).map((person) => person.id));
  if (!life.character.causeOfDeath) patients.add(playerPatient);
  return Array.isArray(life.notices) && life.notices.every((notice, index) => record(notice) &&
    integer(notice.entry, 0, life.journal.length - 1) && (index === 0 || notice.entry > life.notices[index - 1]!.entry) &&
    typeof notice.title === 'string' && notice.title.trim().length > 0 && (notice.meter === undefined || (record(notice.meter) &&
      typeof notice.meter.label === 'string' && notice.meter.label.trim().length > 0 && bounded(notice.meter.value) &&
      integer(notice.meter.change, notice.meter.value - 100, notice.meter.value)))) &&
    Array.isArray(life.illnesses) && life.illnesses.every((condition) => {
      if (!record(condition) || typeof condition.patient !== 'string' || !patients.delete(condition.patient) ||
        !integer(condition.started, life.character.birthYear, life.year)) return false;
      const definition = Object.entries(illnesses).find(([id]) => id === condition.illness)?.[1];
      const level = illnessLevels.indexOf(condition.level);
      return !!definition && level >= 0 && level <= illnessLevels.indexOf(definition.max);
    });
}

function validAssetsAndFriends(life: Life) {
  const { property, communityFriends } = life;
  if (!record(property) || typeof property.residence !== 'string' || !Array.isArray(property.owned)) return false;
  const owned = new Set<string>();
  for (const item of property.owned) {
    if (!record(item) || typeof item.id !== 'string' || !assetById.has(item.id) || owned.has(item.id) ||
      !integer(item.year, life.character.birthYear + movingAge, life.year) ||
      (item.source !== 'purchase' && (item.source !== 'gift' || item.id !== starterHome.id))) return false;
    owned.add(item.id);
  }
  if (property.residence !== 'family' && (life.character.age < movingAge || (property.residence !== 'rent' &&
    (!owned.has(property.residence) || assetById.get(property.residence)?.kind !== 'houses')))) return false;

  const contacts = new Set([...life.family, ...life.schoolContacts, ...life.career.contacts].map(({ id }) => id));
  return Array.isArray(communityFriends) && communityFriends.every((person) => {
    if (!savedPerson(person, true) || typeof person.id !== 'string' || !/^library-\d{4}$/.test(person.id) ||
      person.role !== 'Friend' || person.friend !== true || !libraryHobbies.some((hobby) => hobby === person.hobby) ||
      contacts.has(person.id)) return false;
    contacts.add(person.id);
    return true;
  });
}

export function decodeLife(json: string): Life {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('This saved life is damaged.');
  }
  if (!record(value)) throw new Error('This saved life is damaged.');
  const version = value.version;
  if (version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5 && version !== 6) throw new Error('This saved life uses an unsupported version.');
  const { character, family, schoolContacts, journal, pending, scheduled, seen, usedActions, transactions, year } = value;
  if (!record(character) || typeof character.firstName !== 'string' || typeof character.lastName !== 'string' ||
    validateProfile(character as ProfileInput) || (version >= 3 && !validAppearance(character.appearance)) || !integer(character.age, 0, maxAge) ||
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
      savedPerson(person, version >= 3) && (person.role === 'Mother' || person.role === 'Father')) ||
    ((version !== 1 || schoolContacts !== undefined) && (!Array.isArray(schoolContacts) ||
      !schoolContacts.every((person: unknown) => savedPerson(person, version >= 3) && academicLevels.some((level) => level === person.stage) &&
        typeof person.friend === 'boolean' && (isSchoolStage(person.stage) ?
          (person.role === 'Teacher' || person.role === 'Classmate') && (person.role === 'Classmate' || !person.friend) &&
            person.cohortId === undefined :
          version !== 1 && typeof person.cohortId === 'string' && (person.role === 'Professor' || person.role === 'Student') &&
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
      integer(item.amount, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER) &&
      (item.category === undefined || transactionCategories.some((category) => category === item.category)))) {
    throw new Error('This saved life has invalid simulation data.');
  }
  const life = value as Life;
  if (version === 1) {
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
  if (version < 3) {
    life.character.appearance = generateAppearance(life.seed, 'player');
    for (const person of [...life.family, ...life.schoolContacts]) {
      Object.assign(person, contactIdentity(life.seed, person.id, person.name, person.role));
    }
  }
  if (version < 4) {
    life.career = initialCareer();
    life.finance = initialFinance();
  } else if (!validateCareer(value.career, year, Number(character.birthYear), !!life.academic.enrollment,
    !!character.causeOfDeath, (person): person is Record<string, unknown> => savedPerson(person, true)) ||
    !validateFinance(value.finance, year, Number(character.birthYear))) {
    throw new Error('This saved life has invalid career or finance data.');
  }
  if (version < 6) {
    life.version = 6;
    life.property = initialProperty();
    life.communityFriends = [];
  } else if (!validAssetsAndFriends(life)) {
    throw new Error('This saved life has invalid assets or community friends.');
  }
  if (version < 5) {
    life.notices = [];
    life.illnesses = [];
  } else if (!validHealthAndNotices(life)) {
    throw new Error('This saved life has invalid health or event data.');
  }
  return life;
}
