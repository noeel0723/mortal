export const livingCategories = ['housing', 'food-utilities', 'transport', 'personal'] as const;
export type LivingCategory = typeof livingCategories[number];
export const transactionCategories = ['salary', 'tax', ...livingCategories, 'tuition', 'scholarship', 'medical', 'shopping', 'relationships', 'training', 'leisure',
  'savings-transfer', 'savings-interest', 'loan-disbursement', 'loan-principal', 'loan-interest', 'asset-sale', 'maintenance', 'renovation',
  'rental-income', 'pension-contribution', 'pension-income', 'investment-trade', 'investment-income', 'other'] as const;
export type TransactionCategory = typeof transactionCategories[number];
export type TransactionDetail = { kind: 'savings'; delta: number } | { kind: 'loan' | 'asset'; ref: string } |
  { kind: 'pension'; employer: number } | { kind: 'fund'; ref: string; units: number; basis: number };
export type Transaction = { year: number; label: string; amount: number; category?: TransactionCategory; detail?: TransactionDetail };
export type FinanceState = { lastSettledYear: number | null; arrears: Record<LivingCategory, number> };
