import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { activeRomance } from '../src/engine/love.ts';
import { makeNpc } from '../src/engine/npcs.ts';
import { advance } from '../src/engine/simulation.ts';
import { acknowledgeEvents, saveSlot, startBrowser, url } from './browserTestSupport.mjs';

function scenario() {
  for (let seed = 1; seed < 240; seed++) {
    const life = createLife(seed);
    life.character.age = 25;
    life.year += 25;
    for (const parent of life.family) parent.age += 25;
    postTransaction(life, 'Savings', 120000, 'other');
    const id = `library-${life.year}`;
    const friend = { ...makeNpc(life, id, 25, 'Acquaintance', 'Casey Books'), role: 'Friend', friend: true, hobby: 'playing chess' };
    Object.assign(friend.bond, { affection: 96, trust: 97, familiarity: 93, compatibility: 96, resentment: 0 });
    life.communityFriends.push(friend);
    const payload = JSON.stringify({ ...life, version: 6, social: undefined });
    let test = decodeLife(payload);
    test = advance(test, { type: 'meet', source: 'app' }).life;
    test = advance(test, { type: 'romance', person: id, action: 'ask' }).life;
    if (activeRomance(test)?.status !== 'dating') continue;
    test = advance(test, { type: 'age' }).life;
    if (test.pending) test = advance(test, { type: 'choose', event: test.pending, choice: eventById.get(test.pending).choices[0].id }).life;
    if (activeRomance(test)?.status !== 'engaged') test = advance(test, { type: 'romance', person: id, action: 'propose' }).life;
    if (!test || activeRomance(test)?.status !== 'engaged') continue;
    test = advance(test, { type: 'wedding', person: id, plan: 'civil' }).life;
    test = advance(test, { type: 'plan-child', person: id, method: 'adoption' }).life;
    if (test?.social.people.some(({ role }) => role === 'Child')) return { life, payload, friend };
  }
  throw new Error('No deterministic social scenario was found.');
}

