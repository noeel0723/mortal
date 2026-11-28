import { recordNotice } from './eventNotices.ts';
import { annualChildcare } from './familyLife.ts';
import { incomeTax, livingBudget, outstanding } from './finance.ts';
import { clamp, postTransaction } from './journal.ts';
import { indexedCents, localExpense } from './pricing.ts';
import { national } from './world.ts';
import { loanTerms } from './wealthTypes.ts';
import type { LoanQuote, LoanTerm, PersonalLoan, WealthAction } from './wealthTypes.ts';
import type { Life } from './types.ts';

export const savingsCap = 1_000_000_000;
export const principalLimit = 60000;
export const minimumPrincipal = 5000;
export const savingsRate = (life: Life) => Math.max(45, Math.min(520, Math.round(national(life.world).interest * .66 - 35)));

export function bankAvailability(life: Life) {
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  return life.character.age < 18 ? 'Banking opens at age 18.' : null;
}

export function savingsIssue(life: Life, direction: 'deposit' | 'withdraw', amount: number) {
  if (!Number.isSafeInteger(amount) || amount < 1 || (direction !== 'deposit' && direction !== 'withdraw')) return 'Enter a positive amount.';
  if (direction === 'withdraw') return amount > life.wealth.savings ? 'Your savings do not cover this withdrawal.' : null;
  if (amount > life.character.bank) return 'Your cash does not cover this deposit.';
  return amount + life.wealth.savings > savingsCap ? 'This deposit exceeds the account limit.' : null;
}

export function transferSavings(life: Life, action: Extract<WealthAction, { type: 'savings-transfer' }>) {
  const issue = savingsIssue(life, action.direction, action.amount);
  if (issue) return issue;
  const deposit = action.direction === 'deposit';
  const delta = action.amount * (deposit ? 1 : -1);
  life.wealth.savings += delta;
  postTransaction(life, deposit ? 'Cash deposited into savings' : 'Savings transferred to cash', -delta, 'savings-transfer', { kind: 'savings', delta });
  recordNotice(life, 'finance', deposit ? 'Savings Deposit' : 'Savings Withdrawal', deposit ? 'I moved cash into savings.' : 'I moved savings into my cash balance.');
  return null;
}

export function settleSavings(life: Life) {
  const increment = Math.min(savingsCap - life.wealth.savings, indexedCents(life.wealth.savings, savingsRate(life)));
  if (!increment) return;
  life.wealth.savings += increment;
  postTransaction(life, 'Annual savings interest', 0, 'savings-interest', { kind: 'savings', delta: increment });
}

export function creditScore(life: Life) {
  const job = life.career.current;
  const late = life.wealth.loans.reduce((sum, loan) => sum + loan.missedLifetime, 0);
  const cleared = life.wealth.loans.filter((loan) => loan.status === 'paid').length;
  const liabilities = life.wealth.loans.reduce((sum, loan) => sum + loan.balance + loan.interestDue, 0);
  const jobYears = job ? life.year - job.startedYear : 0;
  const recent = life.wealth.lastApplication !== null && life.year - life.wealth.lastApplication <= 1;
  return clamp(Math.round(38 + (job ? 12 + job.security * .13 + Math.min(14, (job.salary - incomeTax(job.salary)) / 5200) : 0) +
    Math.min(10, jobYears * 2) + Math.min(9, (life.character.bank + life.wealth.savings) / 12000) + Math.min(10, cleared * 3) -
    Math.min(34, outstanding(life) / 1200) - Math.min(24, liabilities / 3500) - Math.min(26, late * 3) - Number(recent) * 5));
}

export function loanBalance(loan: PersonalLoan) {
  return loan.balance + loan.interestDue;
}

export function loanInstallment(principal: number, rate: number, term: LoanTerm) {
  const fraction = rate / 10000;
  return Math.ceil(principal * fraction / (1 - (1 + fraction) ** -term));
}

export function quoteLoan(life: Life, principal: number, term: LoanTerm): LoanQuote {
  const rate = Math.max(425, Math.min(1750, national(life.world).interest + 470 + (72 - creditScore(life)) * 13));
  return { year: life.year, principal, term, rate, installment: loanInstallment(principal, rate, term) };
}

export function loanApplicationIssue(life: Life, principal: number, term: LoanTerm) {
  if (!Number.isSafeInteger(principal) || principal < minimumPrincipal || principal > principalLimit || !loanTerms.includes(term)) {
    return 'Choose a loan between $50 and $600 for 3, 5, or 7 years.';
  }
  if (life.wealth.loanOffer) return 'Decide on the existing offer first.';
  if (life.wealth.lastApplication === life.year) return 'You already applied this year.';
  if (life.wealth.loans.some((loan) => loan.status !== 'paid')) return 'Repay your current loan before applying again.';
  return null;
}

