import { assetById } from '../data/shops.ts';
import { livingCategories } from './financeTypes.ts';
import { currentAssetValue, ownedAssets } from './property.ts';
import { investmentPrice, tradeInvestment } from './investments.ts';
import { applyForLoan, bankAvailability, repayLoan, respondToLoan, transferSavings } from './banking.ts';
import type { Life } from './types.ts';
import type { InstrumentId, WealthAction, WealthState, WealthValue } from './wealthTypes.ts';

export function initialWealth(): WealthState {
  return { savings: 0, loanOffer: null, lastApplication: null, loans: [], pension: { credits: [], benefitsPaid: 0, lastBenefit: 0 },
    portfolio: {}, snapshots: [] };
}

export function cloneWealth(state: WealthState): WealthState {
  return { ...state, loans: state.loans.map((loan) => ({ ...loan, history: [...loan.history] })),
    pension: { ...state.pension, credits: [...state.pension.credits] }, portfolio: { ...state.portfolio }, snapshots: [...state.snapshots] };
}

export function estate(life: Life): WealthValue {
  let property = 0;
  let vehicles = 0;
  for (const asset of ownedAssets(life)) {
    const value = currentAssetValue(life, asset);
    if (assetById.get(asset.id)?.kind === 'houses') property += value;
    else vehicles += value;
  }
  const cash = life.character.bank;
  const savings = life.wealth.savings;
  const portfolio = Object.entries(life.wealth.portfolio).reduce((sum, [id, holding]) =>
    sum + holding.units * investmentPrice(life, id as InstrumentId), 0);
  const loans = life.wealth.loans.reduce((sum, loan) => sum + loan.balance + loan.interestDue, 0);
  const arrears = livingCategories.reduce((sum, category) => sum + life.finance.arrears[category], 0);
  const liquid = cash + savings + portfolio;
  const liabilities = loans + arrears;
  return { cash, savings, liquid, property, vehicles, portfolio, loans, arrears, liabilities,
    total: liquid + property + vehicles - liabilities };
}

export function recordValuation(life: Life) {
  if (life.wealth.snapshots.at(-1)?.year === life.year) return;
  life.wealth.snapshots.push({ year: life.year, ...estate(life) });
}

export function performWealth(life: Life, action: WealthAction) {
  const blocked = bankAvailability(life);
  if (blocked) return blocked;
  switch (action.type) {
    case 'savings-transfer': return transferSavings(life, action);
    case 'request-loan': return applyForLoan(life, action.principal, action.term);
    case 'respond-loan': return respondToLoan(life, action.accept);
    case 'repay-loan': return repayLoan(life, action.id, action.amount);
    case 'trade-fund': return tradeInvestment(life, action);
  }
}
