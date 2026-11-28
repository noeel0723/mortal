import { backgrounds, cities, country, defaultBirthYear, firstBirthYear, genders, givenNames, lastBirthYear, surnames, talents } from '../data/veyra.ts';
import { seededRandom } from './random.ts';
import { academicStateAtBirth } from './academics.ts';
import { initialCareer } from './career.ts';
import { initialFinance } from './finance.ts';
import { initialProperty } from './property.ts';
import { newSocial, syncNpcs } from './npcs.ts';
import { olderSiblingAtBirth } from './familyNetwork.ts';
import { newSkills } from './skills.ts';
import { newWorld } from './world.ts';
import { initialWealth } from './wealth.ts';
import { contactIdentity, creationAppearance, generateAppearance, mergeAppearance, validFace } from './appearance.ts';
import type { Life, Person, ProfileInput, Stat } from './types.ts';

const occupations = {
  'working-class': ['Baker', 'Transit operator', 'Warehouse clerk'],
  'middle-income': ['Bookkeeper', 'School administrator', 'Survey technician'],
  affluent: ['Architect', 'Research director', 'Clinic manager'],
} as const;
const birthSavings = { 'working-class': 0, 'middle-income': 5000, affluent: 25000 };
const aptitude: Record<NonNullable<ProfileInput['talent']>, Stat> = {
  academic: 'smarts', athletic: 'athleticism', creative: 'creativity', social: 'charisma',
};

export function validateProfile(profile: ProfileInput) {
  for (const name of [profile.firstName.trim(), profile.lastName.trim()]) {
    if (name.length === 0 || name.length > 28 || !/^\p{L}[\p{L}\p{M} '’.-]*$/u.test(name)) {
      return 'Enter a first and last name with 1–28 letters each.';
    }
  }
  if (!Number.isInteger(profile.birthYear) || profile.birthYear < firstBirthYear || profile.birthYear > lastBirthYear) {
    return `Choose a birth year between ${firstBirthYear} and ${lastBirthYear}.`;
  }
  if (profile.country !== country || !cities.includes(profile.city)) return 'Choose a city in Veyra.';
  if (!genders.includes(profile.gender) || !backgrounds.includes(profile.background) || (profile.talent !== null && !talents.includes(profile.talent))) {
    return 'Choose valid options for your new life.';
  }
  if (profile.appearance !== undefined && !validFace(profile.appearance)) return 'Choose valid facial features and hair.';
  return null;
}

export function createLife(seed: number, profile?: ProfileInput): Life {
  const random = seededRandom(seed);
  const gender = random.pick(genders);
  const input: ProfileInput = profile ?? {
    firstName: random.pick(givenNames[gender]),
    lastName: random.pick(surnames),
    gender,
    country,
    city: random.pick(cities),
    background: random.pick(backgrounds),
    birthYear: defaultBirthYear,
    talent: random.next() < .45 ? random.pick(talents) : null,
  };
  const error = validateProfile(input);
  if (error) throw new Error(error);
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const parents = [
    { id: 'parent-1', gender: 'woman', role: 'Mother' },
    { id: 'parent-2', gender: 'man', role: 'Father' },
  ] as const;
  const family: Person[] = parents.map((parent) => {
    const name = `${random.pick(givenNames[parent.gender])} ${lastName}`;
    return {
      id: parent.id, name, ...contactIdentity(seed, parent.id, name, parent.role),
      age: random.integer(22, 40),
      role: parent.role,
      occupation: random.pick(occupations[input.background]),
      city: input.city,
      health: random.integer(75, 98),
      alive: true,
      bond: {
        affection: random.integer(65, 90), trust: random.integer(65, 90),
        respect: random.integer(45, 65), compatibility: random.integer(35, 80),
        resentment: random.integer(0, 8), familiarity: 50,
      },
    };
  });
  const attributes = {
    health: random.integer(74, 96), happiness: random.integer(56, 82),
    smarts: random.integer(33, 65), looks: random.integer(34, 78),
    charisma: random.integer(32, 66), discipline: random.integer(34, 67),
    athleticism: random.integer(31, 64), creativity: random.integer(32, 66),
    stress: random.integer(5, 15), energy: 100, reputation: 0,
  };
  if (input.talent) attributes[aptitude[input.talent]] += 12;
  if (input.background === 'affluent') attributes.smarts += 4;
  if (input.background === 'working-class') attributes.discipline += 4;
  const bank = birthSavings[input.background];
  const personality = random.pick(['curious', 'steady', 'outgoing', 'thoughtful'] as const);
  const appearance = input.appearance ? mergeAppearance(creationAppearance, input.appearance) : generateAppearance(seed, 'player');
  const life: Life = {
    version: 11,
    seed: seed >>> 0,
    random: random.state,
    character: { ...input, birthCity: input.city, appearance, firstName, lastName, age: 0, attributes, bank, personality, education: 'early', causeOfDeath: null },
    year: input.birthYear,
    family,
    schoolContacts: [],
    communityFriends: [],
    social: newSocial({ family }),
    property: initialProperty(),
    academic: academicStateAtBirth(),
    career: initialCareer(),
    finance: initialFinance(),
    skills: newSkills(),
    world: newWorld(seed, input.birthYear),
    wealth: initialWealth(),
    journal: [{ age: 0, category: 'life', text: `I was born in ${input.city}, Veyra.`, changes: {} }],
    seen: [],
    pending: null,
    notices: [],
    illnesses: [],
    scheduled: [],
    usedActions: [],
    transactions: bank ? [{ year: input.birthYear, label: 'Birth savings', amount: bank }] : [],
  };
  syncNpcs(life);
  olderSiblingAtBirth(life);
  return life;
}
