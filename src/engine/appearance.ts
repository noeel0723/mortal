import { npcGivenNames } from '../data/npcNames.ts';
import { genders } from '../data/veyra.ts';
import { seededRandom } from './random.ts';
import type { Gender, Life } from './types.ts';

export const appearanceOptions = {
  hair: { label: 'Hairstyle', values: ['Crop', 'Sweep', 'Tousled', 'Bob', 'Long', 'Tied'] },
  hairColor: { label: 'Hair color', values: ['Ink', 'Chestnut', 'Copper', 'Honey', 'Ash', 'Plum'] },
  eyes: { label: 'Eye shape', values: ['Almond', 'Round', 'Sharp', 'Soft'] },
  eyeColor: { label: 'Eye color', values: ['Brown', 'Blue', 'Green', 'Gray', 'Amber', 'Violet'] },
  nose: { label: 'Nose', values: ['Button', 'Straight', 'Wide', 'Upturned'] },
  mouth: { label: 'Mouth', values: ['Natural', 'Smile', 'Full', 'Small'] },
} as const;

export type AppearanceChoices = { [K in keyof typeof appearanceOptions]: typeof appearanceOptions[K]['values'][number] };
export type HairChoice = Pick<AppearanceChoices, 'hair' | 'hairColor'>;
export type Appearance = AppearanceChoices & { skin: number; background: number; outfit: number };
export const hairFields = ['hair', 'hairColor'] as const;
export const faceFields = ['eyes', 'eyeColor', 'nose', 'mouth'] as const;

function options(seed: number, identity: string) {
  let hash = (seed ^ 0x5bd1e995) >>> 0;
  for (const letter of identity) hash = Math.imul(hash ^ letter.codePointAt(0)!, 16777619);
  return seededRandom(hash);
}

export function generateAppearance(seed: number, identity: string): Appearance {
  const random = options(seed, identity);
  return {
    hair: random.pick(appearanceOptions.hair.values), hairColor: random.pick(appearanceOptions.hairColor.values),
    eyes: random.pick(appearanceOptions.eyes.values), eyeColor: random.pick(appearanceOptions.eyeColor.values),
    nose: random.pick(appearanceOptions.nose.values), mouth: random.pick(appearanceOptions.mouth.values),
    skin: random.integer(0, 5), background: random.integer(0, 5), outfit: random.integer(0, 4),
  };
}

export const creationAppearance: Appearance = {
  hair: 'Tousled', hairColor: 'Ink', eyes: 'Almond', eyeColor: 'Blue', nose: 'Button', mouth: 'Natural',
  skin: 1, background: 0, outfit: 0,
};

export function contactIdentity(seed: number, id: string, name: string, role: string) {
  const given = name.split(' ')[0];
  const gender: Gender = role === 'Mother' ? 'woman' : role === 'Father' ? 'man' :
    genders.find((candidate) => npcGivenNames[candidate].includes(given ?? '')) ?? options(seed, id).pick(genders);
  return { gender, appearance: generateAppearance(seed, id) };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validFields(value: unknown, keys: readonly (keyof AppearanceChoices)[]) {
  return object(value) && keys.every((key) => appearanceOptions[key].values.some((option) => option === value[key]));
}

export function validHair(value: unknown): value is HairChoice {
  return validFields(value, hairFields);
}

export function validFace(value: unknown): value is AppearanceChoices {
  return validFields(value, [...hairFields, ...faceFields]);
}

export function validAppearance(value: unknown): value is Appearance {
  const paletteIndex = (index: unknown, max: number) => typeof index === 'number' && Number.isInteger(index) && index >= 0 && index <= max;
  return object(value) && paletteIndex(value.skin, 5) && paletteIndex(value.background, 5) &&
    paletteIndex(value.outfit, 4) && validFace(value);
}

export function canEditFace(age: number) {
  return age === 0;
}

export function appearanceIssue(life: Life, hairOnly: boolean) {
  if (life.character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (!hairOnly && !canEditFace(life.character.age)) return 'Facial features can only be edited before the first Age Up.';
  return null;
}

export function mergeAppearance(current: Appearance, update: AppearanceChoices | HairChoice) {
  const { hair, hairColor } = update;
  if ('eyes' in update) {
    const { eyes, eyeColor, nose, mouth } = update;
    return { ...current, hair, hairColor, eyes, eyeColor, nose, mouth };
  }
  return { ...current, hair, hairColor };
}

export function appearanceChanged(current: Appearance, next: Appearance, hairOnly: boolean) {
  const keys = hairOnly ? hairFields : [...hairFields, ...faceFields];
  return keys.some((key) => current[key] !== next[key]);
}
