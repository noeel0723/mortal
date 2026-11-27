import { newWorld } from '../src/engine/world.ts';
import { localExpense } from '../src/engine/pricing.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { eventById } from '../src/data/events.ts';
import { jobById } from '../src/data/jobs.ts';
import { createLife } from '../src/engine/create.ts';
import { ageFamilyOpportunities, annualChildcare } from '../src/engine/familyLife.ts';
import { annualFinance } from '../src/engine/finance.ts';
import { canAccompany, startIllness } from '../src/engine/health.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { activeRomance, loveIssue, romanceFor } from '../src/engine/love.ts';
import { advanceNpcLives, allContacts, ensureNpc, makeNpc, npcRandom, syncNpcs } from '../src/engine/npcs.ts';
import { findContact } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import { offerSocialEvent } from '../src/engine/socialEvents.ts';
import type { Action, CommunityFriend, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { familyTreeGroups, friendshipLabel } from '../src/socialView.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function adult() {
  const life = createLife(30);
  life.character.age = 25;
  life.year += 25;
  life.world = newWorld(life.seed, life.year, true);
  life.family.forEach((person) => { person.age += 25; });
  postTransaction(life, 'Savings', 180000, 'other');
  return life;
}

function forceRoll(life: Life, key: string, ceiling = .25) {
  while (npcRandom(life, key, life.year).next() >= ceiling) life.seed++;
}

function knownFriend(life: Life) {
  const id = `library-${life.year}`;
  const friend: CommunityFriend = { ...makeNpc(life, id, 25, 'Acquaintance'), role: 'Friend', friend: true, hobby: 'playing chess' };
  life.communityFriends.push(friend);
  Object.assign(friend.bond, { affection: 96, trust: 98, familiarity: 90, compatibility: 96, resentment: 0 });
  const profile = ensureNpc(life, friend);
  profile.preferences = [life.character.gender];
  profile.traits = { ...profile.traits, confidence: 95, loyalty: 95 };
  return friend;
}

function age(life: Life) {
  let next = act(life, { type: 'age' });
  if (next.pending) {
    const choice = eventById.get(next.pending)?.choices?.find(({ id }) => id === 'pass') ?? eventById.get(next.pending)?.choices?.[0];
    assert.ok(choice);
    next = act(next, { type: 'choose', event: next.pending, choice: choice.id });
  }
  return next;
}

function marry() {
  let life = adult();
  const friend = knownFriend(life);
  forceRoll(life, `advance:${friend.id}`);
  life = act(life, { type: 'romance', person: friend.id, action: 'ask' });
  assert.equal(activeRomance(life)?.status, 'dating');
  life = age(life);
  forceRoll(life, `advance:${friend.id}`);
  life = act(life, { type: 'romance', person: friend.id, action: 'propose' });
  assert.equal(activeRomance(life)?.status, 'engaged');
  const balance = life.character.bank;
  life = act(life, { type: 'wedding', person: friend.id, plan: 'gathering' });
  assert.equal(life.character.bank, balance - 6500);
  assert.equal(life.transactions.at(-1)?.category, 'relationships');
  assert.equal(activeRomance(life)?.status, 'married');
  return { life, id: friend.id };
}

test('V6 migration preserves old NPCs, illnesses, homes and decisions, with reproducible personality', () => {
  let life = adult();
  const friend = knownFriend(life);
  life = act(life, { type: 'buy-asset', id: 'cedar-starter' });
  life = act(life, { type: 'move-into-home', id: 'cedar-starter' });
  startIllness(life, 'cold', findContact(life, friend.id)!);
  const legacyProperty = { residence: 'cedar-starter', owned: life.property.owned.map(({ id, year, source }) => ({ id, year, source })) };
  const snapshot = JSON.stringify({ ...life, version: 6, social: undefined, property: legacyProperty });
  const restored = decodeLife(snapshot);
  assert.equal(restored.version, 10);
  assert.deepEqual(findContact(restored, friend.id), findContact(life, friend.id));
  for (const key of ['illnesses', 'transactions', 'journal', 'notices', 'random', 'character'] as const) {
    assert.deepEqual(restored[key], life[key]);
  }
  assert.deepEqual(restored.property, { ...life.property, owned: life.property.owned.map((item) => ({ ...item, acquisition: null })) });
  assert.deepEqual(restored.social, decodeLife(snapshot).social);
  assert.equal(restored.social.romances.length, 0);
  assert.deepEqual(restored.social.children, {});
  assert.equal(canAccompany(restored, findContact(restored, friend.id)!), true);
});

