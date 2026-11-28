import assert from 'node:assert/strict';
import test from 'node:test';
import { eventById } from '../src/data/events.ts';
import { books, clubs } from '../src/data/localSocial.ts';
import { cities } from '../src/data/veyra.ts';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { friendshipExperience, friendshipStage } from '../src/engine/friendships.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { clubMembers, membership, membershipFee, neighbors } from '../src/engine/localSocial.ts';
import { allContacts, advanceNpcLives, ensureNpc, makeNpc, npcRandom } from '../src/engine/npcs.ts';
import { findContact } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import { availability, contextualOutcome } from '../src/engine/socialContext.ts';
import { offerSocialEvent } from '../src/engine/socialEvents.ts';
import { connectSocialPair, possibleIntroduction, socialGraphLimit } from '../src/engine/socialGraph.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { newWorld } from '../src/engine/world.ts';

const restore = (life: Life) => decodeLife(JSON.stringify(life));
function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function adult() {
  const life = createLife(33);
  tick(life, 25);
  postTransaction(life, 'Savings', 220000, 'other');
  return life;
}

function tick(life: Life, years = 1) {
  for (const person of allContacts(life)) if (person.alive) person.age += years;
  life.year += years;
  life.character.age += years;
  life.world = newWorld(life.seed, life.year, true);
  life.usedActions = [];
}

const warmBond = { affection: 87, trust: 89, respect: 86, familiarity: 84, compatibility: 90, resentment: 0 };
function acquaintance(life: Life, id: string) {
  const person = makeNpc(life, id, 26, 'Acquaintance');
  life.social.people.push(person);
  ensureNpc(life, person);
  return person;
}

test('six neighbors retain identities and portraits after reload, repeated contact and a move to another address', () => {
  let life = adult();
  const initial = neighbors(life);
  assert.equal(initial.length, 6);
  assert.equal(new Set(initial.map(({ person }) => person.id)).size, 6);
  assert.ok(new Set(initial.map(({ person }) => person.occupation)).size >= 2);
  const jobs = initial.flatMap(({ profile }) => profile.job ? [profile.job] : []);
  assert.ok(jobs.length > 1);
  assert.equal(new Set(jobs).size, jobs.length);
  assert.ok(initial.every(({ profile }) => profile.localHousehold && profile.interests.length === 2));
  const neighbor = initial[2]!.person;
  const greet = { type: 'neighborhood', activity: 'introduce', person: neighbor.id } as const;
  life = apply(life, greet);
  const acquaintance = findContact(life, neighbor.id)!;
  assert.equal(life.social.people.length, 1);
  assert.deepEqual(neighbors(restore(life)).map(({ person }) => person.id), initial.map(({ person }) => person.id));
  assert.deepEqual(acquaintance.appearance, neighbor.appearance);
  assert.match(advance(life, greet).error ?? '', /next year/);
  const visit = { ...greet, activity: 'help' } as const;
  assert.deepEqual(apply(restore(life), visit), apply(life, visit));

  const city = cities.find((name) => name !== life.character.city)!;
  const relocated = apply(life, { type: 'relocate', city });
  assert.ok(neighbors(relocated).every(({ person }) => !initial.some(({ person: before }) => before.id === person.id)));
  assert.deepEqual(findContact(relocated, neighbor.id)?.appearance, neighbor.appearance);
  assert.deepEqual(relocated.social.profiles[neighbor.id]?.memories, life.social.profiles[neighbor.id]?.memories);
  assert.deepEqual(restore(relocated), relocated);

  const longtimeResident = restore(life);
  tick(longtimeResident, 29);
  assert.deepEqual(neighbors(restore(longtimeResident)).map(({ person }) => person.id), initial.map(({ person }) => person.id));
});

