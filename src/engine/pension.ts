import { postTransaction } from './journal.ts';
import { indexedCents } from './pricing.ts';
import { national } from './world.ts';
import type { Life } from './types.ts';

export const pensionAge = 65;
export const pensionMinimumYears = 5;

export function pensionEntitlement(life: Life) {
  const credits = life.wealth.pension.credits;
  if (credits.length < pensionMinimumYears) return 0;
  const last = credits.slice(-15);
  const average = last.reduce((sum, credit) => sum + credit.salary, 0) / last.length;
  const rate = Math.min(4500, credits.length * 155);
  const cap = indexedCents(46000, Math.min(16800, national(life.world).priceIndex));
  return Math.min(cap, indexedCents(average, rate));
}

export function settlePension(life: Life, gross: number, elapsedAge: number) {
  const pension = life.wealth.pension;
  pension.lastBenefit = 0;
  if (gross > 0) {
    const employer = indexedCents(gross, 110);
    const employee = -postTransaction(life, 'Employee pension contribution', -indexedCents(gross, 200), 'pension-contribution', { kind: 'pension', employer });
    pension.credits.push({ year: life.year, salary: gross, employee, employer });
  } else if (elapsedAge >= pensionAge && life.career.retiredYear !== null && life.career.retiredYear < life.year) {
    const payment = pensionEntitlement(life);
    pension.lastBenefit = postTransaction(life, 'Annual retirement pension', payment, 'pension-income');
    pension.benefitsPaid += pension.lastBenefit;
  }
}
