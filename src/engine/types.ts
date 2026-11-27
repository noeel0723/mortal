export const stats = ['health', 'happiness', 'smarts', 'looks', 'charisma', 'discipline', 'athleticism', 'creativity', 'stress', 'energy', 'reputation'] as const;
export type Stat = typeof stats[number];
export type Gender = 'woman' | 'man' | 'nonbinary';
export type Background = 'working-class' | 'middle-income' | 'affluent';
export type Talent = 'academic' | 'athletic' | 'creative' | 'social';
export type City = 'Alder Bay' | 'Bellmere' | 'Northwick';
export type Education = 'early' | 'primary' | 'secondary' | 'high' | 'completed';
export type Category = 'life' | 'family' | 'school' | 'health' | 'community' | 'decision';

export type ProfileInput = {
  firstName: string;
  lastName: string;
  gender: Gender;
  country: 'Veyra';
  city: City;
  background: Background;
  birthYear: number;
  talent: Talent | null;
};

export type Character = ProfileInput & {
  age: number;
  attributes: Record<Stat, number>;
  bank: number;
  education: Education;
  personality: 'curious' | 'steady' | 'outgoing' | 'thoughtful';
  causeOfDeath: string | null;
};

export type Person = {
  id: string;
  name: string;
  age: number;
  role: 'Mother' | 'Father';
  occupation: string;
  city: City;
  health: number;
  alive: boolean;
  bond: { affection: number; trust: number; respect: number; compatibility: number; resentment: number; familiarity: number };
};

export type Effect = Partial<Record<Stat | 'bank', number>>;
export type JournalEntry = {
  age: number;
  category: Category;
  text: string;
  changes: Effect;
};
export type EventChoice = {
  id: string;
  label: string;
  emoji: 'accept' | 'decline' | 'study' | 'support' | 'art';
  outcome: string;
  effects: Effect;
  delayed?: { years: number; text: string; effects: Effect };
};
export type LifeEvent = {
  id: string;
  category: Category;
  ages: readonly [number, number];
  probability: number;
  text: string;
  effects?: Effect;
  eligible?: (life: Life) => boolean;
  modifier?: (life: Life) => number;
  choices?: readonly EventChoice[];
};

export type Life = {
  version: 1;
  seed: number;
  random: number;
  character: Character;
  year: number;
  family: Person[];
  journal: JournalEntry[];
  seen: string[];
  pending: string | null;
  scheduled: { year: number; text: string; effects: Effect }[];
  usedActions: string[];
  transactions: { year: number; label: string; amount: number }[];
};

export type Action =
  | { type: 'age' }
  | { type: 'choose'; event: string; choice: string }
  | { type: 'activity'; activity: 'read' | 'rest' | 'walk' | 'study' }
  | { type: 'talk'; person: string };
