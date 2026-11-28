import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { assetSaleQuote } from '../src/engine/property.ts';
import { adoptionApplicationFee, adoptionCandidates } from '../src/engine/adoption.ts';
import { connectionIssue, perceivedConnection } from '../src/engine/connectionActions.ts';
import { createLife } from '../src/engine/create.ts';
import { recordContactDeath } from '../src/engine/death.ts';
import { householdFor, householdMembers, partnerAssetShare, settleChildSupport } from '../src/engine/household.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { closeKin, familyRelation } from '../src/engine/kinship.ts';
import { changeRomance, loveIssue } from '../src/engine/love.ts';
import { ensureNpc, makeNpc, npcRandom, remember } from '../src/engine/npcs.ts';
import { openConcern, relationshipCondition, relationshipSatisfaction, stateFor } from '../src/engine/relationships.ts';
import { findContact } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { estate } from '../src/engine/wealth.ts';
import { newWorld } from '../src/engine/world.ts';
import { relationshipSections } from '../src/socialView.ts';

function adult() {
  const life = createLife(4);
  life.character.age = 30;
  life.year += 30;
  for (const person of [...life.family, ...life.social.people]) person.age += 30;
  life.world = newWorld(life.seed, life.year, true);
  postTransaction(life, 'Savings', 250000, 'other');
  return life;
}

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function contact(life: Life, id: string, age: number, role: 'Acquaintance' | 'Relative' | 'Child' = 'Acquaintance') {
  const person = makeNpc(life, `npc-${id}`, age, role);
  life.social.people.push(person);
  ensureNpc(life, person);
  return person;
}

function married() {
  const life = adult();
  const spouse = contact(life, 'spouse', 31);
  Object.assign(spouse.bond, { affection: 95, trust: 94, respect: 96, familiarity: 89, compatibility: 82 });
  ensureNpc(life, spouse).savings = 100000;
  changeRomance(life, spouse.id, 'dating', 'We went on a date.');
  changeRomance(life, spouse.id, 'engaged', 'We got engaged.');
  changeRomance(life, spouse.id, 'married', 'We got married.');
  householdFor(life, spouse);
  return { life, spouse };
}

function agree(life: Life, person: string, action: string) {
  while (npcRandom(life, `household:${person}:${action}`, life.year).next() >= .2) life.seed++;
}

test('directory quality accounts for severe resentment and low trust without changing the saved bond', () => {
  const life = adult();
  const friend = contact(life, 'neighbor', 32);
  friend.friend = true;
  Object.assign(friend.bond, { affection: 100, trust: 12, respect: 45, familiarity: 70, resentment: 59 });
  const original = { ...friend.bond };
  openConcern(life, friend.id, 'argument', 62);
  assert.equal(relationshipCondition(life, friend), 'Broken Trust');
  assert.ok(relationshipSatisfaction(life, friend) < 45);
  assert.deepEqual(friend.bond, original);
  const state = stateFor(life, friend.id);
  state.perspective = { npc: 30, willingness: 36, updated: life.year };
  const attached = act(life, { type: 'connection', person: friend.id, action: 'mark-close' });
  assert.equal(attached.social.relationships[friend.id]?.perspective?.npc, 30);
  assert.equal(attached.social.relationships[friend.id]?.perspective?.player, 92);
  assert.match(perceivedConnection(attached, findContact(attached, friend.id)!) ?? '', /more invested/);
  assert.deepEqual(decodeLife(JSON.stringify(attached)), attached);
});

