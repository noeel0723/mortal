import { record } from './journal.ts';
import type { TransactionCategory } from './financeTypes.ts';
import type { Category, Effect, Life, LifeNotice, ResultMeter } from './types.ts';

export function eventTitle(id: string) {
  const words = id.replace(/^job-/, '').split('-');
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function recordNotice(life: Life, category: Category, title: string, text: string, effects?: Effect, moneyCategory?: TransactionCategory) {
  record(life, category, text, effects, moneyCategory);
  return enqueueNotice(life, title);
}

export function enqueueNotice(life: Life, title: string, meter?: ResultMeter) {
  const notice: LifeNotice = { entry: life.journal.length - 1, title, ...(meter ? { meter } : {}) };
  life.notices.push(notice);
  return notice;
}

export function resultMeter(label: string, previous: number, value: number): ResultMeter {
  return { label, value, change: value - previous };
}
