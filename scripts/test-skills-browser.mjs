import assert from 'node:assert/strict';
import { createLife } from '../src/engine/create.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { acknowledgeEvents, saveSlot, startBrowser, url } from './browserTestSupport.mjs';

const browser = await startBrowser();
const id = 'skills-browser-test';
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const click = (name) => button(name).click();
  const read = async () => JSON.parse((await page.evaluate(saveSlot, { id })).payload);
  const group = (name) => page.locator('.play-group').filter({ has: page.getByRole('heading', { name, exact: true }) });
  const ready = () => page.getByRole('heading', { name: 'Life Journal', exact: true }).waitFor();

  await page.goto(url);
  await button('New Life').waitFor();
  const fixture = createLife(612);
  fixture.character.age = 12;
  fixture.year += 12;
  postTransaction(fixture, 'Savings', 10000, 'other');
  const { firstName, lastName, city, age } = fixture.character;
  await page.evaluate(saveSlot, { id, entry: { id, name: `${firstName} ${lastName}`, city, age, year: fixture.year,
    completed: false, revision: 0, updatedAt: Date.now(), payload: JSON.stringify(fixture) } });
  await page.goto(new URL(`#play/${id}/journal`, url).href);
  await ready();
  await click('Activities');
  await click('Knowledge & Learning');
  await click('Programming');
  const proficiency = page.getByRole('progressbar', { name: 'Proficiency', exact: true });
  assert.equal(await proficiency.getAttribute('value'), '0');
  assert.equal(await page.getByText('Natural aptitude', { exact: true }).count(), 0);
  await click('Take a Course');
  const course = page.getByRole('dialog', { name: 'Course Completed', exact: true });
  const first = Number(await course.getByRole('progressbar', { name: 'Programming', exact: true }).getAttribute('value'));
  assert.ok(first > 0);
  await page.reload();
  await course.waitFor();
  assert.equal(Number(await course.getByRole('progressbar', { name: 'Programming', exact: true }).getAttribute('value')), first);
  assert.equal((await read()).transactions.filter(({ category }) => category === 'training').length, 1);
  await acknowledgeEvents(page);
  assert.equal(Number(await proficiency.getAttribute('value')), first);

  for (let session = 1; session < 5; session++) {
    await click('Self Practice');
    await page.locator('dialog[data-life-event][open]').waitFor();
    await acknowledgeEvents(page);
  }
  assert.ok(await button('Self Practice').isDisabled());
  await click('Add as Hobby');
  await button('Remove Hobby').waitFor();
  await click('Back to Knowledge & Learning');
  await click('Back to Activities');
  await click('Rest');
  await page.getByRole('dialog', { name: 'Time to Rest' }).waitFor();
  await acknowledgeEvents(page);
  await click('Close Activities');
  await click('Details');
  await click('My Skills');
  await group('My Hobbies').getByRole('button', { name: 'Programming', exact: true }).click();
  assert.ok(await button('Self Practice').isDisabled());
  assert.equal((await read()).skills.entries.programming.sessions, 5);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await click('Back to My Skills');
  await click('Back to Life Statistics');
  await click('Close Life Statistics');
  await click('Age Up');
  await page.locator('.profile-identity p').filter({ hasText: 'Age 13 ·' }).waitFor();
  await acknowledgeEvents(page, true);
  await click('Activities');
  await click('Knowledge & Learning');
  await click('Programming');
  assert.equal(await button('Self Practice').isDisabled(), false);
  assert.equal((await read()).skills.entries.programming.sessions, 5);
  assert.deepEqual(errors, []);
  console.log('Skills smoke passed at 320px and 390px: course fee, persisted result, annual training limits, hobby, statistics and Age Up.');
} finally {
  await browser.close();
}