test('archive keeps identities and memories, and reconnect respects explicit no-contact boundaries', () => {
  const life = adult();
  const old = contact(life, 'neighborhood-old', 33);
  remember(life, old, 'We met at a block gathering.');
  const archived = act(life, { type: 'connection', person: old.id, action: 'archive' });
  assert.equal(relationshipSections(archived, old.name).length, 0);
  const restored = decodeLife(JSON.stringify(archived));
  const [section] = relationshipSections(restored, old.name, 'Archived', 'recent');
  assert.deepEqual(section?.people[0], old);
  assert.match(restored.social.profiles[old.id]!.memories.at(-1)?.text ?? '', /block gathering/);
  restored.social.profiles[old.id]!.casualContact = 'closed';
  assert.match(connectionIssue(restored, old, 'reconnect') ?? '', /boundaries/);
  const shown = act(restored, { type: 'connection', person: old.id, action: 'unarchive' });
  assert.equal(relationshipSections(shown, old.name)[0]?.title, 'Former Relationships');
});

test('parent references determine half-siblings, step-siblings and cousins and exclude family from dating', () => {
  const life = adult();
  const parent = life.family[0]!;
  const elder = contact(life, 'elder', parent.age + 20, 'Relative');
  const aunt = contact(life, 'aunt', parent.age - 2, 'Relative');
  const cousin = contact(life, 'cousin', 25);
  const step = contact(life, 'step', parent.age - 2, 'Relative');
  const sibling = contact(life, 'step-sibling', 28, 'Relative');
  const half = contact(life, 'half-sibling', 22, 'Relative');
  life.social.parents[parent.id] = [elder.id];
  life.social.parents[aunt.id] = [elder.id];
  life.social.parents[cousin.id] = [aunt.id];
  life.social.parents[sibling.id] = [step.id];
  life.social.parents[half.id] = [parent.id, step.id];
  life.social.unions = [{ people: [parent.id, step.id], since: life.year, married: life.year }];
  assert.equal(familyRelation(life, cousin.id), 'cousin');
  assert.equal(familyRelation(life, sibling.id), 'step-sibling');
  assert.equal(familyRelation(life, half.id), life.family.length === 2 ? 'half-sibling' : 'sibling');
  assert.ok(closeKin(life, sibling.id, half.id));
  assert.match(loveIssue(life, { type: 'romance', action: 'ask', person: cousin.id }) ?? '', /relatives/i);
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

test('divorce returns recorded contributions and splits joint asset proceeds at sale', () => {
  let { life, spouse } = married();
  const action = { type: 'household', person: spouse.id } as const;
  agree(life, spouse.id, 'deposit');
  const assetsBefore = estate(life).total;
  const cashBefore = life.character.bank;
  life = act(life, { ...action, action: 'deposit', amount: 2000 });
  assert.deepEqual(life.social.household?.savings, { player: 2000, partner: 2000 });
  assert.equal(life.social.profiles[spouse.id]?.savings, 98000);
  assert.equal(estate(life).total, assetsBefore);
  assert.equal(life.character.bank, cashBefore - 2000);
  life = act(life, { type: 'buy-asset', id: 'toyota-yaris' });
  const asset = life.property.owned[0]!;
  agree(life, spouse.id, 'share-asset');
  life = act(life, { ...action, action: 'share-asset', asset: asset.ownershipId });
  assert.equal(life.social.jointTitles?.[0]?.asset, asset.ownershipId);
  life = decodeLife(JSON.stringify(life));
  const beforeDivorce = life.character.bank;
  life = act(life, { type: 'romance', person: spouse.id, action: 'divorce' });
  assert.equal(life.character.bank - beforeDivorce, 2000);
  assert.equal(life.social.household, undefined);
  const sale = assetSaleQuote(life, asset).proceeds;
  const share = partnerAssetShare(life, asset.ownershipId, sale);
  const npcBefore = life.social.profiles[spouse.id]!.savings;
  const beforeSale = life.character.bank;
  const sold = act(life, { type: 'manage-asset', id: asset.ownershipId, operation: 'sell' });
  assert.equal(sold.social.jointTitles?.length, 0);
  assert.equal(sold.social.profiles[spouse.id]!.savings - npcBefore, share);
  assert.equal(sold.character.bank - beforeSale + share, sale);
  assert.deepEqual(decodeLife(JSON.stringify(sold)), sold);
});

test('custody preserves parents, verifies the residence choice and reconciles child support', () => {
  let { life, spouse } = married();
  const child = contact(life, 'child-test', 7, 'Child');
  life.social.parents[child.id] = ['self', spouse.id];
  life.social.children[child.id] = { year: life.year - child.age, adopted: false, wellbeing: 70, learning: 40, confidence: 50, supportEnded: false };
  assert.match(connectionIssue(life, child, 'boundaries') ?? '', /appropriate/);
  life = act(life, { type: 'romance', person: spouse.id, action: 'divorce' });
  assert.equal(life.social.custody?.[child.id]?.residence, 'player');
  const other = life.social.profiles[spouse.id]!;
  other.income = 40000;
  const npcSavings = other.savings;
  const cash = life.character.bank;
  settleChildSupport(life);
  assert.equal(life.character.bank - cash, 3600);
  assert.equal(npcSavings - other.savings, 3600);
  agree(life, spouse.id, 'custody');
  life = act(life, { type: 'household', action: 'custody', person: spouse.id, child: child.id, residence: 'other' });
  assert.equal(life.social.custody?.[child.id]?.residence, 'other');
  assert.ok(!householdMembers(life).some(({ person }) => person.id === child.id));
  assert.deepEqual(life.social.parents[child.id], ['self', spouse.id]);
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

test('a saved pregnancy follows the birth parent’s residence when the couple lives apart', () => {
  const { life, spouse } = married();
  life.character.gender = 'man';
  spouse.gender = 'woman';
  spouse.city = life.character.city === 'Bellmere' ? 'Alder Bay' : 'Bellmere';
  life.social.household!.living = 'separate';
  life.social.pregnancies = [{ mother: spouse.id, father: 'self', dueYear: life.year + 1, name: 'Ari' }];
  const next = act(decodeLife(JSON.stringify(life)), { type: 'age' });
  const child = next.social.people.find(({ id }) => Object.hasOwn(next.social.children, id))!;
  assert.ok(child.name.startsWith('Ari '));
  assert.equal(child.city, spouse.city);
  assert.deepEqual(next.social.parents[child.id], ['self', spouse.id]);
  assert.equal(next.social.custody?.[child.id]?.residence, 'other');
  assert.equal(next.social.pregnancies, undefined);
  assert.deepEqual(decodeLife(JSON.stringify(next)), next);
});

test('adoption review can close safely; grief and the deceased profile survive reload', () => {
  const life = adult();
  const candidate = adoptionCandidates(life)[0]!;
  const filed = act(life, { type: 'adopt-child', person: candidate.person.id });
  assert.equal(life.character.bank - filed.character.bank, adoptionApplicationFee);
  const pending = decodeLife(JSON.stringify(filed));
  const malformed = { ...pending, social: { ...pending.social, adoption: { ...pending.social.adoption!, due: pending.year } } };
  assert.throws(() => decodeLife(JSON.stringify(malformed)));
  postTransaction(pending, 'Exceptional bill', -pending.character.bank, 'other');
  const rejected = act(pending, { type: 'age' });
  assert.equal(rejected.social.children[candidate.person.id], undefined);
  assert.ok(rejected.notices.some(({ title }) => title === 'Adoption Application Closed'));
  const parent = life.family[0]!;
  recordContactDeath(life, parent, 'Natural causes', 'family');
  const archived = decodeLife(JSON.stringify(life));
  const deceased = findContact(archived, parent.id)!;
  assert.equal(relationshipSections(archived, parent.name)[0]?.title, 'Remembered Loved Ones');
  const grief = archived.social.relationships[parent.id]!.grief!.intensity;
  assert.ok(grief > 20);
  assert.match(connectionIssue(archived, deceased, 'advice') ?? '', /boundaries/);
  const memorial = act(archived, { type: 'connection', person: parent.id, action: 'memorial' });
  assert.equal(memorial.social.relationships[parent.id]!.grief!.intensity, grief - 12);
  assert.deepEqual(decodeLife(JSON.stringify(memorial)), memorial);
});
