import { stats } from './types.ts';
import type { Category, Effect, Life } from './types.ts';

export const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function record(life: Life, category: Category, text: string, effects: Effect = {}) {
  const changes: Effect = {};
  const character = life.character;
  for (const stat of stats) {
    const previous = character.attributes[stat];
    character.attributes[stat] = clamp(previous + (effects[stat] ?? 0));
    if (character.attributes[stat] !== previous) changes[stat] = character.attributes[stat] - previous;
  }
  const delta = Math.max(-character.bank, effects.bank ?? 0);
  if (delta !== 0) {
    character.bank += delta;
    changes.bank = delta;
    life.transactions.push({ year: life.year, label: text, amount: delta });
  }
  life.journal.push({ age: character.age, category, text, changes });
}
