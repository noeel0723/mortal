import type { Emoji } from '../theme/tokens.ts';
import type { Stat, Talent } from '../engine/types.ts';

export const skillCategories = {
  sports: 'Sports', music: 'Music & Instruments', creative: 'Arts & Creativity',
  knowledge: 'Knowledge & Learning', practical: 'Practical Skills',
} as const;
type SkillCategory = keyof typeof skillCategories;

type SkillDefinition = {
  name: string;
  category: SkillCategory;
  age: number;
  attributes: readonly Stat[];
  talents: readonly Talent[];
  difficulty: number;
  icon: Emoji;
};

function skill(name: string, category: SkillCategory, age: number, attributes: readonly Stat[], talents: readonly Talent[],
  difficulty: number, icon: Emoji): SkillDefinition {
  return { name, category, age, attributes, talents, difficulty, icon };
}

export const skills = {
  football: skill('Football', 'sports', 6, ['athleticism', 'discipline'], ['athletic'], 1, 'football'),
  basketball: skill('Basketball', 'sports', 7, ['athleticism', 'discipline'], ['athletic'], 1.05, 'basketball'),
  tennis: skill('Tennis', 'sports', 7, ['athleticism', 'discipline'], ['athletic'], 1.12, 'tennis'),
  swimming: skill('Swimming', 'sports', 5, ['athleticism', 'health'], ['athletic'], 1.04, 'swimming'),
  running: skill('Running', 'sports', 6, ['athleticism', 'health'], ['athletic'], .94, 'running'),
  'martial-arts': skill('Martial Arts', 'sports', 8, ['athleticism', 'discipline'], ['athletic'], 1.15, 'martialArts'),
  guitar: skill('Guitar', 'music', 7, ['creativity', 'discipline'], ['creative'], 1.07, 'guitar'),
  piano: skill('Piano', 'music', 6, ['creativity', 'discipline'], ['creative'], 1.15, 'piano'),
  violin: skill('Violin', 'music', 7, ['creativity', 'discipline'], ['creative'], 1.22, 'violin'),
  drums: skill('Drums', 'music', 7, ['creativity', 'athleticism'], ['creative'], 1.06, 'drums'),
  singing: skill('Singing', 'music', 5, ['creativity', 'charisma'], ['creative', 'social'], 1, 'singing'),
  writing: skill('Writing', 'creative', 6, ['creativity', 'smarts'], ['creative', 'academic'], 1, 'custom'),
  drawing: skill('Drawing', 'creative', 4, ['creativity', 'discipline'], ['creative'], .96, 'drawing'),
  painting: skill('Painting', 'creative', 6, ['creativity', 'discipline'], ['creative'], 1.05, 'art'),
  photography: skill('Photography', 'creative', 8, ['creativity', 'smarts'], ['creative'], 1.1, 'photography'),
  acting: skill('Acting', 'creative', 7, ['creativity', 'charisma'], ['creative', 'social'], 1.1, 'acting'),
  programming: skill('Programming', 'knowledge', 9, ['smarts', 'discipline'], ['academic'], 1.18, 'laptop'),
  mathematics: skill('Mathematics', 'knowledge', 6, ['smarts', 'discipline'], ['academic'], 1.13, 'math'),
  communication: skill('Communication', 'knowledge', 6, ['charisma', 'smarts'], ['social'], .97, 'talk'),
  leadership: skill('Leadership', 'knowledge', 12, ['discipline', 'charisma'], ['social'], 1.18, 'leadership'),
  'business-management': skill('Business Management', 'knowledge', 15, ['smarts', 'charisma'], ['academic', 'social'], 1.18, 'career'),
  chess: skill('Chess', 'knowledge', 6, ['smarts', 'discipline'], ['academic'], 1.14, 'chess'),
  'foreign-languages': skill('Foreign Languages', 'knowledge', 6, ['smarts', 'charisma'], ['academic', 'social'], 1.16, 'languages'),
  cooking: skill('Cooking', 'practical', 8, ['creativity', 'discipline'], ['creative'], 1, 'cooking'),
  fitness: skill('Fitness', 'practical', 12, ['athleticism', 'health'], ['athletic'], 1, 'fitness'),
  'public-speaking': skill('Public Speaking', 'practical', 8, ['charisma', 'discipline'], ['social'], 1.08, 'singing'),
} satisfies Record<string, SkillDefinition>;

export type SkillId = keyof typeof skills;
export const skillIds = Object.keys(skills) as SkillId[];
export const isSkillId = (id: unknown): id is SkillId => typeof id === 'string' && Object.hasOwn(skills, id);
export const physicalSkill = (id: SkillId) => skills[id].category === 'sports' || id === 'fitness';

export const trainingMethods = {
  practice: { name: 'Self Practice', icon: 'library', age: 0, fee: 0, quality: 1, experience: 10 },
  class: { name: 'Join a Class', icon: 'classroom', age: 6, fee: 325, quality: 1.23, experience: 14 },
  course: { name: 'Take a Course', icon: 'study', age: 10, fee: 850, quality: 1.43, experience: 18 },
  coaching: { name: 'Private Coaching', icon: 'work', age: 12, fee: 1750, quality: 1.65, experience: 21 },
} as const;
export type TrainingMethod = keyof typeof trainingMethods;
