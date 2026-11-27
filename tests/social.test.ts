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
import { activeRomance, activeRomances, loveIssue, romanceFor } from '../src/engine/love.ts';
import { advanceNpcLives, allContacts, ensureNpc, makeNpc, npcRandom, syncNpcs } from '../src/engine/npcs.ts';
import { findContact } from '../src/engine/school.ts';
import { agreementFor, attraction, openConcern, relationshipState, setAgreement, visibleConcerns } from '../src/engine/relationships.ts';
import { cities } from '../src/data/veyra.ts';
import { advance } from '../src/engine/simulation.ts';
import { offerSocialEvent } from '../src/engine/socialEvents.ts';
import { datingSources } from '../src/engine/socialTypes.ts';
import type { Action, CommunityFriend, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { familyTreeGroups, friendshipLabel, relationshipControls, relationshipGroups } from '../src/socialView.ts';

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
  forceRoll(life, `agreement:${friend.id}:exclusive`);
  life = act(life, { type: 'relationship-care', person: friend.id, action: 'exclusive' });
  assert.equal(activeRomance(life)?.status, 'committed');
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

function acceptMatch(life: Life, source: 'date' | 'app') {
  const matched = act(life, { type: 'dating-match', source });
  return act(matched, { type: 'choose', event: 'social-dating-match', choice: 'accept' });
}

test('Make Love works with a current partner or adult friend and respects a refusal', () => {
  const single = adult();
  const friend = knownFriend(single);
  const action = { type: 'intimacy', encounter: 'make-love', person: friend.id } as const;
  const choice = { type: 'choose', event: 'social-make-love', choice: 'accept' } as const;
  assert.match(advance(createLife(30), action).error ?? '', /age 18/);
  assert.match(advance(single, { ...action, person: single.family[0]!.id }).error ?? '', /adult friend/);
  assert.ok(relationshipControls(single, friend).some((item) => item.label === 'Make Love'));
  forceRoll(single, `intimacy:${friend.id}:private`);
  const invited = act(single, action);
  const first = act(decodeLife(JSON.stringify(invited)), choice);
  const second = act(act(first, action), choice);
  assert.equal(first.notices.at(-1)?.title, 'A Private Evening');
  assert.equal(second.notices.at(-1)?.title, 'A Private Evening');
  assert.notEqual(first.journal.at(-1)?.text, second.journal.at(-1)?.text);
  assert.deepEqual(second.social.romances, []);

  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  assert.ok(relationshipControls(life, spouse).some((item) => item.label === 'Make Love'));
  forceRoll(life, `intimacy:${id}:private`);
  const together = act(act(life, { ...action, person: id }), choice);
  assert.equal(together.notices.at(-1)?.title, 'A Private Evening');
  assert.equal(romanceFor(together, id)?.status, 'married');

  ensureNpc(single, friend).preferences = [single.character.gender === 'man' ? 'woman' : 'man'];
  const declined = act(act(single, action), choice);
  assert.equal(declined.notices.at(-1)?.title, 'Invitation Declined');
  assert.deepEqual(findContact(declined, friend.id)!.bond, friend.bond);
  assert.match(advance(declined, action).error ?? '', /already declined/);
});

test('Hook Up keeps the match and choice through reload and remains a one-night encounter', () => {
  const action = { type: 'intimacy', encounter: 'hookup' } as const;
  const invited = decodeLife(JSON.stringify(act(adult(), action)));
  assert.equal(eventPopup(invited)?.title, 'Hook Up');
  const id = invited.social.pendingPerson!;
  assert.ok(findContact(invited, id)!.age >= 18);
  const accepted = act(invited, { type: 'choose', event: 'social-hookup', choice: 'accept' });
  assert.equal(accepted.notices.at(-1)?.title, 'A Night Together');
  assert.equal(romanceFor(accepted, id), undefined);
  assert.deepEqual(accepted.social.children, {});
  assert.match(advance(accepted, action).error ?? '', /this year/);
  assert.ok(advance(accepted, { type: 'dating-match', source: 'app' }).life);
  const passed = act(invited, { type: 'choose', event: 'social-hookup', choice: 'pass' });
  assert.equal(passed.character.attributes.happiness, invited.character.attributes.happiness);
  assert.equal(passed.social.pendingPerson, null);
});

test('a group invitation validates both saved adults and requires both to consent', () => {
  const life = adult();
  const first = knownFriend(life);
  const second = { ...makeNpc(life, 'npc-private-friend', 27, 'Acquaintance'), friend: true };
  life.social.people.push(second);
  for (const contact of [first, second]) {
    Object.assign(contact.bond, { affection: 90, trust: 92, compatibility: 90 });
    ensureNpc(life, contact).preferences = [...new Set([life.character.gender, first.gender, second.gender])];
  }
  const action = { type: 'intimacy', encounter: 'threesome', first: first.id, second: second.id } as const;
  assert.match(advance(life, { ...action, second: first.id }).error ?? '', /two different/);
  while (npcRandom(life, `intimacy:${first.id}:${second.id}`, life.year).next() >= .25 ||
    npcRandom(life, `intimacy:${second.id}:${first.id}`, life.year).next() >= .25) life.seed++;
  const invited = decodeLife(JSON.stringify(act(life, action)));
  const story = eventPopup(invited)?.text ?? '';
  for (const person of [first, second]) assert.ok(story.includes(person.name));
  assert.throws(() => decodeLife(JSON.stringify({ ...invited, social: { ...invited.social, pendingGuest: first.id } })), /social|relationship/i);
  const choice = { type: 'choose', event: 'social-threesome', choice: 'accept' } as const;
  const accepted = act(invited, choice);
  assert.equal(accepted.social.pendingGuest, undefined);
  assert.equal(accepted.notices.at(-1)?.title, 'Just the Three of Us');
  for (const person of [first, second]) assert.equal(findContact(accepted, person.id)!.bond.trust, person.bond.trust + 2);

  ensureNpc(invited, findContact(invited, second.id)!).preferences = [life.character.gender === 'man' ? 'woman' : 'man'];
  const declined = act(invited, choice);
  assert.equal(declined.notices.at(-1)?.title, 'Invitation Declined');
  for (const person of [first, second]) assert.deepEqual(findContact(declined, person.id)!.bond, person.bond);
  assert.equal(declined.character.attributes.happiness, life.character.attributes.happiness);
  assert.deepEqual(decodeLife(JSON.stringify(declined)), declined);
});

test('Love introductions are adult-only and keep the match and response after reload', () => {
  assert.match(advance(createLife(30), { type: 'dating-match', source: 'date' }).error ?? '', /age 18/);
  const stories = new Set<string>();
  for (const source of datingSources) {
    const matched = act(adult(), { type: 'dating-match', source });
    const restored = decodeLife(JSON.stringify(matched));
    assert.deepEqual(restored, matched);
    const person = findContact(restored, restored.social.pendingPerson!)!;
    assert.ok(person.age >= 18 && ensureNpc(restored, person).preferences.includes(restored.character.gender));
    if (source === 'lgbtq') assert.ok(ensureNpc(restored, person).preferences.includes(person.gender));
    if (source === 'spotlight') assert.equal(ensureNpc(restored, person).status, 'employed');
    stories.add(restored.journal.at(-2)!.text);
    const result = act(restored, { type: 'choose', event: restored.pending!, choice: source === 'casual' ? 'accept' : 'pass' });
    assert.equal(result.social.pendingPerson, null);
    assert.equal(activeRomances(result).length, 0);
    assert.match(advance(result, { type: 'dating-match', source: 'app' }).error ?? '', /this year/);
  }
  assert.equal(stories.size, datingSources.length);
});

test('exclusive partners may discover actual violations and respond to how I handle them', () => {
  const first = acceptMatch(adult(), 'date');
  const firstId = activeRomance(first)!.person;
  const partner = findContact(first, firstId)!;
  Object.assign(partner.bond, { affection: 80, trust: 76, familiarity: 75, respect: 65, compatibility: 74 });
  ensureNpc(first, partner).traits.loyalty = 70;
  setAgreement(first, firstId, 'exclusive');
  const both = acceptMatch(age(first), 'app');
  const partners = activeRomances(both);
  assert.equal(partners.length, 2);
  assert.equal(relationshipGroups(both).partners.length, 2);
  assert.deepEqual(decodeLife(JSON.stringify(both)), both);

  let discovery: Life | undefined;
  let undiscovered = false;
  for (let offset = 0; offset < 60; offset++) {
    const candidate = act({ ...both, seed: both.seed + offset }, { type: 'age' });
    if (candidate.pending === 'social-affair') discovery ??= candidate;
    else undiscovered ||= activeRomances(candidate).length === 2;
    if (discovery && undiscovered) break;
  }
  assert.ok(discovery && undiscovered);
  const restored = decodeLife(JSON.stringify(discovery));
  const discoverer = restored.social.pendingPerson!;
  const other = partners.find(({ person }) => person !== discoverer)!.person;
  const popup = eventPopup(restored);
  assert.equal(popup?.title, 'Caught Dating');
  for (const id of [discoverer, other]) assert.ok(popup.text.includes(findContact(restored, id)!.name));
  const honest = act(restored, { type: 'choose', event: 'social-affair', choice: 'apologize' });
  const denied = act(restored, { type: 'choose', event: 'social-affair', choice: 'deny' });
  for (const result of [honest, denied]) {
    assert.equal(result.social.pendingPerson, null);
    assert.equal(romanceFor(result, other)?.status, 'dating');
    assert.deepEqual(decodeLife(JSON.stringify(result)), result);
  }
  assert.equal(romanceFor(honest, discoverer)?.ended, null);
  const space = act(restored, { type: 'choose', event: 'social-affair', choice: 'space' });
  assert.equal(relationshipState(space, discoverer)?.apartUntil, space.year + 1);
  assert.ok(visibleConcerns(honest, discoverer).some(({ kind }) => kind === 'boundary'));
  assert.ok(findContact(denied, discoverer)!.bond.trust < findContact(honest, discoverer)!.bond.trust);
});

test('a severe betrayal can end a marriage while preserving the other relationship and settlement', () => {
  const { life, id } = marry();
  const both = acceptMatch(age(life), 'app');
  const other = activeRomances(both).find(({ person }) => person !== id)!.person;
  const proposal = { type: 'romance', person: other, action: 'propose' } as const;
  assert.match(loveIssue(both, proposal) ?? '', /one engagement or marriage/);
  const spouse = findContact(both, id)!;
  Object.assign(spouse.bond, { trust: 12, affection: 14, compatibility: 20, respect: 20, resentment: 75 });
  let discovered: Life | undefined;
  for (let offset = 0; offset < 60; offset++) {
    const candidate = act({ ...both, seed: both.seed + offset }, { type: 'age' });
    if (candidate.pending === 'social-affair' && candidate.social.pendingPerson === id) {
      discovered = candidate;
      break;
    }
  }
  assert.ok(discovered);
  const amount = Math.min(5000, Math.floor(discovered.character.bank * .08));
  const divorced = act(discovered, { type: 'choose', event: 'social-affair', choice: 'deny' });
  assert.equal(romanceFor(divorced, id)?.status, 'divorced');
  assert.equal(romanceFor(divorced, other)?.status, 'dating');
  assert.equal(divorced.character.bank, discovered.character.bank - amount);
  assert.equal(divorced.transactions.reduce((sum, entry) => sum + entry.amount, 0), divorced.character.bank);
  assert.deepEqual(decodeLife(JSON.stringify(divorced)), divorced);
});

test('mutual non-exclusivity preserves concurrent partners without making breach evidence', () => {
  const first = acceptMatch(adult(), 'date');
  const firstId = activeRomance(first)!.person;
  const agreement = (life: Life, person: string) => {
    forceRoll(life, `agreement:${person}:non-exclusive`, .2);
    return act(life, { type: 'relationship-care', person, action: 'non-exclusive' });
  };
  const both = acceptMatch(age(agreement(first, firstId)), 'app');
  const second = activeRomances(both).find(({ person }) => person !== firstId)!.person;
  const arranged = agreement(both, second);
  for (const id of [firstId, second]) {
    assert.equal(agreementFor(arranged, id), 'non-exclusive');
    assert.equal(romanceFor(arranged, id)?.status, 'committed');
    assert.ok(!relationshipState(arranged, id)?.conflicts.some(({ kind }) => kind === 'boundary'));
  }
  assert.match(advance(arranged, { type: 'relationship-care', person: firstId, action: 'exclusive' }).error ?? '', /other active/);
  assert.deepEqual(decodeLife(JSON.stringify(arranged)), arranged);
});

test('getting to know someone, first date, and commitment have distinct states', () => {
  const invited = act(adult(), { type: 'dating-match', source: 'app' });
  const id = invited.social.pendingPerson!;
  const slow = act(invited, { type: 'choose', event: 'social-dating-match', choice: 'slow' });
  assert.equal(romanceFor(slow, id)?.status, 'getting-to-know');
  assert.equal(activeRomance(slow), undefined);
  assert.ok(relationshipState(slow, id)?.milestones.meeting);
  const person = findContact(slow, id)!;
  assert.ok(attraction(slow, person) > 0);
  forceRoll(slow, `advance:${id}`, .03);
  const dated = act(slow, { type: 'romance', person: id, action: 'ask' });
  assert.equal(agreementFor(dated, id), 'casual');
  assert.ok(relationshipState(dated, id)?.milestones.date);
  assert.match(loveIssue(age(dated), { type: 'romance', person: id, action: 'propose' }) ?? '', /commitment/);
});

test('distance separates physical visits from remote calls, and blocked promises survive reload', () => {
  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  spouse.city = cities.find((city) => city !== life.character.city)!;
  const date = { type: 'romance', person: id, action: 'date' } as const;
  assert.match(loveIssue(life, date) ?? '', /different cities/);
  let connected = act(life, { type: 'relationship-care', person: id, action: 'phone' });
  connected = act(connected, { type: 'relationship-care', person: id, action: 'visit' });
  assert.equal(loveIssue(connected, date), null);
  assert.equal(findContact(connected, id)?.city, spouse.city);
  assert.ok(connected.character.bank < life.character.bank);
  assert.deepEqual(decodeLife(JSON.stringify(connected)), connected);

  const single = adult();
  const friend = knownFriend(single);
  openConcern(single, friend.id, 'argument', 56);
  const promised = act(single, { type: 'relationship-care', person: friend.id, action: 'promise-time' });
  const after = age(age(promised));
  assert.equal(relationshipState(after, friend.id)?.promise?.status, 'broken');
  assert.ok(visibleConcerns(after, friend.id).some(({ kind }) => kind === 'promise'));
  assert.deepEqual(decodeLife(JSON.stringify(after)), after);
});

test('apologies leave serious conflicts open and reconciliation requires follow-through in another year', () => {
  const { life, id } = marry();
  openConcern(life, id, 'argument', 56);
  forceRoll(life, `bond:${id}:apologize:0`, .2);
  let repaired = act(life, { type: 'romance', person: id, action: 'apologize' });
  assert.ok(visibleConcerns(repaired, id).some((entry) => entry.state === 'repairing' && entry.severity > 0));
  const reconcile = { type: 'relationship-care', person: id, action: 'reconcile' } as const;
  assert.match(advance(repaired, reconcile).error ?? '', /more than one year/);
  repaired = act(repaired, { type: 'relationship-care', person: id, action: 'promise-support' });
  forceRoll(repaired, `bond:${id}:support:1`, .2);
  repaired = act(repaired, { type: 'romance', person: id, action: 'support' });
  assert.equal(relationshipState(repaired, id)?.promise?.status, 'kept');
  repaired = age(repaired);
  forceRoll(repaired, `reconciliation:${id}`, .1);
  repaired = act(repaired, reconcile);
  assert.ok(relationshipState(repaired, id)?.milestones.reconciliation);
  assert.ok(relationshipState(repaired, id)?.conflicts.some((entry) => entry.state === 'resolved'));
});

test('an NPC can independently end a long, unhealthy relationship', () => {
  const life = acceptMatch(adult(), 'date');
  const id = activeRomance(life)!.person;
  const person = findContact(life, id)!;
  Object.assign(person.bond, { affection: 12, trust: 8, respect: 8, resentment: 80, compatibility: 10 });
  const issue = openConcern(life, id, 'neglect', 80);
  issue.year -= 1;
  issue.id = `concern:${id}:neglect:${issue.year}`;
  while (npcRandom(life, `romance-discovery:${id}`, life.year + 1).next() >= .22) life.seed++;
  const ended = age(life);
  assert.equal(romanceFor(ended, id)?.status, 'broken-up');
  assert.equal(relationshipState(ended, id)?.endedBecause, 'neglect');
  assert.ok(ended.notices.some(({ title }) => title === 'Their Decision'));
  assert.deepEqual(decodeLife(JSON.stringify(ended)), ended);
});

test('V10 saves preserve concurrent partners and pending decisions without fabricating agreements', () => {
  const life = acceptMatch(age(acceptMatch(adult(), 'date')), 'app');
  const first = activeRomance(life)!.person;
  life.pending = 'social-affair';
  life.seen.push('social-affair');
  life.social.pendingPerson = first;
  const old = { ...life, version: 10, social: { ...life.social, relationships: undefined } };
  const restored = decodeLife(JSON.stringify(old));
  assert.equal(restored.version, 11);
  assert.equal(agreementFor(restored, first), 'legacy');
  assert.deepEqual(restored.social.relationships, {});
  assert.deepEqual(restored.social.romances, life.social.romances);
  assert.deepEqual(restored.wealth, life.wealth);
  assert.equal(restored.random, life.random);
  assert.equal(restored.pending, life.pending);
  assert.equal(restored.social.pendingPerson, first);
});

test('V6 migration preserves old NPCs, illnesses, homes and decisions, with reproducible personality', () => {
  let life = adult();
  const friend = knownFriend(life);
  life = act(life, { type: 'buy-asset', id: 'cedar-starter' });
  life = act(life, { type: 'move-into-home', id: 'cedar-starter' });
  startIllness(life, 'cold', findContact(life, friend.id)!);
  const legacyProperty = { residence: 'cedar-starter', owned: life.property.owned.map(({ id, year, source }) => ({ id, year, source })) };
  const snapshot = JSON.stringify({ ...life, version: 6, social: undefined, property: legacyProperty });
  const restored = decodeLife(snapshot);
  assert.equal(restored.version, 11);
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
  assert.equal(restored.version, 11);
  assert.deepEqual(restored.skills.entries, {});
  for (const key of ['journal', 'notices', 'transactions', 'random', 'character'] as const) {
    assert.deepEqual(restored[key], housed[key]);
  }
  assert.deepEqual(restored.social, { ...housed.social, relationships: {} });
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
