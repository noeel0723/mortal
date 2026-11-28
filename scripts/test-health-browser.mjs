import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { doctors } from '../src/data/doctors.ts';
import { createLife } from '../src/engine/create.ts';
import { startIllness } from '../src/engine/health.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { advance } from '../src/engine/simulation.ts';
import { newWorld } from '../src/engine/world.ts';
import { portraitSrc } from '../src/portraits/portrait.ts';
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
  await page.keyboard.press('Escape');
  const reproductiveAdult = atAge(27);
  reproductiveAdult.character.gender = 'woman';
  postTransaction(reproductiveAdult, 'Savings', 12000, 'other');
  reproductiveAdult.reproductive = { self: { cases: { chlamydia: { year: reproductiveAdult.year } } } };
  await open('health-reproductive', reproductiveAdult);
  await button('Activities').click();
  await button('Doctors').click();
  await button('STI Screening').click();
  await dialog('STI Screening').getByRole('button', { name: 'Get Screened', exact: true }).click();
  await dialog('Screening Results').getByText(/detected Chlamydia/).waitFor();
  await page.reload();
  await dialog('Screening Results').waitFor();
  await acknowledgeEvents(page);
  await button('STI Treatment').click();
  await dialog('STI Treatment').getByRole('button', { name: 'Start Treatment', exact: true }).click();
  await dialog('STI Treatment').getByText(/infection cleared/).waitFor();
  await acknowledgeEvents(page);
  await button('Hepatitis B Vaccination').click();
  await dialog('Hepatitis B Vaccination').getByRole('button', { name: 'Complete Vaccination', exact: true }).click();
  await dialog('Hepatitis B Vaccination').getByText(/I completed the clinic/).waitFor();
  await acknowledgeEvents(page);
  await button('Birth Control Plan').click();
  await dialog('Birth Control Plan').getByRole('button', { name: 'Start Birth Control', exact: true }).click();
  await dialog('Birth Control Plan').getByText(/lowers the chance of pregnancy/).waitFor();
  await acknowledgeEvents(page);
  const reproductiveSave = JSON.parse((await page.evaluate(saveSlot, { id: 'health-reproductive' })).payload);
  assert.deepEqual(reproductiveSave.reproductive.self, { cases: {}, vaccinated: true, birthControlYear: reproductiveSave.year });
  assert.equal(reproductiveSave.transactions.filter(({ category }) => category === 'medical').length, 4);
  await page.setViewportSize({ width: 320, height: 740 });
  const loss = atAge(18);
  const lovedOne = loss.family[0];
  Object.assign(lovedOne, { age: 74, health: 0, city: loss.character.city });
  const next = advance(loss, { type: 'age' }).life;
  assert.ok(next);
  const noticed = next.pending ? advance(next, { type: 'choose', event: next.pending, choice: eventById.get(next.pending).choices[0].id }).life : next;
  await open('health-death', noticed);
  const death = dialog('Death');
  await death.waitFor();
  await page.reload();
  const portrait = death.getByRole('img', { name: `Portrait of ${lovedOne.name}` });
  await portrait.waitFor();
  assert.equal(await portrait.getAttribute('src'), portraitSrc(lovedOne.appearance, 75));
  await death.getByText('Declining health', { exact: true }).waitFor();
  assert.equal(await death.getByRole('button').count(), 3);
  const deathBounds = await death.boundingBox();
  assert.ok(deathBounds && deathBounds.width < 320 && deathBounds.height < 500);
  if (process.env.MORTAL_CAPTURE_EVENT_DIALOGS) await page.screenshot({ path: '.expo/web-qa/death-dialog.png' });
  await button('Attend Funeral').click();
  await death.waitFor({ state: 'hidden' });
  await page.getByText(/I attended .* funeral and shared a memory/).waitFor();

  const finalLife = createLife(15);
  finalLife.character.age = 114;
  finalLife.year += 114;
  finalLife.world = newWorld(finalLife.seed, finalLife.year, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await open('health-player-death', finalLife);
  await button('Age Up').click();
  await dialog('I Fell Ill').getByRole('button', { name: 'Continue', exact: true }).click();
  const end = dialog('End of Life');
  const name = `${finalLife.character.firstName} ${finalLife.character.lastName}`;
  await end.getByRole('img', { name: `Portrait of ${name}` }).waitFor();
  assert.equal(await end.getByRole('img').getAttribute('src'), portraitSrc(finalLife.character.appearance, 115));
  await end.getByRole('button', { name: 'View Life Summary', exact: true }).click();
  await page.getByRole('heading', { name: 'Life Summary' }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Health, death choices, and NPC and player portraits passed at 320px and 390px.');
} finally {
  await browser.close();
}
