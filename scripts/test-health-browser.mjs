import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { doctors } from '../src/data/doctors.ts';
import { createLife } from '../src/engine/create.ts';
import { startIllness } from '../src/engine/health.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { advance } from '../src/engine/simulation.ts';
import { acknowledgeEvents, saveSlot, startBrowser, url } from './browserTestSupport.mjs';

function atAge(age) {
  let life = createLife(4);
  while (life.character.age < age || life.pending) {
    const action = life.pending ? { type: 'choose', event: life.pending,
      choice: eventById.get(life.pending).choices[0].id } : { type: 'age' };
    const result = advance(life, action);
    assert.ok(result.life, result.error);
    life = result.life;
  }
  return { ...life, notices: [], illnesses: [] };
}

const browser = await startBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true });
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const button = (name) => page.getByRole('button', { name, exact: true });
  const dialog = (name) => page.getByRole('dialog', { name, exact: true });

  async function open(id, life) {
    const { firstName, lastName, city, age } = life.character;
    await page.evaluate(saveSlot, { id, entry: { id, name: `${firstName} ${lastName}`, city, age,
      year: life.year, completed: false, revision: 0, updatedAt: Date.now(), payload: JSON.stringify(life) } });
    await page.goto(new URL(`#play/${id}/journal`, url).href);
    await page.getByRole('heading', { name: 'Life Journal' }).waitFor();
  }

  await page.goto(url);
  await button('New Life').waitFor();
  await open('health-child', atAge(0));
  await button('Age Up').click();
  await dialog('First Steps').waitFor();
  await page.reload();
  const first = dialog('First Steps');
  await first.getByRole('button', { name: 'Continue', exact: true }).waitFor();
  const bounds = await first.boundingBox();
  const frame = await page.locator('.mortal-frame').boundingBox();
  assert.ok(bounds && frame && bounds.width < frame.width && bounds.height < frame.height);
  await acknowledgeEvents(page);
  await page.getByText('I took my first steps across the living room.', { exact: true }).waitFor();
  assert.equal(JSON.parse((await page.evaluate(saveSlot, { id: 'health-child' })).payload).notices.length, 0);
  await button('Activities').click();
  await button('Doctors').click();
  await button('Doctor').click();
  const roster = dialog('Doctor');
  await roster.getByText('You and your family and friends have no active illnesses.').waitFor();
  assert.equal(await roster.getByRole('progressbar', { name: 'Reputation' }).count(), 3);
  assert.ok(await roster.getByRole('button', { name: /^Dr\./ }).first().isDisabled());
  await page.keyboard.press('Escape');

  await open('health-choice', atAge(5));
  await button('Age Up').click();
  const classroom = dialog('First Classroom');
  await classroom.waitFor();
  await page.keyboard.press('Escape');
  assert.ok(await classroom.isVisible());
  assert.equal(await classroom.getByRole('button', { name: 'Continue', exact: true }).count(), 0);
  await acknowledgeEvents(page, true);
  await classroom.waitFor({ state: 'hidden' });

  const adult = atAge(18);
  const parent = adult.family[0];
  adult.random = 0;
  adult.character.attributes.stress = 42;
  postTransaction(adult, 'Earned wages', 4200, 'salary');
  startIllness(adult, 'pneumonia');
  startIllness(adult, 'cold', parent);
  await open('health-adult', adult);
  await dialog('I Fell Ill').waitFor();
  await acknowledgeEvents(page);
  await button('Activities').click();
  await button('Doctors').click();
  await page.getByRole('heading', { name: 'Doctors' }).waitFor();
  await button('Emergency Room').click();
  const emergency = dialog('Emergency Room');
  await emergency.getByText('Pneumonia · Severe', { exact: true }).waitFor();
  await emergency.getByText('100% treatment success', { exact: true }).waitFor();
  await emergency.getByRole('button', { name: 'Close Emergency Room' }).click();
  await button('Optometrist').click();
  await dialog('Optometrist').getByText('No patient has active eye strain.').waitFor();
  await page.keyboard.press('Escape');
  await button('Psychiatrist').click();
  await dialog('Psychiatrist').getByRole('button', { name: 'Book Session' }).getByText('$4.00').waitFor();
  await page.keyboard.press('Escape');
  await button('Donate Blood').click();
  await dialog('Donate Blood').getByText('You need at least 65% health and no active illness.').waitFor();
  await page.keyboard.press('Escape');
  await button('Donate Plasma').click();
  await dialog('Donate Plasma').getByText('The first plasma donation each year pays $4.00.').waitFor();
  await page.keyboard.press('Escape');

  await button('Doctor').click();
  const clinic = dialog('Doctor');
  await clinic.getByText('Pneumonia · Severe', { exact: true }).waitFor();
  const names = doctors.map((doctor) => doctor.names[adult.character.city]);
  for (const [index, [fee, chance]] of [['$16.00', '54%'], ['$24.00', '69%'], ['$32.00', '80%']].entries()) {
    const option = clinic.locator('.healthcare-option').filter({ has: button(names[index]) });
    await option.getByText(fee, { exact: true }).waitFor();
    await option.getByText(`${chance} treatment success`, { exact: true }).waitFor();
    assert.equal(await option.getByRole('progressbar', { name: 'Reputation' }).getAttribute('value'), String(doctors[index].reputation));
  }
  const clinicBounds = await clinic.boundingBox();
  assert.ok(clinicBounds && frame && clinicBounds.width < frame.width && clinicBounds.height <= frame.height);
  await page.setViewportSize({ width: 390, height: 844 });
  await clinic.getByRole('button', { name: names[1], exact: true }).click();
  await dialog('Doctor Visit').getByText(/improved to moderate/).waitFor();
  await acknowledgeEvents(page);
  await button('Doctor').click();
  await clinic.getByText('Pneumonia · Moderate', { exact: true }).waitFor();
  assert.ok(await clinic.getByRole('button', { name: names[0], exact: true }).isEnabled());
  await clinic.getByRole('combobox', { name: 'Patient' }).selectOption(parent.id);
  await clinic.getByText('Common cold · Mild', { exact: true }).waitFor();
  await clinic.getByRole('button', { name: names[0], exact: true }).click();
  await dialog('Doctor Visit').getByText(`I took ${parent.name} to ${names[0]}. The illness cleared after the visit.`).waitFor();
  await page.reload();
  await dialog('Doctor Visit').waitFor();
  await acknowledgeEvents(page);
  await button('Doctor').click();
  await clinic.getByText('Pneumonia · Moderate', { exact: true }).waitFor();
  assert.equal(await clinic.getByRole('combobox', { name: 'Patient' }).count(), 0);
  const saved = JSON.parse((await page.evaluate(saveSlot, { id: 'health-adult' })).payload);
  assert.deepEqual(saved.transactions.filter(({ category }) => category === 'medical').map(({ amount }) => amount), [-2400, -250]);
  assert.equal(saved.character.bank, adult.character.bank - 2650);
  assert.deepEqual(errors, []);
  console.log('Health and event popups passed at 320px and 390px, including treatment, ledger, and reload.');
} finally {
  await browser.close();
}
