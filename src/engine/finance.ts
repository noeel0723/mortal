import { employerById } from '../data/employers.ts';
import { cityEconomies } from '../data/cityEconomies.ts';
import { jobById } from '../data/jobs.ts';
import { postTransaction, record } from './journal.ts';
import { annualChildcare } from './familyLife.ts';
import { localExpense } from './pricing.ts';
import { livingCategories } from './financeTypes.ts';
import type { FinanceState, LivingCategory, Transaction, TransactionCategory } from './financeTypes.ts';
import type { Life } from './types.ts';

export const financeLabels: Record<TransactionCategory, string> = {
  salary: 'Salary', tax: 'Income Tax', housing: 'Housing', 'food-utilities': 'Food & Utilities',
  transport: 'Transportation', personal: 'Personal Expenses', tuition: 'Tuition', scholarship: 'Scholarships', medical: 'Doctor Visits', shopping: 'Asset Purchases',
  relationships: 'Relationships', training: 'Skill Training', leisure: 'Leisure', other: 'Other',
};

export function initialFinance(): FinanceState {
  return { lastSettledYear: null, arrears: { housing: 0, 'food-utilities': 0, transport: 0, personal: 0 } };
}

export function incomeTax(gross: number) {
  return Math.round(Math.max(0, gross - 24000) * .08 + Math.max(0, gross - 70000) * .08 + Math.max(0, gross - 130000) * .05);
}

export function outstanding(life: Life) {
  return livingCategories.reduce((sum, key) => sum + life.finance.arrears[key], 0);
}

export function transactionCategory(item: Transaction): TransactionCategory {
  if (item.category) return item.category;
  if (item.amount < 0 && / tuition for year /.test(item.label)) return 'tuition';
  if (item.amount > 0 && / scholarship for year /.test(item.label)) return 'scholarship';
  return 'other';
}

export function livingBudget(life: Life): Record<LivingCategory, number> {
  const { world, property, career, character } = life;
  const city = character.city;
  const job = career.current;
  const commute = job && employerById.get(job.employerId)?.city !== city;
  const housing = cityEconomies[city].rent * (property.residence === 'family' ? .65 : property.residence === 'rent' ? 1 : .25);
  return { housing: localExpense(world, city, housing, true), 'food-utilities': localExpense(world, city, 9600),
    transport: localExpense(world, city, job ? commute ? 4600 : 4000 : 2800), personal: localExpense(world, city, 3200) };
}

export function annualFinance(life: Life, elapsedAge: number) {
  if (elapsedAge < 18 || (life.finance.lastSettledYear ?? -Infinity) >= life.year) return;
  life.finance.lastSettledYear = life.year;
  const job = life.career.current;
  if (job && job.startedYear < life.year) {
    const employer = employerById.get(job.employerId)!;
    record(life, 'finance', `I received my annual ${jobById.get(job.jobId)!.type} salary from ${employer.name}.`, { bank: job.salary }, 'salary');
    const tax = incomeTax(job.salary);
    if (tax) record(life, 'finance', 'I paid income tax on the year’s salary.', { bank: -tax }, 'tax');
  }
  const bills = livingBudget(life);
  for (const category of livingCategories) {
    const debt = life.finance.arrears[category];
    if (debt) life.finance.arrears[category] += postTransaction(life, `${financeLabels[category]} arrears`, -debt, category);
  }
  for (const category of livingCategories) {
    const paid = -postTransaction(life, financeLabels[category], -bills[category], category);
    life.finance.arrears[category] += bills[category] - paid;
  }
  const childcare = localExpense(life.world, life.character.city, annualChildcare(life));
  if (childcare) life.finance.arrears.personal += childcare + postTransaction(life, 'Childcare', -childcare, 'personal');
  if (outstanding(life)) record(life, 'finance', 'I could not cover all my living costs. The unpaid bills carried forward.', { stress: 3 });
  else record(life, 'finance', 'I covered my living costs for the year.');
}
