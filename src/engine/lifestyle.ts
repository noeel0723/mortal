import { money } from '../i18n/en.ts';
import type { Emoji } from '../theme/tokens.ts';
import { recordNotice, resultMeter } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { openingIssue, skillRandom } from './skills.ts';
import { lifestyleIds, skillLimits } from './skillTypes.ts';
import type { LifestyleId } from './skillTypes.ts';
import type { Effect, Life, Stat } from './types.ts';

type LifestyleDefinition = { label: string; section: string; icon: Emoji; age: number; cost: number; effects: Effect;
  meter: Stat; stories: readonly [string, string, ...string[]] };

export const lifestyle: Record<LifestyleId, LifestyleDefinition> = {
  exercise: { label: 'Exercise', section: 'Mind & Body', icon: 'fitness', age: 8, cost: 0, effects: { health: 3, athleticism: 2, stress: -3, energy: -6 },
    meter: 'health', stories: ['I followed a short circuit and stopped for water between sets.', 'I took an easy jog and stretched when I got home.'] },
  'balanced-meal': { label: 'Eat a Balanced Meal', section: 'Mind & Body', icon: 'food', age: 6, cost: 0, effects: { health: 3, energy: 4 },
    meter: 'health', stories: ['I put together a meal with vegetables, rice, and a source of protein.', 'I sat down to eat instead of rushing through a snack.'] },
  meditate: { label: 'Meditate', section: 'Mind & Body', icon: 'meditation', age: 8, cost: 0, effects: { stress: -6, happiness: 2 },
    meter: 'stress', stories: ['I spent ten quiet minutes paying attention to my breathing.', 'I took a break from my phone and sat quietly before bed.'] },
  movie: { label: 'Go to the Cinema', section: 'Entertainment', icon: 'cinema', age: 8, cost: 625, effects: { happiness: 5, stress: -3, energy: -2 },
    meter: 'happiness', stories: ['I bought a ticket for a matinee and came out humming the theme.', 'I watched a comedy at the local cinema and laughed louder than I expected.'] },
  park: { label: 'Relax in the Park', section: 'Entertainment', icon: 'park', age: 5, cost: 0, effects: { happiness: 3, stress: -3 },
    meter: 'happiness', stories: ['I found a shady bench and watched people play in the park.', 'I packed a snack and spent an afternoon under the trees.'] },
  'day-trip': { label: 'Take a Day Trip', section: 'Travel', icon: 'train', age: 16, cost: 1600, effects: { happiness: 6, stress: -4, energy: -7 },
    meter: 'happiness', stories: ['I took the train out of town and spent the afternoon exploring a market.', 'I spent the day near the coast and made it home on the last train.'] },
};

export function lifestyleIssue(life: Life, id: LifestyleId) {
  const blocked = openingIssue(life);
  if (blocked) return blocked;
  if (!lifestyleIds.includes(id)) return 'Choose a valid activity.';
  const item = lifestyle[id];
  if (life.character.age < item.age) return `Available from age ${item.age}.`;
  if (id === 'exercise' && life.character.attributes.health < 30) return 'You need better health for exercise.';
  if ((life.skills.annual.lifestyle[id] ?? 0) >= skillLimits.lifestyleBenefits) return null;
  if (life.character.bank < item.cost) return `You need ${money(item.cost)} for this activity.`;
  if (life.character.attributes.energy < -(item.effects.energy ?? 0)) return 'You need more energy.';
  return null;
}

export function doLifestyle(life: Life, id: LifestyleId) {
  const issue = lifestyleIssue(life, id);
  if (issue) return issue;
  const count = life.skills.annual.lifestyle[id] ?? 0;
  if (count >= skillLimits.lifestyleBenefits) return null;
  const item = lifestyle[id];
  const effects: Effect = {};
  for (const [stat, value] of Object.entries(item.effects) as [Stat, number][]) {
    const benefit = stat === 'stress' ? value < 0 : value > 0;
    effects[stat] = benefit ? Math.trunc(value / (count + 1)) : value;
  }
  const before = life.character.attributes[item.meter];
  const startingStory = skillRandom(life.seed, `lifestyle:${id}:${life.year}`).integer(0, item.stories.length - 1);
  const story = item.stories[(startingStory + count) % item.stories.length]!;
  life.skills.annual.lifestyle[id] = count + 1;
  const job = life.career.current;
  if (job && (id === 'meditate' || id === 'park') && count < 2) job.stress = clamp(job.stress - (2 - count));
  if (item.cost) effects.bank = -item.cost;
  const title = item.label;
  recordNotice(life, 'life', title, story, effects, 'leisure').meter =
    resultMeter(item.meter.charAt(0).toUpperCase() + item.meter.slice(1), before, life.character.attributes[item.meter]);
  return null;
}
