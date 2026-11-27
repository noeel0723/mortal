import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { exportPortableLife, importPortableLife, maxPortableBytes } from '../src/database/portableSave.ts';
import { eventById } from '../src/data/events.ts';
import { jobById } from '../src/data/jobs.ts';
import { starterHome } from '../src/data/shops.ts';
import { loanBalance, savingsRate } from '../src/engine/banking.ts';
import { closeCareerYear } from '../src/engine/career.ts';
import { createLife } from '../src/engine/create.ts';
import { annualFinance, livingBudget } from '../src/engine/finance.ts';
import { investmentPrice, saleInvestmentQuote } from '../src/engine/investments.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { pensionEntitlement } from '../src/engine/pension.ts';
import { indexedCents } from '../src/engine/pricing.ts';
import { assetSaleQuote, currentAssetValue, ownedAssets, propertyIssue, propertyQuote, upkeepQuote } from '../src/engine/property.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { estate } from '../src/engine/wealth.ts';
import { advanceWorld, newWorld } from '../src/engine/world.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function adult(age = 26, extraCash = 180000) {
  const life = createLife(42);
  life.character.age = age;
  life.year += age;
  life.world = newWorld(life.seed, life.year, true);
  postTransaction(life, 'Existing savings', extraCash, 'other');
  return life;
}

function age(life: Life) {
  if (life.pending) life = act(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending)!.choices![0]!.id });
  const result = act(life, { type: 'age' });
  if (result.pending) return act(result, { type: 'choose', event: result.pending, choice: eventById.get(result.pending)!.choices![0]!.id });
  return result;
}

function assertLedger(life: Life) {
  assert.equal(life.character.bank, life.transactions.reduce((sum, entry) => sum + entry.amount, 0));
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
}

function employed(life: Life) {
  const jobId = 'cashier';
  const employerId = 'harbour-hall';
  const salary = jobById.get(jobId)!.salary[1];
  const id = `${life.year}-${jobId}-${employerId}`;
  life.career.applications.push({ id, jobId, employerId, salary, year: life.year, result: 'offered' });
  return act(life, { type: 'accept-job', vacancy: id });
}

function offeredLoan() {
  let life = age(employed(adult()));
  if (!life.career.current) life = employed(life);
  life = act(life, { type: 'request-loan', principal: 5000, term: 3 });
  assert.ok(life.wealth.loanOffer);
  return life;
}

test('portable saves round-trip and reject malformed, unsafe, oversized or irreconcilable files', () => {
  const life = adult();
  const exported = exportPortableLife(life);
  assert.deepEqual(importPortableLife(`\uFEFF${exported}`), life);
  assert.throws(() => importPortableLife('{}'), /exported from Mortal/);
  assert.throws(() => importPortableLife('{'), /not valid/);
  assert.throws(() => importPortableLife(exported.replace('"version":1', '"version":99')), /unsupported export/);
  assert.throws(() => importPortableLife(exported.replace('"life":{', '"life":{"__proto__":{},')), /invalid field/);
  assert.throws(() => importPortableLife('é'.repeat(maxPortableBytes / 2 + 1)), /4 MiB/);
  const corrupted = { ...life, character: { ...life.character, bank: life.character.bank + 1 } };
  assert.throws(() => importPortableLife(JSON.stringify({ format: 'mortal-life', version: 1, life: corrupted })), /ledger/);
});

test('V9 assets gain stable identities without inventing prices or prior banking history', () => {
  const original = act(act(adult(), { type: 'buy-asset', id: starterHome.id }), { type: 'buy-asset', id: 'toyota-yaris' });
  const previous = { ...original, version: 9, wealth: undefined, property: { residence: starterHome.id,
    owned: original.property.owned.map(({ id, year, source, city, acquisition }) => ({ id, year, source, city, acquisition: id === 'toyota-yaris' ? null : acquisition })) } };
  const restored = decodeLife(JSON.stringify(previous));
  const portable = importPortableLife(JSON.stringify({ format: 'mortal-life', version: 1, life: previous }));
  assert.deepEqual(portable, restored);
  assert.equal(restored.version, 11);
  assert.equal(restored.property.residence, restored.property.owned[0]?.ownershipId);
  assert.equal(restored.property.owned[1]?.acquisition, null);
  assert.deepEqual(restored.property.owned[0]?.acquisition, original.property.owned[0]?.acquisition);
  assert.equal(restored.wealth.savings, 0);
  assert.deepEqual(restored.wealth.snapshots, []);
  for (const key of ['world', 'transactions', 'journal', 'random', 'social', 'character'] as const) assert.deepEqual(restored[key], original[key]);
});