export function lendingIssue(life: Life, quote: LoanQuote, reviewingOffer = false) {
  const job = life.career.current;
  if (!job || life.career.experience < 1) return 'You need a current job and at least one paid work year.';
  if (job.security < 40) return 'Your employment needs to be more stable.';
  if (outstanding(life) > Math.floor(job.salary * .12)) return 'Your unpaid living bills are too high.';
  if (!reviewingOffer && creditScore(life) < 50) return 'Your creditworthiness is below 50.';
  const childcare = localExpense(life.world, life.character.city, annualChildcare(life));
  const cost = Object.values(livingBudget(life)).reduce((total, value) => total + value, childcare);
  const surplus = job.salary - incomeTax(job.salary) - cost;
  return quote.principal > Math.round(job.salary * .63) || quote.installment > surplus * .65 ? 'Your income does not cover this installment after essential bills.' : null;
}

export function applyForLoan(life: Life, principal: number, term: LoanTerm) {
  const issue = loanApplicationIssue(life, principal, term);
  if (issue) return issue;
  const quote = quoteLoan(life, principal, term);
  const reason = lendingIssue(life, quote);
  life.wealth.lastApplication = life.year;
  if (!reason) life.wealth.loanOffer = quote;
  recordNotice(life, 'finance', reason ? 'Loan Application Declined' : 'Personal Loan Offer',
    reason ?? 'The bank sent an offer. I can review it in Activities under Loans & Debts.');
  return null;
}

export function respondToLoan(life: Life, accept: boolean) {
  const offer = life.wealth.loanOffer;
  if (!offer || offer.year !== life.year || typeof accept !== 'boolean') return 'This offer is no longer available.';
  if (accept) {
    const issue = lendingIssue(life, offer, true);
    if (issue) return issue;
    const loan: PersonalLoan = { ...offer, id: `loan-${life.year}`, balance: offer.principal, interestDue: 0, overduePrincipal: 0,
      missed: 0, status: 'active', missedLifetime: 0, interestPaid: 0, principalPaid: 0, history: [] };
    life.wealth.loans.push(loan);
    postTransaction(life, 'Personal loan funds received', loan.principal, 'loan-disbursement', { kind: 'loan', ref: loan.id });
  }
  life.wealth.loanOffer = null;
  recordNotice(life, 'finance', accept ? 'Personal Loan Accepted' : 'Loan Offer Declined',
    accept ? 'I accepted a fixed-rate personal loan.' : 'I declined the personal loan offer.');
  return null;
}

function payLoan(life: Life, loan: PersonalLoan, amount: number, kind: 'early' | 'annual', due: number) {
  const interest = Math.min(amount, loan.interestDue);
  const principal = Math.min(amount - interest, loan.balance);
  const detail = { kind: 'loan', ref: loan.id } as const;
  if (interest) postTransaction(life, 'Personal loan interest paid', -interest, 'loan-interest', detail);
  if (principal) postTransaction(life, 'Personal loan principal repaid', -principal, 'loan-principal', detail);
  loan.interestPaid += interest;
  loan.principalPaid += principal;
  loan.interestDue -= interest;
  loan.balance -= principal;
  loan.overduePrincipal = Math.max(0, loan.overduePrincipal - principal);
  const shortfall = Math.max(0, due - amount);
  loan.history.push({ year: life.year, kind, principal, interest, shortfall });
  if (loanBalance(loan) === 0) { loan.status = 'paid'; loan.missed = 0; }
  return shortfall;
}

export function repaymentIssue(life: Life, id: string, amount: number) {
  const loan = life.wealth.loans.find((entry) => entry.id === id && entry.status !== 'paid');
  if (!loan) return 'This loan has already been settled.';
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > loanBalance(loan)) return 'Choose a payment up to the outstanding balance.';
  if (amount > life.character.bank) return 'Your cash does not cover this payment.';
  return life.usedActions.includes(`repay:${id}`) ? 'An early payment has already been made this year.' : null;
}

export function repayLoan(life: Life, id: string, amount: number) {
  const issue = repaymentIssue(life, id, amount);
  if (issue) return issue;
  const loan = life.wealth.loans.find((entry) => entry.id === id)!;
  payLoan(life, loan, amount, 'early', 0);
  life.usedActions.push(`repay:${id}`);
  recordNotice(life, 'finance', loan.status === 'paid' ? 'Personal Loan Repaid' : 'Early Loan Payment', 'I made an early payment on my personal loan.');
  return null;
}

export function settleLoans(life: Life) {
  if (life.wealth.loanOffer && life.wealth.loanOffer.year < life.year) life.wealth.loanOffer = null;
  for (const loan of life.wealth.loans) {
    if (loan.status === 'paid' || loan.year >= life.year) continue;
    const interest = indexedCents(loan.balance, loan.rate);
    loan.interestDue += interest;
    const matured = life.year >= loan.year + loan.term;
    loan.overduePrincipal = matured ? loan.balance : Math.min(loan.balance, loan.overduePrincipal + Math.max(0, loan.installment - interest));
    const due = loan.overduePrincipal + loan.interestDue;
    const shortfall = payLoan(life, loan, Math.min(due, life.character.bank), 'annual', due);
    if (shortfall) {
      loan.missed++;
      loan.missedLifetime++;
      if (loan.missed === 2 && loan.status === 'active') {
        loan.status = 'defaulted';
        recordNotice(life, 'finance', 'Loan in Default', 'I missed two installments in a row. The unpaid principal and interest are still due.');
      }
    } else loan.missed = 0;
  }
}
