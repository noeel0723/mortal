import { newWorld } from '../src/engine/world.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { assetById, assetCatalog, assetKinds, starterHome } from '../src/data/shops.ts';
import { createLife } from '../src/engine/create.ts';
import { canAccompany } from '../src/engine/health.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { makeOwnership, propertyIssue, propertyQuote, rentMovingFee } from '../src/engine/property.ts';
import { findContact } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { assetArt } from '../src/portraits/assetArt.ts';

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function atAge(age: number, seed = 4) {
  const life = createLife(seed);
  life.character.age = age;
  life.year += age;
  life.world = newWorld(life.seed, life.year, true);
  return life;
}

test('library visits can repeat without energy and a shared hobby choice persists through reload', () => {
  const life = atAge(5);
  life.character.attributes.energy = 0;
  const visit = { type: 'activity', activity: 'go-to-library' } as const;
  life.random = 0;
  const quietVisit = apply(life, visit);
  assert.equal(quietVisit.pending, null);
  quietVisit.random = 7;
  const encounter = apply(quietVisit, visit);
  const restored = decodeLife(JSON.stringify(encounter));
  const popup = eventPopup(restored)!;
  assert.equal(popup.title, 'A Shared Hobby');
  assert.equal(popup.text, encounter.journal.at(-1)?.text);
  const ignored = apply(restored, { type: 'choose', event: 'a-shared-hobby', choice: 'read' });
  assert.deepEqual(ignored.communityFriends, []);
  const accepted = apply(restored, popup.actions[0]!.action);
  const friend = accepted.communityFriends[0]!;
  assert.ok(popup.text.includes(friend.name) && popup.text.includes(friend.hobby));
  assert.equal(findContact(accepted, friend.id), friend);
  assert.ok(canAccompany(accepted, friend));
  assert.deepEqual(decodeLife(JSON.stringify(accepted)), accepted);
  const again = apply(apply(accepted, visit), visit);
  assert.equal(again.pending, null);
  assert.equal(again.character.attributes.energy, 0);
  assert.equal(again.communityFriends.length, 1);
  const older = apply(again, { type: 'age' });
  assert.equal(findContact(older, friend.id)?.age, friend.age + 1);
});

test('adult housing choices honor age, parent affordability, and willingness', () => {
  const request = { type: 'ask-for-home', parent: 'parent-1' } as const;
  const young = atAge(17);
  assert.match(propertyIssue(young, request) ?? '', /age 18/);
  const birthday = apply(young, { type: 'age' });
  assert.ok(birthday.notices.some(({ title }) => title === 'Moving Out'));
  const adult = atAge(18);
  adult.character.background = 'working-class';
  assert.match(propertyIssue(adult, request) ?? '', /cannot afford/);
  adult.social.profiles[adult.family[0]!.id]!.savings = 82000;
  adult.random = 0;
  Object.assign(adult.family[0]!.bond, { affection: 95, trust: 99, resentment: 0 });
  const gifted = apply(adult, request);
  assert.equal(gifted.property.residence, gifted.property.owned[0]?.ownershipId);
  const acquisition = propertyQuote(adult, starterHome);
  assert.deepEqual(gifted.property.owned, [makeOwnership({ id: starterHome.id, year: adult.year, source: 'gift', city: adult.character.city, acquisition }, 0)]);
  assert.equal(gifted.character.bank, adult.character.bank);
  assert.equal(gifted.social.profiles[adult.family[0]!.id]!.savings, 82000 - acquisition.price);
  Object.assign(adult.family[0]!.bond, { affection: 30, trust: 12, resentment: 60 });
  const declined = apply(adult, request);
  assert.equal(declined.property.residence, 'family');
  assert.match(propertyIssue(declined, request) ?? '', /already asked/);
  const movingFee = rentMovingFee(adult);
  postTransaction(adult, 'Savings', movingFee, 'other');
  const renter = apply(adult, { type: 'rent-home' });
  assert.equal(renter.property.residence, 'rent');
  assert.equal(adult.character.bank - renter.character.bank, movingFee);
});

test('shopping records unique purchases and lets the player move into an owned home', () => {
  const life = atAge(18);
  const listings = [starterHome, assetById.get('toyota-yaris')!, assetById.get('honda-super-cub')!];
  const purchase = { type: 'buy-asset', id: 'skyline-penthouse' } as const;
  assert.match(propertyIssue(life, purchase) ?? '', /balance/);
  postTransaction(life, 'Savings', 100000, 'other');
  const bought = listings.reduce((current, item) => apply(current, { type: 'buy-asset', id: item.id }), life);
  assert.equal(bought.property.owned.length, 3);
  const charges = bought.transactions.filter(({ category }) => category === 'shopping');
  assert.deepEqual(charges.map(({ amount }) => amount), listings.map((listing) => -propertyQuote(life, listing).price));
  assert.equal(bought.character.bank, bought.transactions.reduce((sum, { amount }) => sum + amount, 0));
  assert.match(propertyIssue(bought, { type: 'buy-asset', id: starterHome.id }) ?? '', /already own/);
  assert.match(propertyIssue(bought, { type: 'move-into-home', id: 'toyota-yaris' }) ?? '', /do not own this house/);
  const moved = apply(bought, { type: 'move-into-home', id: starterHome.id });
  assert.equal(moved.property.residence, moved.property.owned.find(({ id }) => id === starterHome.id)?.ownershipId);
  assert.equal(life.property.owned.length, 0);
  assert.deepEqual(decodeLife(JSON.stringify(moved)), moved);
});

test('each catalog has ten distinct pixel illustrations and V5 saves upgrade with empty ownership', () => {
  assert.deepEqual(assetKinds.map((kind) => assetCatalog.filter((listing) => listing.kind === kind).length), [10, 10, 10]);
  const images = assetCatalog.map(assetArt);
  assert.ok(images.every((src) => src.startsWith('data:image/png;base64,iVBOR')));
  assert.equal(new Set(images).size, 30);
  const life = atAge(18);
  const legacy = { ...life, version: 5, property: undefined, communityFriends: undefined };
  assert.deepEqual({ ...decodeLife(JSON.stringify(legacy)), social: undefined }, { ...life, social: undefined });
  assert.throws(() => decodeLife(JSON.stringify({ ...life, property: { residence: 'toyota-yaris', owned: [] } })), /invalid assets/);
});
