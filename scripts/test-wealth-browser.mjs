import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import { eventById } from '../src/data/events.ts';
import { jobById } from '../src/data/jobs.ts';
import { importPortableLife } from '../src/database/portableSave.ts';
import { createLife } from '../src/engine/create.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { advance } from '../src/engine/simulation.ts';
import { estate } from '../src/engine/wealth.ts';
import { newWorld } from '../src/engine/world.ts';
import { acknowledgeEvents, saveSlot, startBrowser, url } from './browserTestSupport.mjs';

function act(life, action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function workingAdult() {
  let life = createLife(42);
  life.character.age = 26;
  life.year += 26;
  life.world = newWorld(life.seed, life.year, true);
  postTransaction(life, 'Existing savings', 180000, 'other');
  const jobId = 'cashier';
  const employerId = 'harbour-hall';
  const id = `${life.year}-${jobId}-${employerId}`;
  life.career.applications.push({ id, jobId, employerId, salary: jobById.get(jobId).salary[1], year: life.year, result: 'offered' });
  life = act(act(life, { type: 'accept-job', vacancy: id }), { type: 'age' });
  if (life.pending) life = act(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending).choices[0].id });
  life = act(act(life, { type: 'buy-asset', id: 'cedar-starter' }), { type: 'move-into-home', id: 'cedar-starter' });
  life.notices = [];
  return life;
}

const browser = await startBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const dialog = (name) => page.getByRole('dialog', { name, exact: true });
  const click = (name) => button(name).click();
  const id = 'wealth-test';
  const read = async () => JSON.parse((await page.evaluate(saveSlot, { id })).payload);
  async function confirm(label, result) {
    await click(label);
    await dialog(label).getByRole('button', { name: 'Confirm', exact: true }).click();
    await dialog(result).waitFor();
    await acknowledgeEvents(page);
  }

  await page.goto(url);
  await button('New Life').waitFor();
  const initial = workingAdult();
  const { firstName, lastName, city, age } = initial.character;
  const name = `${firstName} ${lastName}`;
  await page.evaluate(saveSlot, { id, entry: { id, name, city, age, year: initial.year, completed: false,
    revision: 0, updatedAt: Date.now(), payload: JSON.stringify(initial) } });
  await page.goto(new URL(`#play/${id}/journal`, url).href);
  await page.getByRole('heading', { name: 'Life Journal' }).waitFor();
  await click('Assets');
  await click('Savings Account');
  await page.getByRole('textbox', { name: 'Amount in dollars' }).fill('250.00');
  await confirm('Deposit', 'Savings Deposit');
  const afterDeposit = await read();
  assert.equal(afterDeposit.wealth.savings, 25000);
  assert.equal(afterDeposit.character.bank, initial.character.bank - 25000);
  assert.equal(estate(afterDeposit).total, estate(initial).total);
  await page.reload();
  await page.getByText('Savings balance', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Amount in dollars' }).fill('25.00');
  await confirm('Withdraw', 'Savings Withdrawal');
  assert.equal((await read()).wealth.savings, 22500);

  await click('Back to Assets');
  await click('Loans & Debts');
  await confirm('Apply for $50.00', 'Personal Loan Offer');
  await page.getByRole('heading', { name: 'Fixed-Rate Loan Offer' }).waitFor();
  await confirm('Accept Loan Offer', 'Personal Loan Accepted');
  const loan = (await read()).wealth.loans[0];
  assert.equal(loan.principal, 5000);
  assert.equal(loan.balance, 5000);
  assert.ok(loan.rate > 0);
  await confirm('Repay in Full', 'Personal Loan Repaid');
  assert.equal((await read()).wealth.loans[0].status, 'paid');

  await click('Back to Assets');
  await click('Properties');
  await click('Cedar Starter House');
  assert.ok(await button('Sell Property').isDisabled());
  assert.ok(await button('Offer for Rent').isDisabled());
  await click('Back to Properties');
  await click('Back to Assets');
  await click('Investments');
  await click('Veyra Market Index Fund');
  await confirm('Buy 1 unit', 'Investment Purchased');
  const position = (await read()).wealth.portfolio['veyra-index'];
  assert.equal(position.units, 1);
  assert.ok(position.basis > 0);
  await page.reload();
  await page.getByText('Cost basis', { exact: true }).waitFor();
  await confirm('Sell 1 unit', 'Investment Sold');
  assert.ok((await read()).wealth.portfolio['veyra-index'].realized < 0);
  await click('Back to Investments');
  await click('Back to Assets');
  await click('Transaction History');
  await page.getByText('Personal loan funds received', { exact: true }).waitFor();
  await click('Back to Assets');
  await click('Close Assets');
  await click('Life Menu');
  await click('Main Menu');
  await click('Saved Lives');

  const downloadEvent = page.waitForEvent('download');
  await click(`Export ${name}’s life`);
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /\.json$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  const exported = importPortableLife(buffer.toString('utf8'));
  assert.deepEqual(exported, await read());
  const picker = page.locator('input[type=file]');
  await picker.setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await page.getByText('This file is not valid Mortal save JSON.', { exact: true }).waitFor();
  assert.equal(await page.locator('.save-row').count(), 1);
  await picker.setInputFiles({ name: 'copy.json', mimeType: 'application/json', buffer });
  await page.getByText('Life imported into a new slot.', { exact: true }).waitFor();
  assert.equal(await page.locator('.save-row').count(), 2);
  assert.deepEqual(await read(), exported);
  await page.locator('.save-row').first().getByRole('button', { name: 'Open', exact: true }).click();
  await page.getByRole('heading', { name: 'Life Journal' }).waitFor();
  const copyId = new URL(page.url()).hash.split('/')[1];
  assert.match(copyId, /^import-/);
  assert.deepEqual(JSON.parse((await page.evaluate(saveSlot, { id: copyId })).payload), exported);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 780 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  }
  assert.deepEqual(errors, []);
  console.log('Wealth, banking, asset protections, investment accounting and portable saves passed in Chromium.');
} finally {
  await browser.close();
}
