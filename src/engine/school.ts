import { educationLabels, genders, givenNames, surnames } from '../data/veyra.ts';
import { seededRandom } from './random.ts';
import type { Education, Life, SchoolContact, SchoolStage } from './types.ts';

const entryAges: Record<SchoolStage, number> = { primary: 6, secondary: 12, high: 15 };
const allNames = genders.flatMap((gender) =>
  givenNames[gender].flatMap((firstName) => surnames.map((lastName) => `${firstName} ${lastName}`)),
);

export function isSchoolStage(value: unknown): value is SchoolStage {
  return value === 'primary' || value === 'secondary' || value === 'high';
}

export function educationAt(age: number): Education {
  if (age < entryAges.primary) return 'early';
  if (age < entryAges.secondary) return 'primary';
  if (age < entryAges.high) return 'secondary';
  return age < 18 ? 'high' : 'completed';
}

export function createSchoolClass(life: Life, stage: SchoolStage): SchoolContact[] {
  const { character } = life;
  const random = seededRandom(life.seed ^ Math.imul(entryAges[stage], 0x9e3779b9));
  const knownNames = new Set([
    `${character.firstName} ${character.lastName}`,
    ...life.family.map((person) => person.name),
    ...life.schoolContacts.map((person) => person.name),
  ]);
  const names = allNames.filter((name) => !knownNames.has(name));
  const yearsEnrolled = Math.max(0, character.age - entryAges[stage]);
  return Array.from({ length: 7 }, (_, index) => {
    const teacher = index === 0;
    return {
      id: `school-${stage}-${index}`,
      name: names.splice(random.integer(0, names.length - 1), 1)[0]!,
      role: teacher ? 'Teacher' : 'Classmate',
      age: teacher ? random.integer(27, 48) + yearsEnrolled : character.age,
      occupation: teacher ? `${educationLabels[stage]} teacher` : 'Student',
      city: character.city,
      health: random.integer(70, 98),
      alive: true,
      stage,
      friend: false,
      bond: {
        affection: random.integer(24, 60), trust: random.integer(20, 50),
        respect: random.integer(32, 65), compatibility: random.integer(24, 76),
        resentment: random.integer(0, 8), familiarity: random.integer(10, 24),
      },
    };
  });
}

export function currentClass(life: Life) {
  return life.schoolContacts.filter((person) => person.stage === life.character.education);
}

export function findContact(life: Life, id: string | undefined) {
  return life.family.find((person) => person.id === id) ?? life.schoolContacts.find((person) => person.id === id);
}
