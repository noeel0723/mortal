export const livingCategories = ['housing', 'food-utilities', 'transport', 'personal'] as const;
export type LivingCategory = typeof livingCategories[number];
export const transactionCategories = ['salary', 'tax', ...livingCategories, 'tuition', 'scholarship', 'medical', 'other'] as const;
export type TransactionCategory = typeof transactionCategories[number];
export type Transaction = { year: number; label: string; amount: number; category?: TransactionCategory };
export type FinanceState = { lastSettledYear: number | null; arrears: Record<LivingCategory, number> };
