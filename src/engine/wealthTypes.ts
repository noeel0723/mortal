export const instruments = ['veyra-index', 'technology-fund', 'healthcare-fund', 'government-bonds'] as const;
export type InstrumentId = typeof instruments[number];
export const loanTerms = [3, 5, 7] as const;
export type LoanTerm = typeof loanTerms[number];
export type LoanQuote = { year: number; principal: number; term: LoanTerm; rate: number; installment: number };
export type Repayment = { year: number; kind: 'annual' | 'early'; principal: number; interest: number; shortfall: number };
export type PersonalLoan = LoanQuote & {
  id: string; balance: number; interestDue: number; overduePrincipal: number; missed: number;
  status: 'active' | 'defaulted' | 'paid'; missedLifetime: number; interestPaid: number; principalPaid: number; history: Repayment[];
};

export type PensionCredit = { year: number; salary: number; employee: number; employer: number };
export type Retirement = { credits: PensionCredit[]; benefitsPaid: number; lastBenefit: number };
export type Holding = { units: number; basis: number; realized: number };
export type WealthValue = { cash: number; savings: number; liquid: number; property: number; vehicles: number; portfolio: number;
  loans: number; arrears: number; liabilities: number; total: number };
export type EstateSnapshot = WealthValue & { year: number };
export type WealthState = {
  savings: number; loanOffer: LoanQuote | null; lastApplication: number | null;
  loans: PersonalLoan[]; pension: Retirement; portfolio: Partial<Record<InstrumentId, Holding>>;
  snapshots: EstateSnapshot[];
};

export type WealthAction =
  | { type: 'savings-transfer'; direction: 'deposit' | 'withdraw'; amount: number }
  | { type: 'request-loan'; principal: number; term: LoanTerm }
  | { type: 'respond-loan'; accept: boolean }
  | { type: 'repay-loan'; id: string; amount: number }
  | { type: 'trade-fund'; instrument: InstrumentId; side: 'buy' | 'sell'; units: number };
