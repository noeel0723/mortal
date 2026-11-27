import { findContact } from './engine/school.ts';
import { bankAvailability, creditScore, lendingIssue, loanApplicationIssue, loanBalance, quoteLoan, repaymentIssue, savingsIssue, savingsRate } from './engine/banking.ts';
import { instrumentNames, investmentIssue, investmentPrice, saleInvestmentQuote } from './engine/investments.ts';
import { pensionEntitlement, pensionMinimumYears } from './engine/pension.ts';
import { ownedAssets } from './engine/property.ts';
import { estate } from './engine/wealth.ts';
import { instruments } from './engine/wealthTypes.ts';
import type { InstrumentId, LoanTerm, WealthAction } from './engine/wealthTypes.ts';
import type { Life } from './engine/types.ts';
import { skills } from './data/skills.ts';
import { assetById } from './data/shops.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export type FinanceControl = { label: string; icon: Emoji; detail?: string; issue: string | null; action: WealthAction };
const rate = (value: number) => `${(value / 100).toFixed(2)}%`;
const encodedControl = (life: Life, control: Omit<FinanceControl, 'issue'>, issue: string | null = null): FinanceControl =>
  ({ ...control, issue: bankAvailability(life) ?? issue });

export function estateRows(life: Life) {
  const value = estate(life);
  return [
    { label: 'Net worth', value: money(value.total) }, { label: 'Available cash', value: money(value.cash) },
    { label: 'Savings deposits', value: money(value.savings) }, { label: 'Investment value', value: money(value.portfolio) },
    { label: 'Total liquid wealth', value: money(value.liquid) }, { label: 'Property value', value: money(value.property) },
    { label: 'Vehicle value', value: money(value.vehicles) }, { label: 'Loan balances and interest', value: money(value.loans) },
    { label: 'Unpaid living bills', value: money(value.arrears) }, { label: 'Total liabilities', value: money(value.liabilities) },
  ];
}

export function estateHistory(life: Life) {
  return [...life.wealth.snapshots.slice(-8)].reverse().map(({ year, total }) => ({ label: String(year), value: money(total) }));
}

export function parseCashAmount(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d{1,8}(?:\.\d{0,2})?$/.test(normalized)) return 0;
  const [whole, decimal = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
}

export function savingsRows(life: Life) {
  const history = life.transactions.filter((item) => item.detail?.kind === 'savings');
  return [{ label: 'Savings balance', value: money(life.wealth.savings) }, { label: 'Current annual rate', value: rate(savingsRate(life)) },
    { label: 'Cash available', value: money(life.character.bank) },
    { label: 'Lifetime interest', value: money(history.reduce((sum, item) => sum + (item.category === 'savings-interest' && item.detail?.kind === 'savings' ? item.detail.delta : 0), 0)) }];
}

export function savingsHistory(life: Life) {
  return life.transactions.filter((item) => item.detail?.kind === 'savings').slice(-12).reverse().map((item, index) => ({
    label: `${item.year} · ${item.label}`, value: money(item.detail?.kind === 'savings' ? item.detail.delta : 0), key: String(index),
  }));
}

export function savingsControls(life: Life, amount: number): FinanceControl[] {
  return (['deposit', 'withdraw'] as const).map((direction) => encodedControl(life, { label: direction === 'deposit' ? 'Deposit' : 'Withdraw',
    icon: direction === 'deposit' ? 'savings' : 'bank', detail: amount ? money(amount) : 'Enter an amount above.', action: { type: 'savings-transfer', direction, amount } },
  savingsIssue(life, direction, amount)));
}

const lendingOptions: readonly [number, LoanTerm][] = [[5000, 3], [15000, 3], [30000, 5], [60000, 7]];

export function loanView(life: Life) {
  const offer = life.wealth.loanOffer;
  const applications = lendingOptions.map(([principal, term]) => {
    const quote = quoteLoan(life, principal, term);
    const risk = lendingIssue(life, quote);
    return encodedControl(life, { label: `Apply for ${money(principal)}`, icon: 'work', detail: `${term} years · ${rate(quote.rate)} fixed · ${money(quote.installment)}/year${risk ? ` · ${risk}` : ''}`,
      action: { type: 'request-loan', principal, term } }, loanApplicationIssue(life, principal, term));
  });
  const full = (amount: number) => money(amount);
  return {
    credit: [{ label: 'Creditworthiness', value: `${creditScore(life)}/100` }, { label: 'Essential bills owed', value: money(estate(life).arrears) }],
    offer: offer ? { rows: [{ label: 'Principal', value: money(offer.principal) }, { label: 'Fixed annual interest', value: rate(offer.rate) },
      { label: 'Annual installment', value: money(offer.installment) }, { label: 'Term', value: `${offer.term} years` }, { label: 'Expires', value: 'Next Age Up' }],
    controls: [encodedControl(life, { label: 'Accept Loan Offer', icon: 'accept', detail: `${money(offer.principal)} now · ${money(offer.installment)} per year`,
      action: { type: 'respond-loan', accept: true } }, lendingIssue(life, offer, true)), encodedControl(life, { label: 'Decline Loan Offer', icon: 'decline',
      action: { type: 'respond-loan', accept: false } })] } : null,
    applications,
    loans: [...life.wealth.loans].reverse().map((loan) => ({ title: `Personal Loan · ${loan.year}`,
      rows: [{ label: 'Status', value: loan.status === 'defaulted' ? 'In default' : loan.status === 'paid' ? 'Paid in full' : 'Active' },
        { label: 'Original principal', value: money(loan.principal) }, { label: 'Outstanding principal', value: money(loan.balance) },
        { label: 'Unpaid interest', value: money(loan.interestDue) }, { label: 'Overdue principal', value: money(loan.overduePrincipal) },
        { label: 'Fixed annual interest', value: rate(loan.rate) }, { label: 'Scheduled installment', value: money(loan.installment) },
        { label: 'Missed installments', value: loan.missedLifetime }, { label: 'Due by year', value: loan.year + loan.term }],
      history: [...loan.history.slice(-6)].reverse().map(({ year, kind, principal, interest, shortfall }, index) => ({
        key: String(index), label: `${year} · ${kind === 'early' ? 'Early payment' : 'Annual installment'}`,
        value: `${money(principal)} principal · ${money(interest)} interest${shortfall ? ` · ${money(shortfall)} missed` : ''}`,
      })),
      controls: loan.status === 'paid' ? [] : [...new Set([Math.min(5000, loanBalance(loan)), loanBalance(loan)])].map((amount) =>
        encodedControl(life, { label: amount === loanBalance(loan) ? 'Repay in Full' : 'Make Early Payment', detail: full(amount), icon: 'bank',
          action: { type: 'repay-loan', id: loan.id, amount } }, repaymentIssue(life, loan.id, amount))),
    })),
  };
}

