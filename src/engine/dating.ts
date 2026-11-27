import { npcProfile, npcRandom } from './npcs.ts';
import type { Contact, Life } from './types.ts';

export const datingAgeOptions = {
  any: { label: 'Any adult age' },
  '18-24': { label: '18–24', range: [18, 24] },
  '25-34': { label: '25–34', range: [25, 34] },
  '35-44': { label: '35–44', range: [35, 44] },
  '45-54': { label: '45–54', range: [45, 54] },
  '55-64': { label: '55–64', range: [55, 64] },
  '65-74': { label: '65–74', range: [65, 74] },
  '75+': { label: '75+', range: [75, 114] },
} as const;

// Veyra uses cents for all monetary values, including simulated NPC finances.
export const datingWorthOptions = {
  any: { label: 'Any net worth' },
  'under-250': { label: 'Under $250', range: [0, 24999] },
  '250-999': { label: '$250–$999', range: [25000, 99999] },
  '1000-4999': { label: '$1,000–$4,999', range: [100000, 499999] },
  '5000+': { label: '$5,000+', range: [500000, 1500000] },
} as const;

export type DatingPreferences = { age: keyof typeof datingAgeOptions; netWorth: keyof typeof datingWorthOptions };
export type DatingAppSource = 'app' | 'lgbtq';
export const defaultDatingPreferences: DatingPreferences = { age: 'any', netWorth: 'any' };
export const isDatingApp = (source: string): source is DatingAppSource => source === 'app' || source === 'lgbtq';

export function validDatingPreferences(value: unknown): value is DatingPreferences {
  return !!value && typeof value === 'object' && 'age' in value && 'netWorth' in value &&
    typeof value.age === 'string' && Object.hasOwn(datingAgeOptions, value.age) &&
    typeof value.netWorth === 'string' && Object.hasOwn(datingWorthOptions, value.netWorth);
}

export function npcNetWorth(life: Life, person: Contact) {
  const { savings, commitments } = npcProfile(life, person);
  return savings - commitments;
}

export function npcLooks(life: Life, person: Contact) {
  return npcRandom(life, `looks:${person.id}`).integer(25, 95);
}