test('V7 migration preserves a married household and owned property without inventing skills', () => {
  const married = marry().life;
  const purchased = act(married, { type: 'buy-asset', id: 'cedar-starter' });
  const housed = act(purchased, { type: 'move-into-home', id: 'cedar-starter' });
  const legacyProperty = { residence: 'cedar-starter', owned: housed.property.owned.map(({ id, year, source }) => ({ id, year, source })) };
  const restored = decodeLife(JSON.stringify({ ...housed, version: 7, skills: undefined, property: legacyProperty }));
  assert.equal(restored.version, 10);
  assert.deepEqual(restored.skills.entries, {});
  for (const key of ['social', 'journal', 'notices', 'transactions', 'random', 'character'] as const) {
    assert.deepEqual(restored[key], housed[key]);
  }
  assert.deepEqual(restored.property, { ...housed.property, owned: housed.property.owned.map((item) => ({ ...item, acquisition: null })) });
});

test('adult NPCs get suitable jobs, build finances and age once', () => {
  let life = adult();
  const friend = knownFriend(life);
  const parent = life.family[0]!;
  parent.age = 50;
  life.social.profiles[parent.id]!.born = life.year - parent.age;
  const startingFunds = life.social.profiles[parent.id]!.savings;
  for (let count = 0; count < 6; count++) life = age(life);
  const updated = findContact(life, friend.id)!;
  const profile = life.social.profiles[friend.id]!;
  assert.equal(updated.age, friend.age + 6);
  assert.equal(profile.status, 'employed');
  const job = jobById.get(profile.job!)!;
  assert.equal(updated.occupation, job.title);
  assert.ok(job.qualification === null || job.qualification === 'high-school');
  assert.ok(life.social.profiles[parent.id]!.savings > startingFunds);
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

test('friendship neglect can become estrangement and the same person can reconnect', () => {
  const life = adult();
  const friend = knownFriend(life);
  assert.match(friendshipLabel(life, friend), /Friend/);
  friend.bond.affection = 24;
  life.social.profiles[friend.id]!.lastInteraction = life.year - 6;
  advanceNpcLives(life);
  assert.equal(friendshipLabel(life, friend), 'Former Friend');
  const reconnected = act(life, { type: 'befriend', person: friend.id });
  assert.equal(reconnected.communityFriends.length, 1);
  assert.equal(reconnected.social.profiles[friend.id]!.formerFriend, false);
  assert.ok(reconnected.social.profiles[friend.id]!.memories.length);
});

test('consent, age, kinship and rejected advances cannot be bypassed by reloading', () => {
  const life = adult();
  const friend = knownFriend(life);
  const ask = { type: 'romance', action: 'ask', person: friend.id } as const;
  friend.age = 17;
  assert.match(loveIssue(life, ask) ?? '', /adults/);
  friend.age = 25;
  assert.match(loveIssue(life, { ...ask, person: life.family[0]!.id }) ?? '', /relatives/);
  life.social.profiles[friend.id]!.preferences = [life.character.gender === 'woman' ? 'man' : 'woman'];
  const rejected = act(life, ask);
  assert.equal(activeRomance(rejected), undefined);
  assert.equal(rejected.notices.at(-1)?.title, 'Date Declined');
  assert.match(loveIssue(decodeLife(JSON.stringify(rejected)), ask) ?? '', /next year/);
  assert.equal(allContacts(rejected).filter(({ id }) => id === friend.id).length, 1);
});

test('marriage, both child paths, parenting, childcare, and divorce preserve family references and ledger', () => {
  const married = marry();
  let { life } = married;
  const { id } = married;
  forceRoll(life, `planning:${id}`);
  life = act(life, { type: 'plan-child', person: id, method: 'family', name: 'Ari' });
  const first = life.social.people.find(({ role }) => role === 'Child')!;
  assert.deepEqual(life.social.parents[first.id], ['self', id]);
  life = act(life, { type: 'parent-child', person: first.id, action: 'read' });
  assert.ok(life.social.profiles[first.id]!.memories.some(({ text }) => /read/i.test(text)));
  const costs = localExpense(life.world, life.character.city, annualChildcare(life));
  life = age(life);
  assert.equal(life.transactions.filter(({ year, label }) => year === life.year && label === 'Childcare').at(-1)?.amount, -costs);
  annualFinance(life, life.character.age - 1);
  assert.equal(life.transactions.filter(({ year, label }) => year === life.year && label === 'Childcare').length, 1);
  forceRoll(life, `planning:${id}`);
  life = act(life, { type: 'plan-child', person: id, method: 'adoption' });
  assert.equal(Object.values(life.social.children).filter(({ adopted }) => adopted).length, 1);
  const balance = life.character.bank;
  life = act(life, { type: 'romance', action: 'divorce', person: id });
  assert.equal(romanceFor(life, id)?.status, 'divorced');
  assert.ok(balance > life.character.bank);
  assert.equal(life.character.bank, life.transactions.reduce((sum, { amount }) => sum + amount, 0));
  assert.deepEqual(life.social.parents[first.id], ['self', id]);
  assert.equal(allContacts(life).filter((person) => person.id === id).length, 1);
  assert.ok(familyTreeGroups(life).some(({ label, people }) => label.includes('former spouses') && people.some((person) => person.id === id)));
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

test('sibling and grandparent references remain valid and invalid ancestry is rejected', () => {
  const life = createLife(2);
  life.character.age = 2;
  life.year += 2;
  life.world = newWorld(life.seed, life.year, true);
  life.family.forEach((person) => { person.age += 2; });
  ageFamilyOpportunities(life);
  life.character.age++;
  life.year++;
  life.world = newWorld(life.seed, life.year, true);
  life.family.forEach((person) => { person.age++; });
  forceRoll(life, 'sibling', .18);
  ageFamilyOpportunities(life);
  syncNpcs(life);
  const sibling = life.social.people.find(({ role }) => role === 'Sibling')!;
  assert.deepEqual(life.social.parents[sibling.id], life.social.parents.self);
  assert.ok(life.social.people.some(({ role }) => role === 'Grandparent'));
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
  life.social.parents[life.family[0]!.id] = ['self'];
  assert.throws(() => decodeLife(JSON.stringify(life)), /invalid social data/);
});

test('contextual NPC choices persist with their participant and player death closes actions', () => {
  const life = adult();
  const friend = knownFriend(life);
  life.social.profiles[friend.id]!.traits.sociability = 100;
  forceRoll(life, 'social-event', .23);
  offerSocialEvent(life);
  assert.equal(life.pending, 'social-dinner');
  offerSocialEvent(life);
  assert.equal(life.social.pendingPerson, friend.id);
  const loaded = decodeLife(JSON.stringify(life));
  assert.ok(eventPopup(loaded)?.text.includes(friend.name));
  const answered = act(loaded, { type: 'choose', event: 'social-dinner', choice: 'accept' });
  assert.equal(answered.pending, null);
  assert.equal(answered.social.pendingPerson, null);
  assert.ok(answered.social.profiles[friend.id]!.memories.at(-1)?.text.includes(friend.name));
  answered.character.causeOfDeath = 'Natural causes';
  assert.match(advance(answered, { type: 'meet', source: 'app' }).error ?? '', /ended/);
});

test('a partner death keeps marriage and illness history consistent, and dating can end in a breakup', () => {
  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  startIllness(life, 'cold', spouse);
  spouse.health = 0;
  const bereaved = age(life);
  assert.equal(findContact(bereaved, id)?.alive, false);
  assert.equal(romanceFor(bereaved, id)?.status, 'widowed');
  assert.equal(romanceFor(bereaved, id)?.wedding, life.year);
  assert.ok(bereaved.illnesses.every(({ patient }) => patient !== id));
  assert.deepEqual(decodeLife(JSON.stringify(bereaved)), bereaved);

  const single = adult();
  const person = knownFriend(single);
  forceRoll(single, `advance:${person.id}`);
  const dating = act(single, { type: 'romance', person: person.id, action: 'ask' });
  const breakup = act(dating, { type: 'romance', person: person.id, action: 'breakup' });
  assert.equal(romanceFor(breakup, person.id)?.status, 'broken-up');
  assert.equal(activeRomance(breakup), undefined);
});
