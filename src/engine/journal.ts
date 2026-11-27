import { stats } from './types.ts';
import type { Category, Effect, Life } from './types.ts';
import type { TransactionCategory, TransactionDetail } from './financeTypes.ts';

export const clamp = (value: number) => Math.max(0, Math.min(100, value));

export function postTransaction(life: Life, label: string, amount: number, category: TransactionCategory, detail?: TransactionDetail) {
  const delta = Math.min(Number.MAX_SAFE_INTEGER - life.character.bank, Math.max(-life.character.bank, amount));
  if (delta !== 0 || (amount === 0 && detail)) {
    life.character.bank += delta;
    life.transactions.push({ year: life.year, label, amount: delta, category, ...(detail ? { detail } : {}) });
  }
  return delta;
}

export function record(life: Life, category: Category, text: string, effects: Effect = {}, moneyCategory: TransactionCategory = 'other') {
  const changes: Effect = {};
  const character = life.character;
  for (const stat of stats) {
    const previous = character.attributes[stat];
    character.attributes[stat] = clamp(previous + (effects[stat] ?? 0));
    if (character.attributes[stat] !== previous) changes[stat] = character.attributes[stat] - previous;
  }
  const delta = postTransaction(life, text, effects.bank ?? 0, moneyCategory);
  if (delta !== 0) changes.bank = delta;
  life.journal.push({ age: character.age, category, text, changes });
}
