export const illnessLevels = ['mild', 'moderate', 'severe'] as const;
export type IllnessLevel = typeof illnessLevels[number];
export const illnesses = {
  cold: { name: 'Common cold', onset: 'mild', max: 'mild' },
  'stomach-bug': { name: 'Stomach bug', onset: 'mild', max: 'moderate' },
  migraine: { name: 'Migraine episode', onset: 'moderate', max: 'moderate' },
  flu: { name: 'Flu', onset: 'moderate', max: 'severe' },
  bronchitis: { name: 'Bronchitis', onset: 'moderate', max: 'severe' },
  pneumonia: { name: 'Pneumonia', onset: 'severe', max: 'severe' },
} as const satisfies Record<string, { name: string; onset: IllnessLevel; max: IllnessLevel }>;

export type IllnessId = keyof typeof illnesses;
export type IllnessCase = { patient: string; illness: IllnessId; level: IllnessLevel; started: number };
export const playerPatient = 'self';
