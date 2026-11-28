import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { createLife } from '../src/engine/create.ts';
import { incomeTax } from '../src/engine/finance.ts';
import { advance } from '../src/engine/simulation.ts';
import { acknowledgeEvents, saveSlot, startBrowser, url } from './browserTestSupport.mjs';

const slotId = 'career-browser-test';

function olderStudent() {
  let life = createLife(4);
  while (life.character.age < 17 || life.pending) {
    const action = life.pending ?
      { type: 'choose', event: life.pending, choice: eventById.get(life.pending).choices[0].id } : { type: 'age' };
    const result = advance(life, action);
    assert.ok(result.life, result.error);
    life = result.life;
  }
  Object.assign(life.character.attributes, { smarts: 95, discipline: 95, charisma: 95, health: 95 });
  return { ...life, version: 3, career: undefined, finance: undefined, illnesses: undefined, notices: undefined };
}

const browser = await startBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(12000);
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const click = (name) => button(name).click();
  const read = async () => JSON.parse((await page.evaluate(saveSlot, { id: slotId })).payload);
  const details = page.getByRole('dialog', { name: 'Career Details' });

  await page.goto(url);
  await button('New Life').waitFor();
  const old = olderStudent();
  const { firstName, lastName, city, age, appearance } = old.character;
  await page.evaluate(saveSlot, { id: slotId, entry: {
    id: slotId, name: `${firstName} ${lastName}`, city, age, year: old.year, completed: false,
    revision: 0, updatedAt: Date.now(), payload: JSON.stringify(old),
  } });
  await page.reload();
  await click('Continue Life');
  await click('Age Up');
  await click('Enter the Workforce');
  await page.locator('dialog[data-life-event="decision-graduation-plan"]').waitFor({ state: 'hidden' });
  await acknowledgeEvents(page);
  const migrated = await read();
  assert.equal(migrated.version, 11);
  assert.deepEqual(migrated.character.appearance, appearance);
  assert.ok(migrated.academic.qualifications.some(({ level }) => level === 'high-school'));
  await click('Career');
  await click('Job seeker');
  await details.getByText('Highest qualification', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await details.waitFor({ state: 'hidden' });
  await click('Find a Job');
  await page.getByRole('searchbox', { name: 'Search by title' }).fill('Records Clerk');
  await page.getByRole('combobox', { name: 'Industry', exact: true }).selectOption('Administration');
  await page.getByRole('combobox', { name: 'Employment type', exact: true }).selectOption('part-time');
  assert.equal(await button('Records Clerk').locator('.play-row-icon .emoji').textContent(), '🗃️');
  await click('Records Clerk');
  await page.getByText('high-school', { exact: true }).waitFor();
  await click('Apply for Job');
  await page.getByRole('dialog', { name: 'Job Offer' }).waitFor();
  await acknowledgeEvents(page);
  await click('Accept Offer');
  await button('Records Clerk').waitFor();
  assert.equal(await page.getByText('Annual gross salary', { exact: true }).count(), 0);
  await click('Records Clerk');
  await details.getByText('Annual gross salary', { exact: true }).waitFor();
  await details.getByRole('progressbar', { name: 'Job security', exact: true }).waitFor();
  await page.reload();
  await details.getByText('Part-time employee', { exact: true }).waitFor();
  await click('Close Career Details');
  await details.waitFor({ state: 'hidden' });
  let life = await read();
  assert.equal(life.career.current.jobId, 'records-clerk');
  const groups = page.locator('.play-group');
  const actions = groups.filter({ has: page.getByRole('heading', { name: 'Career Actions', exact: true }) });
  const navigation = groups.filter({ has: page.getByRole('heading', { name: 'Career Navigation', exact: true }) });
  await actions.getByRole('button', { name: 'Work Harder', exact: true }).waitFor();
  for (const name of ['Find a Job', 'Career History', 'View Education']) {
    assert.equal(await actions.getByRole('button', { name, exact: true }).count(), 0);
    assert.equal(await navigation.getByRole('button', { name, exact: true }).count(), 1);
  }
  assert.ok(!life.transactions.some(({ category }) => category === 'salary'));
  const gross = life.career.current.salary;
  const performance = life.career.current.performance;
  await click('Work Harder');
  await page.getByText('Already done this year.', { exact: true }).waitFor();
  assert.ok((await read()).career.current.performance > performance);
  await click('Co-workers');
  const coworkersUrl = page.url();
  const relationshipsUrl = new URL(`#play/${slotId}/relationships`, url).href;
  const openRelationships = async () => {
    await page.goto(relationshipsUrl);
    await page.getByRole('heading', { name: 'Relationships', exact: true }).waitFor();
  };
  const colleague = page.locator('button.play-row').filter({ hasText: 'Co-worker ·' }).first();
  const coworkerName = await colleague.locator('strong').textContent();
  const savedSlot = await page.evaluate(saveSlot, { id: slotId });
  const workplaceFixture = JSON.parse(savedSlot.payload);
  const coworker = workplaceFixture.career.contacts.find(({ name }) => name === coworkerName);
  Object.assign(coworker.bond, { affection: 67, trust: 92, respect: 89, familiarity: 90, compatibility: 94, resentment: 0 });
  workplaceFixture.character.attributes.stress = 0;
  await page.evaluate(saveSlot, { id: slotId, entry: { ...savedSlot, payload: JSON.stringify(workplaceFixture) } });
  await page.reload();
  await colleague.waitFor();
  await openRelationships();
  assert.equal(await button(coworkerName).count(), 0);
  await page.goto(coworkersUrl);
  await colleague.click();
  assert.ok(await button('Become Friends').isDisabled());
  await click('Have a Conversation');
  const conversation = page.getByRole('dialog', { name: 'A Conversation' });
  const afterConversation = Number(await conversation.getByRole('progressbar', { name: 'Affection' }).getAttribute('value'));
  assert.ok(afterConversation > 67 && afterConversation <= 70);
  await acknowledgeEvents(page);
  assert.ok(await button('Have a Conversation').isEnabled());
  assert.ok(await button('Become Friends').isDisabled());
  assert.ok((await read()).journal.at(-1).text.startsWith(`I talked with ${coworkerName} about`));
  await click('Spend Time Together');
  await page.getByRole('dialog', { name: 'Time Together' }).waitFor();
  await acknowledgeEvents(page);
  assert.ok(await button('Spend Time Together').isEnabled());
  assert.ok((await read()).journal.at(-1).text.includes(coworkerName));
  await openRelationships();
  const acquaintances = groups.filter({ has: page.getByRole('heading', { name: 'Acquaintances', exact: true }) });
  await acquaintances.getByRole('button', { name: coworkerName, exact: true }).getByText('Acquaintance', { exact: true }).waitFor();
  await click(coworkerName);
  const affectionBeforeFriendship = (await read()).career.contacts.find(({ id }) => id === coworker.id).bond.affection;
  await click('Become Friends');
  const friendship = page.getByRole('dialog', { name: 'A New Friend' });
  assert.equal(Number(await friendship.getByRole('progressbar', { name: 'Affection' }).getAttribute('value')), affectionBeforeFriendship);
  await acknowledgeEvents(page);
  await openRelationships();
  const friends = groups.filter({ has: page.getByRole('heading', { name: 'Friends', exact: true }) });
  await friends.getByRole('button', { name: coworkerName, exact: true }).waitFor();
  assert.equal(await acquaintances.getByRole('button', { name: coworkerName, exact: true }).count(), 0);
  assert.equal((await read()).career.contacts.find(({ id }) => id === coworker.id).bond.affection, affectionBeforeFriendship);
  await page.goto(coworkersUrl);
  await click(coworkerName);
  await click('Give a Compliment');
  const compliment = page.getByRole('dialog', { name: 'A Kind Word' });
  await compliment.getByText(new RegExp(coworkerName)).waitFor();
  const complimentAffinity = await compliment.getByRole('progressbar', { name: 'Affection' }).getAttribute('value');
  await page.reload();
  await compliment.waitFor();
  assert.equal(await compliment.getByRole('progressbar', { name: 'Affection' }).getAttribute('value'), complimentAffinity);
  await acknowledgeEvents(page);
  for (const [label, title] of [['Discuss Work', 'A Work Discussion'], ['Insult', 'Words That Hurt'], ['Mess With', 'A Joke Gone Wrong']]) {
    await click(label);
    await page.getByRole('dialog', { name: title }).waitFor();
    await acknowledgeEvents(page);
  }
  const knownWorkplace = (await read()).career.contacts.map(({ id }) => id);
  await click('Back to Co-workers');
  await click('Back to Career');
  await click('Close Career');
  await click('Age Up');
  await page.locator('.profile-identity p').filter({ hasText: 'Age 19 ·' }).waitFor();
  await acknowledgeEvents(page, true);
  life = await read();
  assert.deepEqual(life.transactions.filter(({ category }) => category === 'salary').map(({ amount }) => amount), [gross]);
  assert.equal(life.transactions.find(({ category }) => category === 'tax').amount, -incomeTax(gross));
  assert.equal(life.character.bank, life.transactions.reduce((sum, entry) => sum + entry.amount, 0));
  await click('Assets');
  await click('Finances');
  await page.getByText('Net savings', { exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Transaction year', exact: true }).selectOption('');
  await page.getByText('I paid income tax on the year’s salary.', { exact: true }).waitFor();
  await click('Back to Assets');
  await click('Close Assets');
  await click('Career');
  await page.reload();
  await button('Records Clerk').waitFor();
  assert.deepEqual((await read()).career.contacts.map(({ id }) => id), knownWorkplace);
  await page.setViewportSize({ width: 320, height: 740 });
  await click('Records Clerk');
  await details.waitFor();
  const dialog = await details.boundingBox();
  const frame = await page.locator('.mortal-frame').boundingBox();
  assert.ok(dialog && frame && dialog.width < frame.width && dialog.height < frame.height);
  await click('Close Career Details');
  await click('Career History');
  await page.getByText('Lifetime gross earnings', { exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);
  assert.deepEqual(failures, []);
  console.log('Career smoke passed: V3 migration, diploma, job filters, hiring, workplace interactions, payroll, and reload.');
} finally {
  await browser.close();
}