test('neighbors can move away without deleting the acquaintance or leaving a vacant roster slot', () => {
  let life = adult();
  const neighbor = neighbors(life)[2]!.person;
  life = apply(life, { type: 'neighborhood', activity: 'introduce', person: neighbor.id });
  const site = Object.keys(life.social.local!.neighborhoods)[0]!;
  for (;;) {
    const random = npcRandom(life, `neighborhood-year:${site}`, life.year + 1);
    if (random.next() < .14 && random.integer(0, 5) === 2) break;
    life.seed++;
  }
  const next = apply(life, { type: 'age' });
  assert.ok(next.notices.some(({ title }) => title === 'A Neighbor Moved'));
  assert.equal(neighbors(next).length, 6);
  assert.ok(neighbors(next).every(({ person }) => person.id !== neighbor.id));
  assert.ok(findContact(next, neighbor.id));
  assert.notEqual(findContact(next, neighbor.id)?.city, life.character.city);
  assert.deepEqual(restore(next), next);
});

test('clubs persist their roster, charge joining fees once, and keep participation after leaving', () => {
  const life = adult();
  const existing = acquaintance(life, 'npc-local-filmmaker');
  ensureNpc(life, existing).interests = ['acting', 'reading'];
  assert.equal(Object.keys(clubs).length, 8);
  const club = 'film' as const;
  assert.equal(clubMembers(life, club)[0]?.person.id, existing.id);
  const join = { type: 'community', club, activity: 'join' } as const;
  let member = apply(life, join);
  assert.equal(member.character.bank, life.character.bank - membershipFee(life, club));
  assert.match(advance(member, join).error ?? '', /already/);
  const roster = membership(member, club)!.members;
  assert.deepEqual(clubMembers(restore(member), club).map(({ person }) => person.id), roster);
  const project = { ...join, activity: 'project' } as const;
  assert.match(advance(member, project).error ?? '', /Attend a session/);
  member = apply(member, { ...join, activity: 'attend' });
  assert.equal(member.notices.at(-1)?.title, 'Club Session');
  member = apply(member, project);
  assert.equal(member.notices.at(-1)?.title, 'Community Project');
  assert.match(advance(member, project).error ?? '', /next year/);
  const left = apply(member, { ...join, activity: 'leave' });
  assert.equal(membership(left, club)?.active, false);
  assert.equal(membership(left, club)?.history.length, 4);
  assert.deepEqual(membership(left, club)?.members, roster);
  assert.deepEqual(restore(left), left);
});

test('the library keeps reading history, skips repeated rewards, and reuses readers', () => {
  let life = adult();
  assert.equal(new Set(Object.values(books).map(({ genre }) => genre)).size, 9);
  const read = { type: 'library-visit', activity: 'read', book: 'last-ferry' } as const;
  const once = apply(life, read);
  const repeated = apply(restore(once), read);
  assert.deepEqual(repeated.character.attributes, once.character.attributes);
  assert.deepEqual(repeated.skills, once.skills);
  assert.equal(repeated.social.local?.reading.length, 1);
  const neutral = apply(life, { ...read, book: 'quiet-habits' });
  assert.deepEqual(neutral.character.attributes, life.character.attributes);
  const circle = { type: 'library-visit', activity: 'circle' } as const;
  life = apply(life, circle);
  const ids = life.social.people.map(({ id }) => id);
  assert.equal(ids.length, 3);
  assert.deepEqual(apply(restore(life), circle).social.people.map(({ id }) => id), ids);
  assert.ok(life.social.graph?.length);
  assert.deepEqual(restore(life), life);
});

test('friendship decisions and natural progression reuse bonds and survive refusals, reload and estrangement', () => {
  const life = adult();
  const person = acquaintance(life, 'npc-staged-friend');
  Object.assign(person.bond, { affection: 35, trust: 21, familiarity: 12, compatibility: 41, respect: 24, resentment: 35 });
  const ask = { type: 'befriend', person: person.id } as const;
  const declined = apply(life, ask);
  assert.equal(friendshipStage(declined, findContact(declined, person.id)!), 'acquaintance');
  assert.match(advance(declined, ask).error ?? '', /already discussed/);
  Object.assign(person.bond, warmBond);
  let accepted = apply(life, ask);
  assert.deepEqual(findContact(accepted, person.id)?.bond, person.bond);
  assert.equal(friendshipStage(accepted, findContact(accepted, person.id)!), 'casual');
  const observed = new Set<string>();
  for (let year = 0; year < 7; year++) {
    tick(accepted);
    friendshipExperience(accepted, findContact(accepted, person.id)!, 1);
    accepted = restore(accepted);
    observed.add(friendshipStage(accepted, findContact(accepted, person.id)!));
  }
  assert.deepEqual(observed, new Set(['friend', 'close', 'best']));
  const unhappy = findContact(accepted, person.id)!;
  Object.assign(unhappy.bond, { trust: 16, respect: 26, resentment: 77 });
  advanceNpcLives(accepted);
  assert.equal(friendshipStage(accepted, unhappy), 'former');
  assert.deepEqual(restore(accepted), accepted);
});

