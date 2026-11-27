import type { SkillId, TrainingMethod } from '../data/skills.ts';

export const skillLimits = { yearlySessions: 16, yearlyPerSkill: 5, yearlyGain: 18, hobbies: 4, childInterests: 3, recentShowcases: 6, lifestyleBenefits: 3 } as const;
export const lifestyleIds = ['exercise', 'balanced-meal', 'meditate', 'movie', 'park', 'day-trip'] as const;
export type LifestyleId = typeof lifestyleIds[number];
export const showcaseOutcomes = ['Participated', 'Finalist', 'Winner', 'Completed', 'Recognized'] as const;
export type Showcase = { year: number; score: number; outcome: typeof showcaseOutcomes[number] };

export type SkillProgress = {
  proficiency: number;
  aptitude: number;
  experience: number;
  practiceProgress: number;
  firstYear: number | null;
  lastYear: number | null;
  sessions: number;
  best: number;
  lastChange: number;
  discovered: number | null;
  lastShowcase: number | null;
  showcases: Showcase[];
  awards: number;
};

export type ChildInterest = { skill: SkillId; proficiency: number; lastSupported: number | null };
export type SkillState = {
  entries: Partial<Record<SkillId, SkillProgress>>;
  hobbies: SkillId[];
  children: Record<string, ChildInterest[]>;
  annual: {
    sessions: Partial<Record<SkillId, number>>;
    gains: Partial<Record<SkillId, number>>;
    lifestyle: Partial<Record<LifestyleId, number>>;
    showcased: boolean;
  };
};

export type SkillAction =
  | { type: 'train-skill'; skill: SkillId; method: TrainingMethod }
  | { type: 'set-hobby'; skill: SkillId; enabled: boolean }
  | { type: 'skill-showcase'; skill: SkillId }
  | { type: 'lifestyle'; activity: LifestyleId }
  | { type: 'share-hobby'; person: string; skill: SkillId };