test('savings transfers preserve net worth and interest uses the elapsed world once', () => {
  const initial = adult();
  const action = { type: 'savings-transfer', direction: 'deposit', amount: 25000 } as const;
  const deposited = act(initial, action);
  assert.equal(initial.wealth.savings, 0);
  assert.equal(estate(deposited).total, initial.character.bank);
  assert.match(advance(deposited, { ...action, amount: initial.character.bank }).error ?? '', /does not cover/);
  const next = age(deposited);
  const interest = indexedCents(action.amount, savingsRate(deposited));
  assert.equal(next.wealth.savings, 25000 + interest);
  assert.equal(next.transactions.filter(({ category }) => category === 'savings-interest').length, 1);
  const snapshot = structuredClone(next);
  annualFinance(snapshot, next.character.age - 1);
  assert.deepEqual(snapshot, next);
  const withdrawn = act(next, { type: 'savings-transfer', direction: 'withdraw', amount: 1450 });
  assert.equal(estate(withdrawn).total, estate(next).total);
  assertLedger(withdrawn);
});

test('loan approval records fixed terms, principal and interest separately, and early payoff clears the liability', () => {
  const unemployed = act(adult(), { type: 'request-loan', principal: 5000, term: 3 });
  assert.equal(unemployed.wealth.loanOffer, null);
  assert.match(unemployed.journal.at(-1)!.text, /current job/);
  assert.match(advance(unemployed, { type: 'request-loan', principal: 5000, term: 3 }).error ?? '', /already applied/);
  const offered = offeredLoan();
  const approved = act(offered, { type: 'respond-loan', accept: true });
  assert.equal(estate(approved).total, estate(offered).total);
  assert.equal(approved.wealth.loans[0]!.rate, offered.wealth.loanOffer!.rate);
  const installment = age(approved);
  assert.equal(installment.wealth.loans[0]!.rate, approved.wealth.loans[0]!.rate);
  for (const key of ['loan-principal', 'loan-interest'] as const) assert.ok(installment.transactions.some(({ category }) => category === key));
  const loan = installment.wealth.loans[0]!;
  const settled = act(installment, { type: 'repay-loan', id: loan.id, amount: loanBalance(loan) });
  assert.equal(settled.wealth.loans[0]!.status, 'paid');
  assert.equal(settled.wealth.loans[0]!.principalPaid, 5000);
  assert.equal(estate(settled).total, estate(installment).total);
  assertLedger(settled);
});

test('two missed installments default without duplicating or forgiving the principal', () => {
  let life = act(offeredLoan(), { type: 'respond-loan', accept: true });
  life = act(life, { type: 'resign' });
  postTransaction(life, 'Fixture expense', -life.character.bank, 'other');
  life = age(age(life));
  const loan = life.wealth.loans[0]!;
  assert.equal(loan.status, 'defaulted');
  assert.equal(loan.balance, loan.principal);
  assert.ok(loan.overduePrincipal <= loan.balance && loan.interestDue > 0);
  assert.equal(estate(life).loans, loan.balance + loan.interestDue);
  assert.equal(life.notices.filter(({ title }) => title === 'Loan in Default').length, 1);
  assertLedger(life);
  const reload = decodeLife(JSON.stringify(life));
  postTransaction(reload, 'Fixture emergency cash', 20000, 'other');
  const repaid = act(reload, { type: 'repay-loan', id: loan.id, amount: loanBalance(loan) });
  assert.equal(estate(repaid).loans, 0);
  assertLedger(repaid);
});

test('sale protects the current home, records actual proceeds, and a reacquisition gets its own ID', () => {
  let life = act(adult(), { type: 'buy-asset', id: starterHome.id });
  const home = ownedAssets(life)[0]!;
  assert.equal(home.acquisition?.price, propertyQuote(life, starterHome).price);
  life = act(life, { type: 'move-into-home', id: home.ownershipId });
  const sale = { type: 'manage-asset', operation: 'sell', id: home.ownershipId } as const;
  assert.match(propertyIssue(life, sale) ?? '', /Move into another home/);
  const rent = act(life, { type: 'rent-home' });
  const quote = assetSaleQuote(rent, home);
  const sold = act(rent, sale);
  assert.equal(sold.character.bank, rent.character.bank + quote.proceeds);
  assert.equal(sold.property.residence, 'rent');
  assert.equal(ownedAssets(sold).length, 0);
  assert.match(advance(sold, sale).error ?? '', /unavailable/);
  const boughtAgain = act(sold, { type: 'buy-asset', id: starterHome.id });
  assert.notEqual(ownedAssets(boughtAgain)[0]?.ownershipId, home.ownershipId);
  assert.equal(boughtAgain.property.owned.length, 2);
  assertLedger(boughtAgain);
});