test('NPCs can initiate friendship and context explains why an invitation is postponed', () => {
  const life = adult();
  const contact = acquaintance(life, 'npc-initiating-contact');
  Object.assign(contact.bond, warmBond);
  const profile = ensureNpc(life, contact);
  profile.traits.sociability = 90;
  let initiated: Life | undefined;
  for (let seed = 1; seed <= 300; seed++) {
    const attempt = restore(life);
    attempt.seed = seed;
    offerSocialEvent(attempt);
    if (attempt.pending !== 'social-friendship') continue;
    initiated = attempt;
    break;
  }
  assert.ok(initiated);
  assert.ok(eventById.has(initiated.pending!));
  assert.equal(friendshipStage(apply(restore(initiated), { type: 'choose', event: 'social-friendship', choice: 'accept' }), contact), 'casual');
  const occasion = { key: 'visiting', group: ['others', 'people'], demanding: true, cost: 500 };
  contact.health = 32;
  assert.match(availability(life, contact, occasion)?.reason ?? '', /rest/);
  contact.health = 90;
  profile.savings = 0;
  assert.match(availability(life, contact, occasion)?.reason ?? '', /budget/);
  profile.savings = 1000;
  profile.traits.sociability = 10;
  assert.match(availability(life, contact, occasion)?.reason ?? '', /quieter/);
  const weak = acquaintance(life, 'npc-awkward-contact');
  Object.assign(weak.bond, { affection: 16, trust: 15, familiarity: 18, respect: 18, resentment: 59, compatibility: 13 });
  assert.ok(contextualOutcome(life, weak, occasion).weight < contextualOutcome(life, contact, occasion).weight);
});

test('NPC social edges progress, affect invitations, reconcile, and support introductions without duplicating contacts', () => {
  const life = adult();
  const a = acquaintance(life, 'npc-network-a');
  const b = acquaintance(life, 'npc-network-b');
  for (const person of [a, b]) {
    const profile = ensureNpc(life, person);
    profile.traits.empathy = 100;
    profile.traits.temperament = 100;
    profile.interests = ['chess', 'reading'];
  }
  a.friend = true;
  connectSocialPair(life, a, b, 'at a reading circle');
  const relation = life.social.graph![0]!;
  assert.equal(relation.met, life.year);
  relation.compatibility = 100;
  for (let year = 0; year < 7; year++) {
    tick(life);
    connectSocialPair(life, a, b, 'at the club');
  }
  assert.equal(relation.type, 'close');
  assert.equal(possibleIntroduction(life, a)?.id, b.id);
  const met = apply(life, { type: 'social-introduction', person: a.id });
  assert.equal(met.social.people.length, 2);
  assert.ok(met.journal.at(-1)?.text.includes(b.name));
  relation.compatibility = 1;
  ensureNpc(life, a).traits.empathy = ensureNpc(life, b).traits.empathy = 10;
  for (let year = 0; year < 4; year++) {
    tick(life);
    connectSocialPair(life, a, b, 'at the club');
  }
  assert.equal(relation.type, 'rival');
  assert.match(availability(life, a, { key: 'gathering', group: [b.id] })?.reason ?? '', /disagreement/);
  relation.compatibility = 100;
  ensureNpc(life, a).traits.empathy = ensureNpc(life, b).traits.empathy = 100;
  for (let year = 0; year < 12 && relation.type === 'rival'; year++) {
    tick(life);
    connectSocialPair(life, a, b, 'at the club');
  }
  assert.equal(relation.type, 'acquaintance');
  assert.ok(relation.memories.some(({ text }) => text.includes('reconciled')));
  assert.ok(life.social.graph!.length <= socialGraphLimit);
  assert.deepEqual(restore(life), life);
});
