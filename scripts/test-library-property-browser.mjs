import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { assetById } from '../src/data/shops.ts';
import { createLife } from '../src/engine/create.ts';
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
  const click = (name) => button(name).click();
  const read = async (id) => JSON.parse((await page.evaluate(saveSlot, { id })).payload);

  async function open(id, life) {
    const { firstName, lastName, city, age } = life.character;
    await page.evaluate(saveSlot, { id, entry: { id, name: `${firstName} ${lastName}`, city, age, year: life.year,
      completed: false, revision: 0, updatedAt: Date.now(), payload: JSON.stringify(life) } });
    await page.goto(new URL(`#play/${id}/journal`, url).href);
    await page.getByRole('heading', { name: 'Life Journal' }).waitFor();
  }

  await page.goto(url);
  await button('New Life').waitFor();
  const reader = atAge(5);
  reader.random = 7;
  reader.character.attributes.energy = 0;
  await open('library-test', reader);
  await click('Activities');
  const social = page.locator('.play-group').filter({ has: page.getByRole('heading', { name: 'Social Activities', exact: true }) });
  const socialLabels = ['Meet a Neighbor', 'Join a Hobby Group', 'Go to Library'];
  for (const name of socialLabels) await social.getByRole('button', { name, exact: true }).waitFor();
  await click('Go to Library');
  await dialog('A Shared Hobby').waitFor();
  const hobbyStory = await dialog('A Shared Hobby').locator('.event-story').textContent();
  await page.reload();
  await dialog('A Shared Hobby').getByText(hobbyStory, { exact: true }).waitFor();
  await click('Become Friends');
  await dialog('A Shared Hobby').waitFor({ state: 'hidden' });
  await dialog('Library Visit').getByText(/I became friends with/).waitFor();
  await acknowledgeEvents(page);
  await click('Go to Library');
  await dialog('Library Visit').getByRole('progressbar', { name: 'Smarts' }).waitFor();
  await acknowledgeEvents(page);
  await click('Mind & Body');
  await click('Take a Walk');
  const walk = dialog('A Walk Outside');
  await walk.getByRole('progressbar', { name: 'Health' }).waitFor();
  const firstWalk = await walk.locator('.event-story').textContent();
  await acknowledgeEvents(page);
  await click('Take a Walk');
  await walk.waitFor();
  assert.notEqual(await walk.locator('.event-story').textContent(), firstWalk);
  await acknowledgeEvents(page);
  await click('Back to Activities');
  await click('Close Activities');
  await click('Family');
  for (const name of socialLabels) assert.equal(await button(name).count(), 0);
  const readingLife = await read('library-test');
  assert.equal(readingLife.character.attributes.energy, 0);
  const friend = readingLife.communityFriends[0];
  await click(friend.name);
  await click(friend.name);
  await dialog('Character Profile').getByText(friend.hobby, { exact: true }).waitFor();

  const adult = atAge(17);
  postTransaction(adult, 'Savings', 100000, 'other');
  await open('shopping-test', adult);
  await click('Age Up');
  await page.locator('dialog[data-life-event][open]').waitFor();
  await acknowledgeEvents(page, true);
  assert.ok((await read('shopping-test')).journal.some(({ text }) => text.includes('My options are in Assets under Housing.')));
  await click('Activities');
  await click('Join a Hobby Group');
  await dialog('Someone New').getByText(/at a hobby group/).waitFor();
  await acknowledgeEvents(page);
  await click('Close Activities');
  await click('Assets');
  const topGroup = page.locator('.play-group').first();
  await topGroup.getByRole('heading', { name: 'Banking', exact: true }).waitFor();
  assert.equal(await topGroup.getByRole('button', { name: 'Owned Assets', exact: true }).count(), 1);
  await click('Housing');
  await click('Rent My Own Place');
  await dialog('A Place of My Own').waitFor();
  await acknowledgeEvents(page);
  await page.getByText('Rented home', { exact: true }).waitFor();
  await click('Back to Assets');
  await click('Shopping');

  const images = [];
  for (const [kind, id] of [['Houses', 'cedar-starter'], ['Cars', 'toyota-yaris'], ['Motorcycles', 'honda-super-cub']]) {
    await click(kind);
    await page.getByRole('heading', { name: '10 listings' }).waitFor();
    const art = page.locator('.asset-art');
    assert.equal(await art.count(), 10);
    images.push(...await art.evaluateAll((nodes) => nodes.map((image) => image.src)));
    const listing = assetById.get(id);
    await click(listing.name);
    const preview = page.getByRole('img', { name: `Pixel artwork of ${listing.name}` });
    await preview.waitFor();
    assert.ok(await preview.evaluate((image) => image.complete && image.naturalWidth === 72));
    const buy = await button('Buy').boundingBox();
    const frame = await page.locator('.mortal-frame').boundingBox();
    assert.ok(buy && frame && buy.y + buy.height <= frame.y + frame.height);
    if (process.env.MORTAL_CAPTURE_ASSETS) await page.screenshot({ path: `.expo/web-qa/${id}.png` });
    await click('Buy');
    await dialog('Purchase Complete').waitFor();
    await acknowledgeEvents(page);
    assert.ok(await button('Buy').isDisabled());
    await click(`Back to ${kind}`);
    await click('Back to Shopping');
  }
  assert.equal(new Set(images).size, 30);

  await click('Back to Assets');
  await click('Housing');
  await click('Move Into Cedar Starter House');
  await dialog('New Home').waitFor();
  await acknowledgeEvents(page);
  await click('Back to Assets');
  await click('Owned Assets');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.getByText('Toyota Yaris', { exact: true }).waitFor();
  await page.getByText('Honda Super Cub', { exact: true }).waitFor();
  const own = await read('shopping-test');
  assert.equal(own.property.residence, own.property.owned.find(({ id }) => id === 'cedar-starter')?.ownershipId);
  assert.equal(own.property.owned.length, 3);
  assert.equal(own.character.bank, own.transactions.reduce((sum, { amount }) => sum + amount, 0));
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true);
  assert.deepEqual(errors, []);
  console.log('Library friendships and shopping passed at 320px and 390px, including all 30 illustrations, owning, moving, and reload.');
} finally {
  await browser.close();
}
