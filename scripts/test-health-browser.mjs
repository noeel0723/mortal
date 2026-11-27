import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
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
  postTransaction(adult, 'Earned wages', 3000, 'salary');
  startIllness(adult, 'pneumonia');
  startIllness(adult, 'cold', parent);
  await page.setViewportSize({ width: 390, height: 844 });
  await open('health-adult', adult);
  await dialog('I Fell Ill').waitFor();
  await acknowledgeEvents(page);
  await button('Activities').click();
  await button('Doctor').click();
  const treatSelf = button('Treat Yourself');
  await treatSelf.getByText('Pneumonia · Severe').waitFor();
  await treatSelf.getByText('$16.00', { exact: true }).waitFor();
  await treatSelf.click();
  await dialog('Doctor Visit').getByText(/improved to moderate/).waitFor();
  await acknowledgeEvents(page);
  assert.ok(await treatSelf.isDisabled());
  await treatSelf.getByText(/Pneumonia · Moderate/).waitFor();
  await button(`Take ${parent.name} to the Doctor`).click();
  await dialog('Doctor Visit').getByText(`I took ${parent.name} to the doctor. The illness cleared after the visit.`).waitFor();
  await page.reload();
  await dialog('Doctor Visit').waitFor();
  await acknowledgeEvents(page);
  assert.equal(await button(`Take ${parent.name} to the Doctor`).count(), 0);
  const saved = JSON.parse((await page.evaluate(saveSlot, { id: 'health-adult' })).payload);
  assert.deepEqual(saved.transactions.filter(({ category }) => category === 'medical').map(({ amount }) => amount), [-1600, -250]);
  assert.equal(saved.character.bank, adult.character.bank - 1850);
  assert.deepEqual(errors, []);
  console.log('Health and event popups passed at 320px and 390px, including treatment, ledger, and reload.');
} finally {
  await browser.close();
}
