import type { AcademicAction, AcademicLevel, AcademicState, GraduationPath } from './academicTypes.ts';
import type { Appearance, AppearanceChoices, HairChoice } from './appearance.ts';
import type { RelationshipActivity } from './interactions.ts';
import type { CareerAction, CareerEffect, CareerState, WorkContact } from './careerTypes.ts';
import type { FinanceState, Transaction } from './financeTypes.ts';
import type { HealthVisit, IllnessCase, IllnessId } from './healthTypes.ts';
import type { libraryHobbies } from '../data/libraryEvents.ts';
import type { PropertyAction, PropertyState } from './property.ts';
import type { SocialAction, SocialPerson, SocialState } from './socialTypes.ts';
import type { SkillAction, SkillState } from './skillTypes.ts';
import type { WorldState } from './worldTypes.ts';
import type { WealthAction, WealthState } from './wealthTypes.ts';

export const stats = ['health', 'happiness', 'smarts', 'looks', 'charisma', 'discipline', 'athleticism', 'creativity', 'stress', 'energy', 'reputation'] as const;
export type Stat = typeof stats[number];
export type Gender = 'woman' | 'man' | 'nonbinary';
export type Background = 'working-class' | 'middle-income' | 'affluent';
export type Talent = 'academic' | 'athletic' | 'creative' | 'social';
export type City = 'Alder Bay' | 'Bellmere' | 'Northwick';
export type Education = 'early' | 'primary' | 'secondary' | 'high' | 'completed';
export type SchoolStage = 'primary' | 'secondary' | 'high';
export type Category = 'life' | 'family' | 'school' | 'health' | 'community' | 'decision' | 'career' | 'finance';

export type ProfileInput = {
  firstName: string;
  lastName: string;
  gender: Gender;
  country: 'Veyra';
  city: City;
  background: Background;
  birthYear: number;
  talent: Talent | null;
  appearance?: AppearanceChoices;
};

export type Character = ProfileInput & {
  birthCity: City;
  appearance: Appearance;
  age: number;
  attributes: Record<Stat, number>;
  bank: number;
  education: Education;
  personality: 'curious' | 'steady' | 'outgoing' | 'thoughtful';
  causeOfDeath: string | null;
};

export type Person<Role = 'Mother' | 'Father'> = {
  id: string;
  name: string;
  lastName?: string;
  gender: Gender;
  appearance: Appearance;
  age: number;
  role: Role;
  occupation: string;
  city: City;
  health: number;
  alive: boolean;
  bond: { affection: number; trust: number; respect: number; compatibility: number; resentment: number; familiarity: number };
};

export type SchoolContact = Person<'Teacher' | 'Classmate' | 'Professor' | 'Student'> & {
  stage: AcademicLevel; friend: boolean; cohortId?: string; graduationAge?: number;
};
export type CommunityFriend = Person<'Friend'> & { friend: true; hobby: typeof libraryHobbies[number] };
export type Contact = Person | SchoolContact | WorkContact | CommunityFriend | SocialPerson;

export type Effect = Partial<Record<Stat | 'bank', number>>;
export type JournalEntry = {
  age: number;
  category: Category;
  text: string;
  changes: Effect;
};
export type ResultMeter = { label: string; value: number; change: number };
export type DeathDetails = { kind: 'death'; person: string; age: number; role: string; cause: string };
export type EnjoymentDetails = { kind: 'enjoyment'; scores: { person: string; value: number }[] };
export type FamilyDetails =
  | { kind: 'wedding-names'; person: string }
  | { kind: 'birth'; person: string }
  | { kind: 'driving-lesson'; person: string; asset: string };
export type FamilyResponse = 'keep' | 'first' | 'second' | 'teach' | 'later';
export type LifeNotice = { entry: number; title: string; meter?: ResultMeter; details?: DeathDetails | EnjoymentDetails | FamilyDetails };
export type DeathResponse = 'honor' | 'skip' | 'surprise';
export type EventChoice = {
  id: string;
  label: string;
  emoji: 'accept' | 'decline' | 'study' | 'support' | 'art' | 'university' | 'vocational' | 'career';
  outcome: string;
  effects: Effect;
  academicPath?: GraduationPath;
  careerEffects?: CareerEffect;
  delayed?: { years: number; text: string; effects: Effect };
};
export type LifeEvent = {
  id: string;
  category: Category;
  ages: readonly [number, number];
  probability: number;
  text: string;
  illness?: IllnessId;
  effects?: Effect;
  careerEffects?: CareerEffect;
  eligible?: (life: Life) => boolean;
  modifier?: (life: Life) => number;
  choices?: readonly EventChoice[];
};

export type Life = {
  version: 11;
  seed: number;
  random: number;
  character: Character;
  year: number;
  family: Person[];
  schoolContacts: SchoolContact[];
  communityFriends: CommunityFriend[];
  social: SocialState;
  property: PropertyState;
  academic: AcademicState;
  career: CareerState;
  finance: FinanceState;
  skills: SkillState;
  world: WorldState;
  wealth: WealthState;
  journal: JournalEntry[];
  notices: LifeNotice[];
  illnesses: IllnessCase[];
  seen: string[];
  pending: string | null;
  scheduled: { year: number; text: string; effects: Effect }[];
  usedActions: string[];
  transactions: Transaction[];
};

export type Action =
  | { type: 'age' }
  | { type: 'relocate'; city: City }
  | { type: 'choose'; event: string; choice: string }
  | { type: 'acknowledge-event'; entry: number }
  | { type: 'respond-death'; entry: number; response: DeathResponse }
  | { type: 'respond-family'; entry: number; response: FamilyResponse }
  | { type: 'family-driving'; person: string; asset: string; mode: 'teach' | 'lend' }
  | { type: 'healthcare'; visit: HealthVisit }
  | { type: 'activity'; activity: 'go-to-library' | 'rest' | 'walk' | 'study' | 'library' | 'socialize' | 'extracurricular' | 'academic-talk' | 'exams' }
  | { type: 'talk'; person: string }
  | { type: 'befriend'; person: string }
  | { type: 'interact'; person: string; activity: RelationshipActivity }
  | { type: 'change-appearance'; choices: AppearanceChoices }
  | { type: 'change-hair'; choices: HairChoice }
  | AcademicAction
  | PropertyAction
  | SocialAction
  | SkillAction
  | WealthAction
  | CareerAction;
