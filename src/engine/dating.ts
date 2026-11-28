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

export const datingGoals = {
  'not-looking': { label: 'Not looking' }, casual: { label: 'Casual dating' }, 'long-term': { label: 'Long-term relationship' },
  marriage: { label: 'Marriage-oriented' }, companionship: { label: 'Companionship' }, undecided: { label: 'Undecided' },
} as const;
export type DatingGoal = keyof typeof datingGoals;

export const datingProfileFields = {
  gender: { label: 'Preferred Partner', options: { any: { label: 'Any gender' }, woman: { label: 'Women' }, man: { label: 'Men' }, nonbinary: { label: 'Nonbinary people' } } },
  age: { label: 'Preferred Age', options: datingAgeOptions },
  goal: { label: 'Relationship Goal', options: datingGoals },
  distance: { label: 'Distance', options: { local: { label: 'Same city' }, any: { label: 'Any city' }, distant: { label: 'Other cities' } } },
  lifestyle: { label: 'Lifestyle', options: { any: { label: 'Any lifestyle' }, active: { label: 'Active' }, creative: { label: 'Creative' },
    social: { label: 'Social' }, quiet: { label: 'Quiet' } } },
  education: { label: 'Education', options: { any: { label: 'Any education' }, vocational: { label: 'Vocational qualification' },
    degree: { label: 'University degree' } } },
  netWorth: { label: 'Preferred Net Worth', options: datingWorthOptions },
} as const;
export type DatingProfile = { [K in keyof typeof datingProfileFields]: keyof typeof datingProfileFields[K]['options'] };
export const defaultDatingProfile: DatingProfile = { ...defaultDatingPreferences, gender: 'any', goal: 'undecided',
  distance: 'local', lifestyle: 'any', education: 'any' };
export const playerDatingProfile = (life: Life) => life.social.datingProfile ?? defaultDatingProfile;

export function compatibleGoals(player: DatingGoal, other: DatingGoal) {
  if (player === 'not-looking' || other === 'not-looking') return false;
  if (player === 'undecided' || other === 'undecided' || player === other) return true;
  return (player === 'long-term' && (other === 'marriage' || other === 'companionship')) ||
    (other === 'long-term' && (player === 'marriage' || player === 'companionship'));
}

export function datingIntent(life: Life, person: Contact, step: 'date' | 'commit' | 'engage') {
  const goal = npcProfile(life, person).datingGoal;
  if (!goal) return { allowed: true, adjustment: 0 };
  const shared = compatibleGoals(playerDatingProfile(life).goal, goal);
  if (goal === 'not-looking' || (step === 'engage' && (goal === 'casual' || goal === 'companionship'))) {
    return { allowed: false, adjustment: 0 };
  }
  const adjustment = step === 'date' ? (shared ? 4 : -20) :
    goal === 'marriage' ? 12 : goal === 'long-term' ? 7 : goal === 'casual' ? -28 : goal === 'companionship' ? -7 : 0;
  return { allowed: true, adjustment: adjustment - (!shared && step !== 'date' ? 13 : 0) };
}

export function validDatingProfile(value: unknown): value is DatingProfile {
  return !!value && typeof value === 'object' && !Array.isArray(value) &&
    Object.entries(datingProfileFields).every(([key, { options }]) => {
      const pick = (value as Record<string, unknown>)[key];
      return typeof pick === 'string' && Object.hasOwn(options, pick);
    });
}

export function datingProfileIssue(life: Life) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  return life.character.age < 18 ? 'Dating opens at age 18.' : null;
}

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
