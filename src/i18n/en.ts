import type { Stat } from '../engine/types.ts';

export const en = {
  title: 'Mortal',
  tagline: 'One Life. Infinite Possibilities.',
  continueLife: 'Continue Life',
  newLife: 'New Life',
  savedLives: 'Saved Lives',
  achievements: 'Achievements',
  settings: 'Settings',
  lifeJournal: 'Life Journal',
  ageUp: 'Age Up',
  birth: 'Birth',
  age: (age: number) => `Age ${age}`,
  worldNotice: 'Fictional world',
} as const;

export const statLabels: Record<Stat, string> = {
  health: 'Health', happiness: 'Happiness', smarts: 'Smarts', looks: 'Looks',
  charisma: 'Charisma', discipline: 'Discipline', athleticism: 'Athleticism',
  creativity: 'Creativity', stress: 'Stress', energy: 'Energy', reputation: 'Reputation',
};

export const money = (amount: number) => new Intl.NumberFormat('en', {
  style: 'currency', currency: 'USD', currencyDisplay: 'narrowSymbol',
}).format(amount / 100);
