import { institutionById } from '../data/academics.ts';
import { educationLabels } from '../data/veyra.ts';
import { seededRandom } from './random.ts';
import { generateAppearance } from './appearance.ts';
import { npcNamePicker } from './npcNames.ts';
import type { Education, Life, SchoolContact, SchoolStage } from './types.ts';
import type { Enrollment } from './academicTypes.ts';

const entryAges: Record<SchoolStage, number> = { primary: 6, secondary: 12, high: 15 };

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
  const pickName = npcNamePicker(life);
  const yearsEnrolled = Math.max(0, character.age - entryAges[stage]);
  return Array.from({ length: 7 }, (_, index) => {
    const teacher = index === 0;
    const id = `school-${stage}-${index}`;
    const identity = pickName(seededRandom(random.integer(0, 0xffffffff)));
    const role = teacher ? 'Teacher' : 'Classmate';
    return {
      id, role, ...identity, appearance: generateAppearance(life.seed, id),
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

export function createProgramClass(life: Life, enrollment: Enrollment): SchoolContact[] {
  const seed = Array.from(enrollment.id).reduce((state, letter) => Math.imul(state ^ letter.charCodeAt(0), 16777619), life.seed);
  const random = seededRandom(seed);
  const pickName = npcNamePicker(life);
  const city = institutionById.get(enrollment.institutionId)?.city ?? life.character.city;
  return Array.from({ length: 7 }, (_, index) => {
    const professor = index === 0;
    const age = professor ? random.integer(31, 58) : random.integer(enrollment.level === 'postgraduate' ? 22 : 18, 32);
    const id = `class-${enrollment.id}-${index}`;
    const identity = pickName(seededRandom(random.integer(0, 0xffffffff)));
    const role = professor ? 'Professor' : 'Student';
    return {
      id, role, ...identity, appearance: generateAppearance(life.seed, id), cohortId: enrollment.id, stage: enrollment.level,
      occupation: role,
      age, ...(professor ? {} : { graduationAge: age + enrollment.duration }), friend: false,
      city, health: random.integer(70, 98), alive: true,
      bond: {
        affection: random.integer(24, 60), trust: random.integer(20, 50), respect: random.integer(32, 65),
        compatibility: random.integer(24, 76), resentment: random.integer(0, 8), familiarity: random.integer(10, 24),
      },
    };
  });
}

export function isCurrentClassContact(life: Life, person: SchoolContact) {
  const active = life.academic.enrollment;
  return !!active && (person.cohortId ? person.cohortId === active.id : person.stage === active.level);
}

export function currentClass(life: Life) {
  return life.schoolContacts.filter((person) => isCurrentClassContact(life, person));
}

export function isPeer(person: SchoolContact) {
  return person.role === 'Classmate' || person.role === 'Student';
}

export function advanceContactOccupation(person: SchoolContact) {
  if (!isPeer(person)) return;
  const graduationAge = person.graduationAge ?? 18;
  if (person.age >= graduationAge + 2) person.occupation = 'Employed';
  else if (person.age >= graduationAge + 1) person.occupation = 'Job Seeker';
  else if (person.age >= graduationAge) person.occupation = 'Graduate';
}

export function findContact(life: Life, id: string | undefined) {
  return life.family.find((person) => person.id === id) ?? life.schoolContacts.find((person) => person.id === id) ??
    life.career.contacts.find((person) => person.id === id) ?? life.communityFriends.find((person) => person.id === id) ??
    life.social?.people.find((person) => person.id === id);
}