export function retirementView(life: Life) {
  const { credits, benefitsPaid, lastBenefit } = life.wealth.pension;
  const eligible = credits.length >= pensionMinimumYears;
  const status = !eligible ? `Requires ${pensionMinimumYears} contribution years` : life.career.retiredYear === null ? 'Available after retiring at 65+' : 'Retired and eligible';
  return { rows: [{ label: 'Eligibility', value: status }, { label: 'Contribution years', value: credits.length },
    { label: 'Annual benefit estimate', value: money(pensionEntitlement(life)) }, { label: 'Latest payment', value: money(lastBenefit) },
    { label: 'Lifetime pension income', value: money(benefitsPaid) }],
  history: [...credits.slice(-12)].reverse().map(({ year, employee, employer }) => ({ label: String(year), value: `${money(employee)} employee · ${money(employer)} employer` })) };
}

export const findFund = (value?: string) => instruments.find((id) => id === value);
export function funds(life: Life) {
  return instruments.map((id) => ({ id, name: instrumentNames[id], detail: `${money(investmentPrice(life, id))}/unit · ${life.wealth.portfolio[id]?.units ?? 0} owned`,
    icon: (id === 'government-bonds' ? 'bonds' : 'harder') as Emoji }));
}

export function fundView(life: Life, id: InstrumentId) {
  const price = investmentPrice(life, id);
  const holding = life.wealth.portfolio[id] ?? { units: 0, basis: 0, realized: 0 };
  const rows = [{ label: 'Price per unit', value: money(price) }, { label: 'Units held', value: holding.units },
    { label: 'Current value', value: money(holding.units * price) }, { label: 'Cost basis', value: money(holding.basis) },
    { label: 'Realized gain or loss', value: money(holding.realized) }, { label: 'Unrealized gain or loss', value: money(holding.units * price - holding.basis) }];
  const trade = (side: 'buy' | 'sell', units: number) => {
    const action = { type: 'trade-fund', instrument: id, side, units } as const;
    const gross = price * units;
    return encodedControl(life, { icon: side === 'buy' ? 'cart' : 'bank', label: `${side === 'buy' ? 'Buy' : 'Sell'} ${units} ${units === 1 ? 'unit' : 'units'}`,
      detail: money(side === 'buy' ? gross : saleInvestmentQuote(gross)), action }, investmentIssue(life, action));
  };
  return { rows, buy: [1, 5, 20, 100].map((units) => trade('buy', units)),
    sell: holding.units ? [...new Set([1, Math.min(5, holding.units), Math.min(100, holding.units)])].map((units) => trade('sell', units)) : [] };
}

export function finalAssetRows(life: Life) {
  return ownedAssets(life).map((item) => ({ key: item.ownershipId, label: assetById.get(item.id)!.name, value: item.city }));
}

export function finalSkillRows(life: Life) {
  return Object.entries(life.skills.entries).filter(([, skill]) => skill.best >= 30 || skill.awards > 0)
    .sort(([, first], [, second]) => second.best - first.best).slice(0, 5)
    .map(([id, skill]) => ({ label: skills[id as keyof typeof skills].name, value: `${skill.best}% personal best · ${skill.awards} awards` }));
}

export function familyMilestoneRows(life: Life) {
  return [...life.social.romances.flatMap((entry) => entry.wedding === null ? [] : [{ key: entry.person, label: `${entry.wedding} · Married`,
    value: findContact(life, entry.person)?.name ?? 'Partner' }]),
  ...Object.entries(life.social.children).map(([id, child]) => ({ key: id, label: `${child.year} · ${child.adopted ? 'Adopted' : 'Welcomed'}`,
    value: findContact(life, id)?.name ?? 'Child' }))];
}