const browser = await startBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const heading = (name) => page.getByRole('heading', { name, exact: true });
  const dialog = (name) => page.getByRole('dialog', { name, exact: true });
  const click = (name) => button(name).click();
  const slot = 'social-v6-test';
  const read = async () => JSON.parse((await page.evaluate(saveSlot, { id: slot })).payload);
  const { payload, life, friend } = scenario();

  await page.goto(url);
  await button('New Life').waitFor();
  await page.evaluate(saveSlot, { id: slot, entry: { id: slot, name: `${life.character.firstName} ${life.character.lastName}`,
    city: life.character.city, age: 25, year: life.year, completed: false, revision: 0, updatedAt: Date.now(), payload } });
  await page.goto(new URL(`#play/${slot}/journal`, url).href);
  await click('Family');
  await click('Open Love Life');
  await click('Dating App');
  await dialog('Someone New').waitFor();
  await acknowledgeEvents(page);
  assert.equal((await read()).version, 10);
  await click('Ask Someone Out');
  await heading('Dating Profiles').waitFor();
  await page.getByText(/compatibility/).first().waitFor();
  await click(friend.name);
  await click('Ask on a Date');
  await dialog('A First Date').waitFor();
  await page.reload();
  await dialog('A First Date').waitFor();
  await acknowledgeEvents(page);
  await click('Back to Relationships');
  await click('Close Relationships');
  await click('Age Up');
  await page.locator('.profile-identity p').filter({ hasText: 'Age 26 ·' }).waitFor();
  await acknowledgeEvents(page, true);
  await click('Family');
  await click('Open Love Life');
  await click(friend.name);
  if ((await read()).social.romances.find(({ person }) => person === friend.id).status === 'dating') {
    await click('Propose Marriage');
    await dialog('Engaged').waitFor();
    await acknowledgeEvents(page);
  }
  await click('Civil Ceremony');
  await dialog('Wedding Day').waitFor();
  await acknowledgeEvents(page);
  await click('Discuss Adoption');
  await dialog('Adoption Day').waitFor();
  await acknowledgeEvents(page);
  const child = (await read()).social.people.find(({ role }) => role === 'Child');
  await click('Back to Relationships');
  await click('Family Tree');
  await heading('Children').waitFor();
  await click(child.name);
  await click('Read Together');
  await dialog('Read Together').getByRole('progressbar', { name: 'Trust' }).waitFor();
  await acknowledgeEvents(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await click(child.name);
  await dialog('Character Profile').getByText('Personality', { exact: true }).waitFor();
  await dialog('Character Profile').getByText('Parents', { exact: true }).waitFor();
  await click('Close Character Profile');
  await click('Back to Relationships');
  await click(friend.name);
  await click('Divorce');
  await dialog('Divorce').waitFor();
  await acknowledgeEvents(page);
  await click('Back to Relationships');
  await heading('Former Relationships').waitFor();
  const saved = await read();
  assert.equal(saved.social.romances.find(({ person }) => person === friend.id).status, 'divorced');
  assert.deepEqual(saved.social.parents[child.id], ['self', friend.id]);
  assert.equal(saved.communityFriends.filter(({ id }) => id === friend.id).length, 1);
  assert.equal(saved.character.bank, saved.transactions.reduce((sum, { amount }) => sum + amount, 0));

  await click('Close Relationships');
  await page.setViewportSize({ width: 320, height: 740 });
  await click('Activities');
  const sections = await page.locator('.play-group h2').allTextContents();
  assert.deepEqual(sections.slice(0, 4), ['Love', 'Healthcare', 'Appearance', 'Wellbeing']);
  assert.equal(await button('Take a Walk').count(), 0);
  await click('Mind & Body');
  await heading('Mind & Body').waitFor();
  for (const label of ['Take a Walk', 'Rest', 'Exercise', 'Eat a Balanced Meal', 'Meditate']) await button(label).waitFor();
  await click('Back to Activities');
  await click('Love');
  await heading('Love').waitFor();
  for (const label of ['Spotlight Dating', 'Find a Date', 'Dating App', 'LGBTQ+ Dating', 'Casual Date', 'Matchmaking']) await button(label).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await click('Find a Date');
  await dialog('Dating Match').waitFor();
  await page.reload();
  await dialog('Dating Match').waitFor();
  await click('Start Dating');
  await dialog('Dating Now').waitFor();
  await acknowledgeEvents(page);
  await click('Back to Activities');
  await click('Close Activities');

  async function ageUp() {
    const nextAge = (await read()).character.age + 1;
    // A second Age Up within 350 ms of the last save is ignored.
    await page.waitForTimeout(350);
    await click('Age Up');
    await page.locator('.profile-identity p').filter({ hasText: `Age ${nextAge} ·` }).waitFor();
    return read();
  }

  await ageUp();
  await acknowledgeEvents(page, true);
  await click('Activities');
  await click('Love');
  await click('LGBTQ+ Dating');
  await dialog('Dating Match').waitFor();
  await click('Start Dating');
  await dialog('Dating Now').waitFor();
  await acknowledgeEvents(page);
  await click('Back to Activities');
  await click('Close Activities');
  await click('Family');
  await click('Open Love Life');
  await heading('Current Partners').waitFor();
  const partners = (await read()).social.romances.filter(({ status }) => status === 'dating');
  assert.equal(partners.length, 2);
  await click('Back to Relationships');
  await click('Close Relationships');

  let discoverer;
  for (let turn = 0; turn < 20; turn++) {
    const next = await ageUp();
    if (next.pending === 'social-affair') {
      discoverer = next.social.pendingPerson;
      break;
    }
    await acknowledgeEvents(page, true);
  }
  assert.ok(discoverer);
  const caught = dialog('Caught Dating');
  await caught.waitFor();
  const story = await caught.locator('.event-story').textContent();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await caught.getByText(story, { exact: true }).waitFor();
  assert.equal((await read()).social.pendingPerson, discoverer);
  await click('Take Responsibility');
  await caught.waitFor({ state: 'hidden' });
  const notices = (await read()).notices;
  const resultIndex = notices.findIndex(({ title }) => title === 'Relationship Ended');
  assert.ok(resultIndex >= 0);
  for (const { entry } of notices.slice(0, resultIndex)) {
    const earlier = page.locator(`dialog[data-life-event="notice-${entry}"]`);
    await earlier.getByRole('button', { name: 'Continue', exact: true }).click();
  }
  await dialog('Relationship Ended').waitFor();
  await acknowledgeEvents(page);
  const afterDiscovery = (await read()).social.romances;
  assert.equal(afterDiscovery.find(({ person }) => person === discoverer).status, 'broken-up');
  assert.equal(afterDiscovery.filter(({ ended, status }) => ended === null && ['dating', 'engaged'].includes(status)).length, 1);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('Social smoke passed at 320px and 390px: migration, family progression, Activities navigation, multiple partners and discovery after reload.');
} finally {
  await browser.close();
}
