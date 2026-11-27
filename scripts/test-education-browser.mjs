import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { createLife } from '../src/engine/create.ts';
import { currentClass } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import { saveSlot, startBrowser, url } from './browserTestSupport.mjs';
const slotId = 'education-browser-test';

function act(life, action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function olderSave() {
  let life = createLife(4);
  for (let age = 1; age <= 17; age++) {
    life = act(life, { type: 'age' });
    if (life.pending) {
      life = act(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending).choices[0].id });
    }
    if (age >= 6) life = act(life, { type: 'activity', activity: 'study' });
    if (age === 6) life = act(life, { type: 'befriend', person: currentClass(life).find(({ role }) => role === 'Classmate').id });
  }
  return { ...life, academic: undefined, career: undefined, finance: undefined, version: 1 };
}

const browser = await startBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const heading = (name) => page.getByRole('heading', { name, exact: true });
  const read = async () => JSON.parse((await page.evaluate(saveSlot, { id: slotId })).payload);
  const click = (name) => button(name).click();

  await page.goto(url);
  await button('New Life').waitFor();
  const legacy = olderSave();
  const { firstName, lastName, city, age } = legacy.character;
  const oldFriend = legacy.schoolContacts.find(({ friend }) => friend);
  await page.evaluate(saveSlot, { id: slotId, entry: {
    id: slotId, name: `${firstName} ${lastName}`, city, age, year: legacy.year, completed: false, revision: 0,
    updatedAt: Date.now(), payload: JSON.stringify(legacy),
  } });
  await page.reload();
  await click('Continue Life');
  await heading('Life Journal').waitFor();
  await click('School');
  await page.getByText('Grade unavailable', { exact: true }).waitFor();
  assert.equal(await page.getByText('Academic year', { exact: true }).count(), 0);
  await click(`${city} High School`);
  const institution = page.getByRole('dialog', { name: 'Institution Details' });
  await institution.getByText('Academic year', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await institution.waitFor({ state: 'hidden' });
  assert.equal((await read()).version, 1);
  await click('Close School');
  await click('Age Up');
  await button('Apply to University').waitFor();
  assert.ok(await button('Age Up').isDisabled());
  await page.reload();
  await button('Apply to University').waitFor();
  const migrated = await read();
  assert.equal(migrated.version, 4);
  assert.equal(migrated.pending, 'graduation-plan');
  assert.equal(migrated.academic.qualifications[0].title, 'High School Diploma');
  assert.equal(migrated.schoolContacts.find(({ friend }) => friend).id, oldFriend.id);
  await click('Apply to University');
  await click('Career');
  await click('View Education');
  await click('Browse Programs');
  await click('Education');
  await click('Apply to Program');
  await click('Apply for Scholarship');
  await click('Enroll in Program');
  await heading('University').waitFor();
  assert.equal(await page.locator('.bottom-nav').count(), 0);
  const frame = await page.locator('.mortal-frame').boundingBox();
  assert.ok(frame && Math.abs(frame.width / frame.height - 9 / 16) < .001);
  assert.equal(await page.getByText('Tuition each year', { exact: true }).count(), 0);
  await click('Bellmere University');
  await institution.getByText('Tuition each year', { exact: true }).waitFor();
  await institution.getByText('Scholarship per year', { exact: true }).waitFor();
  await click('Close Institution Details');
  await click('Class');
  await heading('Professor').waitFor();
  await heading('Students').waitFor();
  await page.locator('button.play-row').filter({ hasText: 'Professor ·' }).click();
  await click('Ask for Academic Help');
  assert.ok(await button('Ask for Academic Help').isDisabled());
  assert.equal(await button('Become Friends').count(), 0);
  await click('Back to Class');
  const student = page.locator('button.play-row').filter({ hasText: 'Student ·' }).first();
  const newFriend = await student.locator('strong').textContent();
  await student.click();
  await click('Become Friends');
  await page.getByText(/^Friend · Age /).waitFor();
  await click('Back to Class');
  await click('Back to University');
  await click('Academic Records');
  await heading('Scholarships').waitFor();
  await page.reload();
  await heading('Academic Records').waitFor();
  assert.equal((await read()).academic.enrollment.programId, 'education');
  await click('Back to University');
  await click('Close University');
  for (let years = 1; years <= 3; years++) {
    await click('Age Up');
    await page.locator('.profile-identity p').filter({ hasText: `Age ${18 + years} ·` }).waitFor();
    const decision = page.locator('.decision button').first();
    if (await decision.count()) await decision.click();
    if (years < 3) await new Promise((resolve) => setTimeout(resolve, 375));
  }
  await click('Family');
  await heading('Friends').waitFor();
  assert.ok(await button(oldFriend.name).isVisible());
  await click(newFriend);
  assert.ok(await button('Hang Out').isVisible());
  assert.equal(await button('View Profile').count(), 0);
  await click(newFriend);
  const profile = page.getByRole('dialog', { name: 'Character Profile' });
  await profile.getByText('Graduate', { exact: true }).waitFor();
  await profile.getByText('Gender identity', { exact: true }).waitFor();
  await click('Close Character Profile');
  await click('Back to Relationships');
  const mother = legacy.family[0].name;
  await click(mother);
  await click('Spend Time Together');
  assert.ok(await button('Spend Time Together').isDisabled());
  assert.equal(await button('Ask for Academic Help').count(), 0);
  await click(mother);
  await profile.getByText('Occupation', { exact: true }).waitFor();
  const graduate = await read();
  const education = graduate.academic.qualifications.at(-1);
  assert.equal(education.title, 'Bachelor of Education');
  assert.equal(education.year, graduate.year);
  assert.equal(graduate.academic.scholarships[0].receivedTotal, 9000);
  assert.equal(graduate.transactions.filter(({ label }) => label.includes('tuition')).length, 3);
  assert.equal(graduate.character.bank, graduate.transactions.reduce((total, { amount }) => total + amount, 0));
  assert.deepEqual(pageErrors, []);
  console.log('Browser education and IndexedDB migration passed.');
} finally {
  await browser.close();
}
