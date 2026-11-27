import type { Background, City, Education, Gender, Talent } from '../engine/types.ts';

export const country = 'Veyra';
export const cities = ['Alder Bay', 'Bellmere', 'Northwick'] as const satisfies readonly City[];
export const cityDescriptions: Record<City, string> = {
  'Alder Bay': 'A coastal city built around a sheltered harbor and long public promenades.',
  Bellmere: 'A riverside city with neighborhood libraries, orchards, and a busy central market.',
  Northwick: 'A northern city where wooded hills meet old railway neighborhoods.',
};
export const backgrounds = ['working-class', 'middle-income', 'affluent'] as const satisfies readonly Background[];
export const backgroundLabels: Record<Background, string> = {
  'working-class': 'Working class', 'middle-income': 'Middle income', affluent: 'Affluent',
};
export const genders = ['woman', 'man', 'nonbinary'] as const satisfies readonly Gender[];
export const genderLabels: Record<Gender, string> = { woman: 'Female', man: 'Male', nonbinary: 'Nonbinary' };
export const talents = ['academic', 'athletic', 'creative', 'social'] as const satisfies readonly Talent[];
export const talentLabels: Record<Talent, string> = {
  academic: 'Academic', athletic: 'Athletic', creative: 'Creative', social: 'Social',
};
export const givenNames: Record<Gender, readonly [string, ...string[]]> = {
  woman: ['Mara', 'Elin', 'Sela', 'Tessa', 'Nell', 'Iona', 'Rhea', 'Lina'],
  man: ['Ilan', 'Micah', 'Rowan', 'Leon', 'Emil', 'Jasper', 'Soren', 'Niko'],
  nonbinary: ['Arden', 'Rin', 'Ari', 'Vale', 'Ren', 'Ellis', 'River', 'Sage'],
};
export const surnames = ['Vale', 'Hollis', 'Lennox', 'Wren', 'Thorne', 'Aster', 'Marlow', 'Forrest'] as const;
export const educationLabels: Record<Education, string> = {
  early: 'Early childhood', primary: 'Primary school', secondary: 'Secondary school',
  high: 'High school', completed: 'High school graduate',
};
export const firstBirthYear = 1950;
export const lastBirthYear = 2100;
export const defaultBirthYear = 2026;
