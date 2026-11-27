import { record } from './journal.ts';
import type { TransactionCategory } from './financeTypes.ts';
import type { Category, Effect, Life } from './types.ts';

export function eventTitle(id: string) {
  const words = id.replace(/^job-/, '').split('-');
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function recordNotice(life: Life, category: Category, title: string, text: string, effects?: Effect, moneyCategory?: TransactionCategory) {
  record(life, category, text, effects, moneyCategory);
  life.notices.push({ entry: life.journal.length - 1, title });
}
