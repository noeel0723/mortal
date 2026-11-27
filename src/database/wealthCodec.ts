import { assetById } from '../data/shops.ts';
import { loanInstallment, minimumPrincipal, principalLimit, savingsCap } from '../engine/banking.ts';
import { investmentPositionLimit, maximumTrade } from '../engine/investments.ts';
import { assetOperations, isHouse } from '../engine/property.ts';
import { indexedCents } from '../engine/pricing.ts';
import { loanTerms, instruments } from '../engine/wealthTypes.ts';
import type { LoanQuote, PersonalLoan } from '../engine/wealthTypes.ts';
import type { Life } from '../engine/types.ts';

const obj = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const cents = (value: unknown) => integer(value, 0, Number.MAX_SAFE_INTEGER);
const signed = (value: unknown) => integer(value, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
const score = (value: unknown) => integer(value, 0, 100);

export function validateOwnership(life: Life) {
  const ids = new Set<string>();
  const active = new Set<string>();
  for (const [index, asset] of life.property.owned.entries()) {
    if (!obj(asset) || asset.ownershipId !== `owned-${asset.year}-${index}-${asset.id}` || ids.has(asset.ownershipId) ||
      !score(asset.condition) || !integer(asset.improvements, 0, 3) || !Array.isArray(asset.history) || asset.history.length > 40) return false;
    ids.add(asset.ownershipId);
    const home = isHouse(asset);
    if (asset.sale !== null) {
      if (!obj(asset.sale) || !integer(asset.sale.year, asset.year, life.year) || !cents(asset.sale.proceeds) || !cents(asset.sale.fee) ||
        (asset.history.at(-1)?.action !== 'sell' || asset.history.at(-1)?.amount !== asset.sale.proceeds)) return false;
    } else {
      if (active.has(asset.id)) return false;
      active.add(asset.id);
    }
    let previousYear = asset.year;
    for (const event of asset.history) {
      if (!obj(event) || !integer(event.year, previousYear, asset.sale?.year ?? life.year) ||
        (event.action !== 'wear' && event.action !== 'borrow' && !assetOperations.includes(event.action)) ||
        (event.action === 'borrow' && (home || event.amount !== 0)) || !signed(event.amount) || !score(event.condition)) return false;
      previousYear = event.year;
    }
    if (home) {
      const rental = asset.rental;
      if (asset.reliability !== null || !obj(rental) || typeof rental.offered !== 'boolean' || typeof rental.occupied !== 'boolean' ||
        (rental.occupied && !rental.offered) || (asset.sale && rental.offered) || !cents(rental.income) || !cents(rental.expenses) ||
        !cents(rental.lastRent) || rental.lastRent > rental.income || rental.expenses > rental.income || !integer(rental.vacancies, 0, life.character.age) ||
        (rental.lastYear !== null && !integer(rental.lastYear, asset.year, life.year - 1))) return false;
    } else if (!score(asset.reliability) || asset.rental !== null || asset.improvements !== 0) return false;
  }
  const { residence } = life.property;
  if (residence === 'family' || residence === 'rent') return true;
  const home = life.property.owned.find((asset) => asset.ownershipId === residence);
  return !!home && assetById.get(home.id)?.kind === 'houses' && !home.sale && !home.rental?.offered && home.city === life.character.city;
}

function validQuote(value: unknown, minYear: number, year: number): value is LoanQuote {
  if (!obj(value) || !integer(value.year, minYear, year) || !integer(value.principal, minimumPrincipal, principalLimit) ||
    !integer(value.rate, 425, 1750) || !loanTerms.some((term) => term === value.term)) return false;
  return value.installment === loanInstallment(value.principal, value.rate, value.term as LoanQuote['term']);
}

function validLoan(loan: PersonalLoan, minYear: number, year: number) {
  if (!validQuote(loan, minYear, year) || loan.id !== `loan-${loan.year}` || !Array.isArray(loan.history) || loan.history.length > 2 * (year - loan.year + 1)) return false;
  let balance = loan.principal;
  let interestDue = 0;
  let overduePrincipal = 0;
  let missed = 0;
  let missedLifetime = 0;
  let principalPaid = 0;
  let interestPaid = 0;
  let defaulted = false;
  let previousYear = loan.year;
  let annualYear = loan.year;
  let earlyYear = -1;
  for (const payment of loan.history) {
    if (!obj(payment) || !integer(payment.year, previousYear, year) || !['annual', 'early'].includes(payment.kind) ||
      !cents(payment.principal) || !cents(payment.interest) || !cents(payment.shortfall) || balance + interestDue <= 0) return false;
    previousYear = payment.year;
    let due = 0;
    if (payment.kind === 'annual') {
      if (payment.year !== annualYear + 1 || payment.year === earlyYear) return false;
      annualYear = payment.year;
      const interest = indexedCents(balance, loan.rate);
      interestDue += interest;
      overduePrincipal = payment.year >= loan.year + loan.term ? balance :
        Math.min(balance, overduePrincipal + Math.max(0, loan.installment - interest));
      due = overduePrincipal + interestDue;
    } else {
      if (earlyYear === payment.year || annualYear !== payment.year) return false;
      earlyYear = payment.year;
    }
    const paid = payment.principal + payment.interest;
    if (payment.interest !== Math.min(paid, interestDue) || payment.principal > balance ||
      (payment.kind === 'annual' ? paid > due || payment.shortfall !== due - paid : paid === 0 || payment.shortfall !== 0)) return false;
    balance -= payment.principal;
    interestDue -= payment.interest;
    overduePrincipal = Math.max(0, overduePrincipal - payment.principal);
    principalPaid += payment.principal;
    interestPaid += payment.interest;
    if (payment.kind === 'annual') {
      missed = payment.shortfall ? missed + 1 : 0;
      if (payment.shortfall) missedLifetime++;
      defaulted ||= missed >= 2;
    }
  }
  const paid = balance + interestDue === 0;
  return balance === loan.balance && interestDue === loan.interestDue && overduePrincipal === loan.overduePrincipal &&
    loan.missed === (paid ? 0 : missed) && loan.missedLifetime === missedLifetime && loan.principalPaid === principalPaid &&
    loan.interestPaid === interestPaid && loan.status === (paid ? 'paid' : defaulted ? 'defaulted' : 'active');
}

export function validateWealth(life: Life) {
  const state = life.wealth;
  const adultYear = life.character.birthYear + 18;
  if (!obj(state) || !integer(state.savings, 0, savingsCap) || !Array.isArray(state.loans) || state.loans.length > life.character.age ||
    !obj(state.pension) || !obj(state.portfolio) || !Array.isArray(state.snapshots) || state.snapshots.length > life.character.age ||
    !(state.lastApplication === null || integer(state.lastApplication, adultYear, life.year))) return false;
  if (state.loanOffer !== null && (!validQuote(state.loanOffer, life.year, life.year) || state.lastApplication !== life.year)) return false;
  let ownedYear = adultYear - 1;
  let active = 0;
  const loanLedger = new Map<string, { borrowed: number; principal: number; interest: number }>();
  for (const loan of state.loans) {
    if (!validLoan(loan, adultYear, life.year) || loan.year <= ownedYear) return false;
    active += Number(loan.status !== 'paid');
    ownedYear = loan.year;
    loanLedger.set(loan.id, { borrowed: 0, principal: 0, interest: 0 });
  }
  if (active > 1 || (active && state.loanOffer)) return false;
  const pensionCredits = state.pension.credits;
  if (!Array.isArray(pensionCredits) || pensionCredits.length > life.character.age || !cents(state.pension.benefitsPaid) || !cents(state.pension.lastBenefit)) return false;
  let creditYear = adultYear;
  const pensionByYear = new Map<number, typeof pensionCredits[number]>();
  for (const credit of pensionCredits) {
    if (!obj(credit) || !integer(credit.year, creditYear + 1, life.year) || !integer(credit.salary, 1, 1000000) ||
      credit.employee !== indexedCents(credit.salary, 200) || credit.employer !== indexedCents(credit.salary, 110)) return false;
    creditYear = credit.year;
    pensionByYear.set(creditYear, credit);
  }
  let marketYear = life.character.birthYear;
  for (const entry of state.snapshots) {
    if (!obj(entry) || !integer(entry.year, marketYear + 1, life.year) ||
      ![entry.cash, entry.savings, entry.liquid, entry.property, entry.vehicles, entry.portfolio, entry.loans, entry.arrears, entry.liabilities].every(cents) ||
      !signed(entry.total) || entry.liquid !== entry.cash + entry.savings + entry.portfolio || entry.liabilities !== entry.loans + entry.arrears ||
      entry.total !== entry.liquid + entry.property + entry.vehicles - entry.liabilities) return false;
    marketYear = entry.year;
  }
  let savings = 0;
  let pensionIncome = 0;
  let currentBenefit = 0;
  const trades = new Map<string, { units: number; basis: number; realized: number }>();
  const assetIds = new Set(life.property.owned.map(({ ownershipId }) => ownershipId));
  for (const { amount, detail, category, year } of life.transactions) {
    if (category === 'pension-income') {
      if (amount <= 0) return false;
      pensionIncome += amount;
      if (year === life.year) currentBenefit += amount;
    }
    if (['savings-interest', 'savings-transfer', 'loan-disbursement', 'loan-principal', 'loan-interest', 'pension-contribution', 'investment-trade'].includes(category ?? '') && !detail) return false;
    if (detail === undefined) continue;
    if (!obj(detail)) return false;
    switch (detail.kind) {
      case 'savings':
        if (!signed(detail.delta) || (category === 'savings-transfer' ? amount !== -detail.delta :
          category !== 'savings-interest' || amount !== 0 || detail.delta < 1)) return false;
        savings += detail.delta;
        if (savings < 0 || savings > savingsCap) return false;
        break;
      case 'loan': {
        const row = loanLedger.get(detail.ref);
        if (!row) return false;
        if (category === 'loan-disbursement' && amount > 0 && row.borrowed === 0 && `loan-${year}` === detail.ref) row.borrowed = amount;
        else if (category === 'loan-principal' && amount < 0) row.principal -= amount;
        else if (category === 'loan-interest' && amount < 0) row.interest -= amount;
        else return false;
        break;
      }
      case 'asset':
        if (!assetIds.has(detail.ref) || !['asset-sale', 'maintenance', 'renovation', 'rental-income'].includes(category ?? '')) return false;
        break;
      case 'pension': {
        const credit = pensionByYear.get(year);
        if (!credit || category !== 'pension-contribution' || credit.employee !== -amount || credit.employer !== detail.employer) return false;
        pensionByYear.delete(year);
        break;
      }
      case 'fund': {
        if (!instruments.some((id) => id === detail.ref) || category !== 'investment-trade' ||
          !integer(detail.units, -maximumTrade, maximumTrade) || detail.units === 0 || !signed(detail.basis)) return false;
        const row = trades.get(detail.ref) ?? { units: 0, basis: 0, realized: 0 };
        if (detail.units > 0 ? detail.basis !== -amount || amount >= 0 :
          amount <= 0 || row.units < -detail.units || detail.basis !== -Math.round(row.basis * -detail.units / row.units)) return false;
        row.units += detail.units;
        row.basis += detail.basis;
        if (detail.units < 0) row.realized += amount + detail.basis;
        if (!integer(row.units, 0, investmentPositionLimit) || !cents(row.basis) || !signed(row.realized)) return false;
        trades.set(detail.ref, row);
        break;
      }
      default: return false;
    }
  }
  if (savings !== state.savings || pensionIncome !== state.pension.benefitsPaid || currentBenefit !== state.pension.lastBenefit ||
    pensionByYear.size || trades.size !== Object.keys(state.portfolio).length) return false;
  for (const [id, holding] of Object.entries(state.portfolio)) {
    const actual = trades.get(id);
    if (!obj(holding) || !actual || holding.basis !== actual.basis || holding.units !== actual.units || holding.realized !== actual.realized) return false;
  }
  return state.loans.every((loan) => {
    const ledger = loanLedger.get(loan.id)!;
    return ledger.borrowed === loan.principal && ledger.principal === loan.principalPaid && ledger.interest === loan.interestPaid;
  });
}