test('rental, maintenance and car wear use persistent ownership and settle once', () => {
  let life = act(adult(24, 350000), { type: 'buy-asset', id: starterHome.id });
  life = act(life, { type: 'buy-asset', id: 'toyota-yaris' });
  const [home, vehicle] = ownedAssets(life);
  assert.ok(home && vehicle);
  const upkeep = { type: 'manage-asset', id: vehicle.ownershipId, operation: 'service' } as const;
  const initialCarValue = currentAssetValue(life, vehicle);
  const letOut = { type: 'manage-asset', id: home.ownershipId, operation: 'offer-rental' } as const;
  life = act(life, letOut);
  assert.match(propertyIssue(life, { type: 'move-into-home', id: home.ownershipId }) ?? '', /Stop renting/);
  for (let turn = 0; turn < 5; turn++) life = age(life);
  const worn = ownedAssets(life).find(({ id }) => id === vehicle.id)!;
  assert.ok(worn.condition < vehicle.condition && currentAssetValue(life, worn) < initialCarValue);
  const paid = life.transactions.filter(({ category }) => category === 'rental-income');
  assert.ok(paid.length > 0 && paid.length <= 5);
  assert.equal(new Set(paid.map(({ year }) => year)).size, paid.length);
  const serviced = act(life, upkeep);
  assert.equal(serviced.character.bank, life.character.bank - upkeepQuote(life, worn, upkeep.operation));
  assert.match(advance(serviced, upkeep).error ?? '', /already done/i);
  assertLedger(serviced);
});

test('fund quotes are stable for the year and sales reconcile cost basis and fees', () => {
  const initial = adult();
  const fund = 'veyra-index';
  const price = investmentPrice(initial, fund);
  const buy = { type: 'trade-fund', instrument: fund, side: 'buy', units: 5 } as const;
  const invested = act(initial, buy);
  assert.equal(estate(invested).total, estate(initial).total);
  assert.equal(investmentPrice(invested, fund), price);
  const part = act(invested, { ...buy, side: 'sell', units: 2 });
  assert.equal(part.wealth.portfolio[fund]?.basis, price * 3);
  assert.equal(part.wealth.portfolio[fund]?.realized, saleInvestmentQuote(price * 2) - price * 2);
  assert.match(advance(part, { ...buy, side: 'sell', units: 4 }).error ?? '', /enough units/);
  const sold = act(part, { ...buy, side: 'sell', units: 3 });
  assert.equal(sold.wealth.portfolio[fund]?.basis, 0);
  assertLedger(sold);
});

test('payroll pension credits and retirement benefits reconcile through the final estate', () => {
  let life = employed(adult(59, 300000));
  while (life.character.age < 65) {
    life = age(life);
    if (!life.career.current && life.character.age < 65) life = employed(life);
  }
  assert.equal(life.wealth.pension.credits.length, 6);
  assert.ok(life.wealth.pension.credits.every(({ salary, employee, employer }) => employee > 0 && employer > 0 && employee < salary));
  const retired = act(life, { type: 'retire' });
  const expected = pensionEntitlement(retired);
  const paid = age(retired);
  assert.equal(paid.wealth.pension.lastBenefit, expected);
  assert.equal(paid.wealth.pension.credits.length, 6);
  assert.equal(paid.transactions.filter(({ year, category }) => year === paid.year && category === 'pension-income').length, 1);
  assert.equal(paid.transactions.filter(({ year, category }) => year === paid.year && category === 'pension-contribution').length, 0);
  const ending = structuredClone(paid);
  ending.character.attributes.health = 0;
  const final = age(ending);
  assert.ok(final.character.causeOfDeath);
  assert.deepEqual(final.wealth.snapshots.at(-1), { year: final.year, ...estate(final) });
  assert.match(advance(final, { type: 'age' }).error ?? '', /ended/);
  assertLedger(final);
});

test('debt follows essentials in the annual settlement order', () => {
  const before = act(offeredLoan(), { type: 'respond-loan', accept: true });
  const copy = structuredClone(before);
  const expectedHousing = livingBudget(copy).housing;
  copy.year++;
  copy.character.age++;
  annualFinance(copy, copy.character.age - 1);
  closeCareerYear(copy);
  copy.world = advanceWorld(copy.world, copy.year);
  const rows = copy.transactions.filter(({ year }) => year === copy.year);
  assert.equal(rows.find(({ category }) => category === 'housing')?.amount, -expectedHousing);
  assert.ok(rows.findIndex(({ category }) => category === 'personal') < rows.findIndex(({ category }) => category === 'loan-interest'));
  assertLedger(copy);
});
