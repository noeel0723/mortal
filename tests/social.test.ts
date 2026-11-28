import { newWorld } from '../src/engine/world.ts';
import { localExpense } from '../src/engine/pricing.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { datingIntent, defaultDatingProfile, npcLooks } from '../src/engine/dating.ts';
import { discoveryEvent, pendingDatingProfile } from '../src/engine/datingDiscovery.ts';
import { candidateNetWorth, datingPool, matchesSearch } from '../src/engine/datingPool.ts';
import type { DatingPreferences } from '../src/engine/dating.ts';
import { eventById } from '../src/data/events.ts';
import { employers } from '../src/data/employers.ts';
import { jobById } from '../src/data/jobs.ts';
import { npcGivenNames, npcSurnames } from '../src/data/npcNames.ts';
import { createLife } from '../src/engine/create.ts';
import { ageFamilyOpportunities, annualChildcare } from '../src/engine/familyLife.ts';
import { annualFinance } from '../src/engine/finance.ts';
import { canAccompany, startIllness } from '../src/engine/health.ts';
import { firstDateOutcome, firstDatePrice, firstDateVenues } from '../src/engine/firstDates.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { activeRomance, activeRomances, changeRomance, endRomance, loveIssue, romanceFor } from '../src/engine/love.ts';
import { annualLoveSearches, consumeLoveSearch } from '../src/engine/loveSearch.ts';
import { pendingMeeting } from '../src/engine/meetings.ts';
import { advanceNpcLives, allContacts, ensureNpc, initialNpcProfile, makeNpc, npcRandom, syncNpcs } from '../src/engine/npcs.ts';
import { assessEncounterHealth, barrierFee, pregnancyFactor, protectionEvent } from '../src/engine/reproductiveHealth.ts';
import { qualifiedNpc, validNpcProgram } from '../src/engine/npcQualifications.ts';
import { createSchoolClass, findContact } from '../src/engine/school.ts';
import { advanceEarlyConnections, agreementFor, attraction, boundaryEvidence, careIssue, knownRelationship, openConcern,
  relationshipMemory, relationshipState, setAgreement, visibleConcerns, visitFee } from '../src/engine/relationships.ts';
import { cities } from '../src/data/veyra.ts';
import { advance } from '../src/engine/simulation.ts';
import { offerSocialEvent } from '../src/engine/socialEvents.ts';
import { ensureWorkplace } from '../src/engine/workplace.ts';
import { datingSources } from '../src/engine/socialTypes.ts';
import type { Action, CommunityFriend, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { assetDetails, householdRows, ownedListings } from '../src/propertyView.ts';
import { datingCandidates, familyTreeGroups, firstDateControls, friendshipLabel, relationshipCareControls, relationshipControls, relationshipGroups, socialRole } from '../src/socialView.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function completeEncounter(life: Life, choice: Extract<Action, { type: 'choose' }>, method = 'barrier') {
  const protection = act(life, choice);
  assert.equal(protection.pending, protectionEvent);
  return act(protection, { type: 'choose', event: protectionEvent, choice: method });
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

test('NPCs use 150 added names in each pool and avoid surnames shared by existing acquaintances', () => {
  const given = Object.values(npcGivenNames).flat();
  assert.equal(given.length, 174);
  assert.equal(new Set(given).size, 174);
  assert.equal(npcSurnames.length, 158);
  assert.equal(new Set(npcSurnames).size, 158);
  const life = adult();
  const oldNames = ['Mara Forrest', 'Ilan Forrest', 'Vale Forrest'];
  oldNames.forEach((name, index) => {
    const person = makeNpc(life, `npc-old-${index}`, 25, 'Acquaintance', name);
    life.social.people.push(person);
    ensureNpc(life, person);
  });
  const restored = decodeLife(JSON.stringify(life));
  assert.deepEqual(restored.social.people.map(({ name }) => name), oldNames);
  restored.schoolContacts.push(...createSchoolClass(restored, 'primary'));
  ensureWorkplace(restored, employers[0]!.id);
  const newcomer = makeNpc(restored, 'npc-newcomer', 25, 'Acquaintance');
  const generated = [...restored.schoolContacts, ...restored.career.contacts, newcomer];
  assert.equal(new Set(generated.map(({ lastName }) => lastName)).size, generated.length);
  assert.ok(generated.every(({ lastName }) => lastName && lastName !== 'Forrest'));
});

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

function openNotice(life: Life, title: string) {
  while (life.notices[0]?.title !== title) {
    const notice = life.notices[0];
    assert.ok(notice, `Missing ${title}`);
    life = act(life, notice.details?.kind === 'death' && !life.character.causeOfDeath
      ? { type: 'respond-death', entry: notice.entry, response: 'skip' }
      : { type: 'acknowledge-event', entry: notice.entry });
  }
  return life;
}

test('a wedding lets either spouse adopt the other surname without changing portraits or identity', () => {
  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  const surname = life.character.lastName = 'De la Cruz';
  let wedding = openNotice(life, 'Wedding Day');
  const popup = eventPopup(wedding)!;
  assert.equal(popup.portrait?.name, spouse.name);
  assert.match(popup.actions[0]!.label, /Take Their Surname/);
  assert.match(popup.actions[1]!.label, /They Take My Surname/);
  const renamed = act(wedding, popup.actions[1]!.action);
  const person = findContact(renamed, id)!;
  assert.equal(person.lastName, surname);
  assert.equal(person.id, id);
  assert.deepEqual(person.appearance, spouse.appearance);
  assert.equal(findContact(wedding, id)!.name, spouse.name);
  assert.deepEqual(decodeLife(JSON.stringify(renamed)), renamed);
  wedding = act(wedding, popup.actions[0]!.action);
  assert.equal(wedding.character.lastName, spouse.name.split(' ').at(-1));
});

test('pregnancy from Make Love persists until the next age up, followed by a newborn surname choice', () => {
  for (const playerGender of ['man', 'woman'] as const) {
    const initial = adult();
    initial.character.gender = playerGender;
    initial.character.lastName = 'De la Cruz';
    const partner = knownFriend(initial);
    partner.gender = playerGender === 'man' ? 'woman' : 'man';
    initial.social.romances.push({ person: partner.id, status: 'dating', started: initial.year,
      engagement: null, wedding: null, ended: null, history: [] });
    const invite = { type: 'intimacy', encounter: 'make-love', person: partner.id } as const;
    const choice = { type: 'choose', event: 'social-make-love', choice: 'accept' } as const;
    let life = act(initial, invite);
    for (;; life.seed++) {
      if (npcRandom(life, `intimacy:${partner.id}:private`, life.year).next() < .25 &&
        npcRandom(life, `protection-consent:${partner.id}:no-barrier:social-make-love`, life.year).next() < .4 &&
        npcRandom(life, `pregnancy:${partner.id}:${life.journal.length + 1}`, life.year).next() < .22) break;
    }
    life = completeEncounter(life, choice, 'no-barrier');
    const expected = { mother: playerGender === 'woman' ? 'self' : partner.id, father: playerGender === 'man' ? 'self' : partner.id, dueYear: life.year + 1 };
    assert.deepEqual(life.social.pregnancies, [expected]);
    assert.equal(Object.keys(life.social.children).length, 0);
    assert.deepEqual(completeEncounter(act(life, invite), choice, 'no-barrier').social.pregnancies, [expected]);
    life = openNotice(decodeLife(JSON.stringify(life)), 'Pregnancy');
    assert.match(eventPopup(life)!.text, /nine months/);
    life = act(life, eventPopup(life)!.actions[0]!.action);
    life = openNotice(age(life), 'A New Arrival');
    assert.equal(life.year, expected.dueYear);
    assert.equal(life.social.pregnancies, undefined);
    const child = life.social.people.find(({ role }) => role === 'Child')!;
    const popup = eventPopup(decodeLife(JSON.stringify(life)))!;
    assert.equal(popup.portrait?.age, 0);
    assert.deepEqual(popup.portrait?.appearance, child.appearance);
    assert.match(popup.actions[0]!.label, /^Mother’s Surname/);
    assert.match(popup.actions[1]!.label, /^Father’s Surname/);
    life = act(life, popup.actions[playerGender === 'man' ? 0 : 1]!.action);
    const named = findContact(life, child.id)!;
    assert.equal(named.name, `${child.name.replace(/ De la Cruz$/, '')} ${partner.name.split(' ').at(-1)}`);
    assert.deepEqual(life.social.parents[child.id], ['self', partner.id]);
    assert.equal(Object.keys(age(life).social.children).length, 1);
  }
});

test('a 15-year-old learns to drive before borrowing and returning an owned vehicle', () => {
  const initial = adult();
  initial.character.age += 9;
  initial.year += 9;
  initial.world = newWorld(initial.seed, initial.year, true);
  for (const parent of initial.family) parent.age += 9;
  const spouse = knownFriend(initial);
  spouse.age = initial.character.age;
  initial.social.profiles[spouse.id]!.born = initial.character.birthYear;
  const child = makeNpc(initial, 'npc-teen', 14, 'Child');
  initial.social.people.push(child);
  ensureNpc(initial, child);
  initial.social.parents[child.id] = ['self', spouse.id];
  initial.social.children[child.id] = { year: initial.year - child.age, adopted: false, wellbeing: 80, learning: 45, confidence: 60, supportEnded: false };
  let life = act(initial, { type: 'buy-asset', id: 'toyota-yaris' });
  const asset = ownedListings(life)[0]!;
  const action = { type: 'family-driving', person: child.id, asset: asset.ownershipId, mode: 'lend' } as const;
  assert.match(advance(life, action).error ?? '', /age 15/);
  assert.ok(householdRows(life).some(({ key }) => key === child.id));
  assert.equal(assetDetails(life, asset).driving.length, 0);
  life = openNotice(age(life), 'Driving Lesson');
  assert.match(advance(life, action).error ?? '', /Teach them/);
  const lesson = eventPopup(decodeLife(JSON.stringify(life)))!;
  assert.match(lesson.text, /Toyota Yaris/);
  assert.match(lesson.actions[0]!.label, /Teach Them/);
  life = act(life, lesson.actions[0]!.action);
  assert.deepEqual(life.social.children[child.id]!.driving, ['cars']);
  const before = life.property.owned[0]!;
  life = act(life, action);
  assert.equal(life.notices.at(-1)?.title, 'Vehicle Returned');
  assert.equal(life.property.owned[0]!.condition, before.condition - 2);
  assert.equal(life.property.owned[0]!.history.at(-1)?.action, 'borrow');
  assert.match(advance(life, action).error ?? '', /next year/);
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

function legacyMatch(life: Life, source: 'date' | 'app') {
  const matched = decodeLife(JSON.stringify(life));
  const attempt = consumeLoveSearch(matched, source);
  const age = Math.max(18, life.character.age + npcRandom(life, `match:${source}:${attempt}`, life.year).integer(-4, 4));
  const person = makeNpc(matched, `npc-dating-${source}-${life.year}-${attempt}`, age, 'Acquaintance');
  matched.social.people.push(person);
  const profile = ensureNpc(matched, person);
  profile.preferences = [...new Set([matched.character.gender, ...profile.preferences])];
  relationshipMemory(matched, person.id, 'meeting', 2);
  matched.social.pendingPerson = person.id;
  matched.pending = 'social-dating-match';
  if (!matched.seen.includes(matched.pending)) matched.seen.push(matched.pending);
  return decodeLife(JSON.stringify(matched));
}

function acceptMatch(life: Life, source: 'date' | 'app') {
  const matched = legacyMatch(life, source);
  return act(matched, { type: 'choose', event: 'social-dating-match', choice: 'accept' });
}

test('five annual searches per Love activity give different candidates and declined matches do not fill Relationships', () => {
  let life = adult();
  const search = [
    { type: 'intimacy', encounter: 'hookup' },
    { type: 'dating-match', source: 'app' },
    { type: 'dating-match', source: 'lgbtq' },
    { type: 'dating-match', source: 'date' },
  ] as const;
  for (const action of search) {
    const ids = new Set<string>();
    for (let attempt = 0; attempt < annualLoveSearches; attempt++) {
      const invited = decodeLife(JSON.stringify(act(life, action)));
      const id = invited.social.pendingPerson ?? pendingDatingProfile(invited)?.person.id;
      if (!id) {
        const notice = invited.notices.at(-1)!;
        assert.equal(notice.title, 'No Suitable Profiles');
        life = act(invited, { type: 'acknowledge-event', entry: notice.entry });
        continue;
      }
      assert.ok(!relationshipGroups(invited).acquaintances.some((person) => person.id === id));
      ids.add(id);
      life = act(invited, { type: 'choose', event: invited.pending!, choice: 'pass' });
      assert.equal(findContact(life, id), undefined);
    }
    assert.ok(ids.size >= (action.type === 'intimacy' ? 5 : 1));
    assert.match(advance(life, action).error ?? '', /all 5 searches this year/);
  }
  life = age(life);
  assert.ok(advance(life, search[0]!).life);
});

test('a social activity stages a full profile and adds the newcomer only when you talk', () => {
  const initial = adult();
  const met = act(initial, { type: 'meet', source: 'neighborhood' });
  const popup = eventPopup(met)!;
  const guest = pendingMeeting(met)!.person;
  assert.ok(popup.portrait?.role.includes('Age'));
  assert.deepEqual(popup.profileMeters?.map(({ label }) => label), ['Health', 'Looks', 'Compatibility']);
  assert.equal(findContact(met, guest.id), undefined);
  assert.deepEqual(eventPopup(decodeLife(JSON.stringify(met))), popup);
  const declined = act(met, popup.actions[1]!.action);
  assert.equal(declined.social.pendingMeeting, undefined);
  assert.equal(findContact(declined, guest.id), undefined);
  const accepted = act(met, popup.actions[0]!.action);
  assert.equal(relationshipGroups(accepted).acquaintances[0]?.id, guest.id);
  assert.deepEqual(findContact(accepted, guest.id)?.appearance, guest.appearance);
  assert.equal(advance(accepted, { type: 'meet', source: 'hobbies' }).life?.pending, 'social-meeting');
});

test('spending time with all writes a different story for each available contact and includes remote calls', () => {
  const { life, id } = marry();
  const far = makeNpc(life, 'npc-remote', 24, 'Acquaintance');
  far.city = cities.find((city) => city !== life.character.city)!;
  const nearby = makeNpc(life, 'npc-neighbor', 25, 'Acquaintance');
  const deceased = makeNpc(life, 'npc-deceased', 25, 'Acquaintance');
  deceased.alive = false;
  life.social.people.push(far, nearby, deceased);
  syncNpcs(life);
  life.character.attributes.energy = 0;
  const batch = act(life, { type: 'spend-time-all' });
  const stories = batch.journal.slice(life.journal.length, -1);
  const spouse = findContact(life, id)!;
  for (const person of [...life.family, spouse, far, nearby]) {
    assert.equal(stories.filter(({ text }) => text.includes(person.name)).length, 1);
  }
  assert.ok(stories.some(({ text }) => text.includes(far.name) && /call|phone/.test(text)));
  assert.ok(stories.every(({ text }) => !text.includes(deceased.name)));
  assert.equal(batch.character.attributes.energy, 0);
  assert.equal(batch.notices.at(-1)?.title, 'Time With Everyone');
  assert.match(advance(batch, { type: 'spend-time-all' }).error ?? '', /next year/);
  assert.deepEqual(decodeLife(JSON.stringify(batch)), batch);
});

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
  const first = completeEncounter(decodeLife(JSON.stringify(invited)), choice);
  const second = completeEncounter(act(first, action), choice);
  const notice = first.notices.find(({ title }) => title === 'A Private Evening')!;
  const scores = notice.details;
  assert.equal(scores?.kind, 'enjoyment');
  assert.deepEqual(scores.scores.map(({ person }) => person), ['self', friend.id]);
  assert.deepEqual(decodeLife(JSON.stringify(first)).notices.find(({ entry }) => entry === notice.entry)?.details, scores);
  assert.equal(second.notices.at(-1)?.title, 'A Private Evening');
  assert.notEqual(first.journal[notice.entry]?.text, second.journal.at(-1)?.text);
  assert.deepEqual(second.social.romances, []);
  assert.equal(second.social.pregnancies, undefined);

  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  assert.ok(relationshipControls(life, spouse).some((item) => item.label === 'Make Love'));
  forceRoll(life, `intimacy:${id}:private`);
  const together = completeEncounter(act(life, { ...action, person: id }), choice);
  assert.ok(together.notices.some(({ title }) => title === 'A Private Evening'));
  assert.equal(romanceFor(together, id)?.status, 'married');

  ensureNpc(single, friend).preferences = [single.character.gender === 'man' ? 'woman' : 'man'];
  const declined = completeEncounter(act(single, action), choice);
  assert.equal(declined.notices.at(-1)?.title, 'Invitation Declined');
  assert.equal(declined.notices.at(-1)?.details, undefined);
  assert.deepEqual(findContact(declined, friend.id)!.bond, friend.bond);
  assert.match(advance(declined, action).error ?? '', /already declined/);
});

test('Hook Up keeps the match and choice through reload and remains a one-night encounter', () => {
  const action = { type: 'intimacy', encounter: 'hookup' } as const;
  const invited = decodeLife(JSON.stringify(act(adult(), action)));
  const id = invited.social.pendingPerson!;
  const person = findContact(invited, id)!;
  assert.ok(person.age >= 18);
  assert.deepEqual(invited.social.profiles[id]?.preferences, initialNpcProfile(invited, person).preferences);
  const popup = eventPopup(invited);
  assert.equal(popup?.title, 'Hook Up');
  assert.deepEqual(popup.portrait, { appearance: person.appearance, name: person.name, age: person.age,
    role: `Age ${person.age} · ${person.occupation}` });
  assert.equal(popup.match?.looks, npcLooks(invited, person));
  assert.ok(popup.match.looks! >= 0 && popup.match.looks! <= 100);
  const accepted = completeEncounter(invited, { type: 'choose', event: 'social-hookup', choice: 'accept' });
  assert.ok(accepted.notices.some(({ title }) => title === 'A Night Together'));
  const result = eventPopup(decodeLife(JSON.stringify(accepted)));
  assert.equal(result?.enjoyment?.length, 2);
  assert.deepEqual(result.enjoyment.map(({ key }) => key), ['self', id]);
  assert.ok(result.enjoyment.every(({ value }) => Number.isInteger(value) && value >= 0 && value <= 100));
  assert.equal(romanceFor(accepted, id), undefined);
  assert.equal(accepted.character.bank, invited.character.bank - barrierFee(invited));
  assert.deepEqual(accepted.social.children, {});
  assert.ok(advance(accepted, action).life);
  assert.ok(advance(accepted, { type: 'dating-match', source: 'app' }).life);
  const passed = act(invited, { type: 'choose', event: 'social-hookup', choice: 'pass' });
  assert.equal(passed.character.attributes.happiness, invited.character.attributes.happiness);
  assert.equal(passed.social.pendingPerson, null);
  assert.equal(findContact(passed, id), undefined);
  const canceled = completeEncounter(invited, { type: 'choose', event: 'social-hookup', choice: 'accept' }, 'pass');
  assert.equal(canceled.character.bank, invited.character.bank);
  assert.equal(canceled.reproductive, undefined);
  assert.equal(findContact(canceled, id), undefined);
});

test('protection is a saved choice, and a refusal or unavailable fee cannot trigger an encounter', () => {
  const life = adult();
  const person = knownFriend(life);
  forceRoll(life, `intimacy:${person.id}:private`);
  life.reproductive = { [person.id]: { cases: { chlamydia: { year: life.year, diagnosed: true } } } };
  const invitation = act(life, { type: 'intimacy', encounter: 'make-love', person: person.id });
  const protectedChoice = act(decodeLife(JSON.stringify(invitation)), { type: 'choose', event: 'social-make-love', choice: 'accept' });
  assert.equal(protectedChoice.pending, protectionEvent);
  assert.equal(protectedChoice.social.pendingPerson, person.id);
  assert.equal(protectedChoice.social.pendingEncounter, 'social-make-love');
  assert.deepEqual(decodeLife(JSON.stringify(protectedChoice)), protectedChoice);
  assert.throws(() => decodeLife(JSON.stringify({ ...protectedChoice, social: { ...protectedChoice.social, pendingEncounter: undefined } })), /invalid social data/);
  const refused = act(protectedChoice, { type: 'choose', event: protectionEvent, choice: 'no-barrier' });
  assert.equal(refused.notices.at(-1)?.title, 'Protection Choice Declined');
  assert.equal(refused.character.bank, life.character.bank);
  assert.deepEqual(refused.reproductive, life.reproductive);
  assert.equal(refused.social.pregnancies, undefined);
  assert.deepEqual(findContact(refused, person.id)?.bond, person.bond);

  const unpaid = decodeLife(JSON.stringify(protectedChoice));
  postTransaction(unpaid, 'Spent my balance', -unpaid.character.bank, 'other');
  assert.ok(eventPopup(unpaid)?.actions.find(({ action }) => action.type === 'choose' && action.choice === 'barrier')?.disabled);
  assert.match(advance(unpaid, { type: 'choose', event: protectionEvent, choice: 'barrier' }).error ?? '', /balance/);
  assert.equal(unpaid.pending, protectionEvent);
});

test('STI exposure uses partners and barrier protection independently of birth control and gender', () => {
  const life = adult();
  life.character.gender = 'woman';
  const source = knownFriend(life);
  source.gender = 'woman';
  const entry = 12;
  while (npcRandom(life, `clinic-exposure:${entry}:chlamydia:${source.id}:self`, life.year).next() < .07 ||
    npcRandom(life, `clinic-exposure:${entry}:chlamydia:${source.id}:self`, life.year).next() >= .26) life.seed++;
  life.reproductive = { [source.id]: { cases: { chlamydia: { year: life.year } } }, self: { cases: {}, birthControlYear: life.year } };
  const barrier = decodeLife(JSON.stringify(life));
  assessEncounterHealth(barrier, [findContact(barrier, source.id)!], true, entry);
  assert.equal(barrier.reproductive?.self?.cases.chlamydia, undefined);
  assert.equal(pregnancyFactor(barrier, 'self', false), .08);
  assert.ok(pregnancyFactor(barrier, 'self', true) < .02);
  const differentGender = decodeLife(JSON.stringify(life));
  findContact(differentGender, source.id)!.gender = 'nonbinary';
  assessEncounterHealth(differentGender, [findContact(differentGender, source.id)!], false, entry);
  assessEncounterHealth(life, [source], false, entry);
  assert.ok(life.reproductive.self?.cases.chlamydia);
  assert.deepEqual(life.reproductive, differentGender.reproductive);
  assert.deepEqual(decodeLife(JSON.stringify(life)), life);
});

test('casual follow-up keeps contact and romance distinct and respects a refusal from either person', () => {
  const invitation = act(adult(), { type: 'intimacy', encounter: 'hookup' });
  const id = invitation.social.pendingPerson!;
  const accepted = completeEncounter(invitation, { type: 'choose', event: 'social-hookup', choice: 'accept' });
  const prompted = openNotice(accepted, 'After the Encounter');
  const followup = decodeLife(JSON.stringify(prompted));
  const entry = followup.notices[0]!.entry;
  const player = findContact(followup, id)!;
  const answer = (response: 'keep-in-touch' | 'acquaintances' | 'romantic-interest' | 'end-contact') =>
    ({ type: 'respond-casual', entry, response }) as const;
  const portrait = eventPopup(followup)?.portrait;
  assert.deepEqual(portrait?.appearance, player.appearance);
  assert.equal(romanceFor(followup, id), undefined);

  const closed = act(followup, answer('end-contact'));
  assert.equal(closed.social.profiles[id]?.casualContact, 'closed');
  assert.deepEqual(findContact(closed, id)?.appearance, player.appearance);
  assert.deepEqual(closed.social.parents, followup.social.parents);
  assert.match(careIssue(closed, player, 'message') ?? '', /ended/);
  const acquaintance = act(followup, answer('acquaintances'));
  assert.equal(acquaintance.social.profiles[id]?.casualContact, undefined);
  assert.equal(romanceFor(acquaintance, id), undefined);
  assert.match(advance(acquaintance, answer('end-contact')).error ?? '', /no longer/);

  while (npcRandom(followup, `casual-contact:${id}:${entry}`, followup.year).next() >= .1 ||
    npcRandom(followup, `casual-romance:${id}:${entry}`, followup.year).next() >= .1) followup.seed++;
  const connected = act(followup, answer('keep-in-touch'));
  assert.equal(romanceFor(connected, id), undefined);
  assert.equal(careIssue(connected, player, 'message'), null);
  const mutual = act(followup, answer('romantic-interest'));
  assert.equal(romanceFor(mutual, id)?.status, 'getting-to-know');
  assert.equal(activeRomance(mutual), undefined);
  assert.deepEqual(act(decodeLife(JSON.stringify(followup)), answer('romantic-interest')), mutual);
  while (npcRandom(followup, `casual-contact:${id}:${entry}`, followup.year).next() < .99) followup.seed++;
  const declined = act(followup, answer('romantic-interest'));
  assert.equal(romanceFor(declined, id), undefined);
  assert.equal(declined.social.profiles[id]?.casualContact, 'closed');
});

test('the bounded pool is unchanged by player preferences and app filters only select existing profiles', () => {
  const base = adult();
  const pool = datingPool(base);
  assert.equal(pool.length, 126);
  assert.equal(new Set(pool.map(({ person }) => person.id)).size, pool.length);
  assert.equal(new Set(pool.map(({ person }) => person.city)).size, 3);
  assert.ok(new Set(pool.map(({ profile }) => profile.datingGoal)).size > 4);
  const edited = act(base, { type: 'dating-profile', profile: { ...defaultDatingProfile, age: '65-74', distance: 'any', netWorth: '1000-4999' } });
  assert.deepEqual(datingPool(decodeLife(JSON.stringify(edited))), pool);
  for (const source of ['app', 'lgbtq'] as const) {
    const matched = act(edited, { type: 'dating-match', source });
    const candidate = pendingDatingProfile(matched)!;
    const { person, profile } = candidate;
    assert.deepEqual(profile, pool[candidate.index]!.profile);
    const netWorth = candidateNetWorth(candidate);
    assert.ok(person.age >= 65 && person.age <= 74);
    assert.ok(netWorth >= 100000 && netWorth <= 499999);
    assert.deepEqual(matched.transactions, base.transactions);
    if (source === 'lgbtq') assert.ok(person.gender === 'nonbinary' || profile.preferences.includes(person.gender));
    assert.equal(findContact(matched, person.id), undefined);
    const popup = eventPopup(matched);
    assert.equal(popup?.portrait?.age, person.age);
    assert.deepEqual(popup?.portrait?.appearance, person.appearance);
    assert.deepEqual(eventPopup(decodeLife(JSON.stringify(matched))), popup);
    const invalid = { ...matched, social: { ...matched.social,
      datingCycle: { year: matched.year, viewed: [], pending: { source } } } };
    assert.throws(() => decodeLife(JSON.stringify(invalid)), /invalid social data/);
  }
  const preferences = { age: '12-17', netWorth: 'any' } as unknown as DatingPreferences;
  assert.match(advance(base, { type: 'dating-match', source: 'app', preferences }).error ?? '', /valid age range/);
  assert.match(advance(base, { type: 'dating-match', source: 'date', preferences: { age: 'any', netWorth: 'any' } }).error ?? '', /valid age range/);
});

test('a search can return no profiles without changing the pool or promoting anyone', () => {
  const base = adult();
  const distant = act(base, { type: 'dating-profile', profile: { ...defaultDatingProfile, distance: 'distant' } });
  const remote = pendingDatingProfile(act(distant, { type: 'dating-match', source: 'app' }));
  assert.ok(remote);
  assert.notEqual(remote.person.city, base.character.city);
  const result = act(distant, { type: 'dating-match', source: 'date' });
  assert.equal(eventPopup(result)?.title, 'No Suitable Profiles');
  assert.equal(result.pending, null);
  assert.deepEqual(result.social.people, distant.social.people);
  assert.deepEqual(result.transactions, distant.transactions);
  const searching = act(base, { type: 'dating-profile', profile: { ...defaultDatingProfile, goal: 'not-looking' } });
  assert.match(advance(searching, { type: 'dating-match', source: 'app' }).error ?? '', /relationship goal/);
});

test('a like produces a deterministic NPC response and only mutual matches become contacts', () => {
  const outcomes = new Set<string>();
  for (let seed = 1; seed < 60 && outcomes.size !== 3; seed++) {
    let life = adult();
    life.seed = seed;
    life = act(life, { type: 'dating-profile', profile: { ...defaultDatingProfile, goal: seed % 2 ? 'undecided' : 'marriage' } });
    const discovered = act(life, { type: 'dating-match', source: 'app' });
    const staged = pendingDatingProfile(discovered);
    if (!staged) continue;
    assert.equal(findContact(discovered, staged.person.id), undefined);
    assert.ok(matchesSearch(discovered, staged, 'app', life.social.datingProfile!));
    const like = { type: 'choose', event: discoveryEvent, choice: 'like' } as const;
    const answered = act(discovered, like);
    assert.deepEqual(act(decodeLife(JSON.stringify(discovered)), like), answered);
    const notice = answered.notices.at(-1)!;
    const story = answered.journal[notice.entry]!.text;
    if (notice.title === 'Mutual Match') {
      outcomes.add('matched');
      assert.equal(romanceFor(answered, staged.person.id)?.status, 'getting-to-know');
      assert.equal(activeRomance(answered), undefined);
      const { savings, preferences, education, job, datingGoal } = answered.social.profiles[staged.person.id]!;
      assert.deepEqual({ savings, preferences, education, job, datingGoal }, {
        savings: staged.profile.savings, preferences: staged.profile.preferences, education: staged.profile.education,
        job: staged.profile.job, datingGoal: staged.profile.datingGoal,
      });
    } else {
      outcomes.add(story.includes('different things') ? 'goals' : 'declined');
      assert.equal(findContact(answered, staged.person.id), undefined);
    }
    assert.deepEqual(decodeLife(JSON.stringify(answered)), answered);
  }
  assert.deepEqual(outcomes, new Set(['matched', 'goals', 'declined']));
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
  const accepted = completeEncounter(invited, choice);
  assert.equal(accepted.social.pendingGuest, undefined);
  const encounter = accepted.notices.find(({ title }) => title === 'Just the Three of Us')!;
  const details = encounter.details;
  assert.equal(details?.kind, 'enjoyment');
  assert.deepEqual(details.scores.map(({ person }) => person), ['self', first.id, second.id]);
  const reverse = completeEncounter(act(life, { ...action, first: second.id, second: first.id }), choice);
  const reverseScores = reverse.notices.find(({ details }) => details?.kind === 'enjoyment')?.details;
  assert.equal(reverseScores?.kind, 'enjoyment');
  assert.deepEqual(Object.fromEntries(details.scores.map(({ person, value }) => [person, value])),
    Object.fromEntries(reverseScores.scores.map(({ person, value }) => [person, value])));
  const invalid = { ...accepted, notices: [{ ...encounter, details: {
    ...details, scores: [...details.scores.slice(0, -1), { person: second.id, value: 101 }],
  } }] };
  assert.throws(() => decodeLife(JSON.stringify(invalid)), /invalid health or event/);
  for (const person of [first, second]) assert.equal(findContact(accepted, person.id)!.bond.trust, person.bond.trust + 2);

  ensureNpc(invited, findContact(invited, second.id)!).preferences = [life.character.gender === 'man' ? 'woman' : 'man'];
  const declined = completeEncounter(invited, choice);
  assert.equal(declined.notices.at(-1)?.title, 'Invitation Declined');
  for (const person of [first, second]) assert.deepEqual(findContact(declined, person.id)!.bond, person.bond);
  assert.equal(declined.character.attributes.happiness, life.character.attributes.happiness);
  assert.deepEqual(decodeLife(JSON.stringify(declined)), declined);
});

test('group outcomes keep individual benefit caps and preserve exclusive agreements and participant evidence', () => {
  const { life, id } = marry();
  const spouse = findContact(life, id)!;
  const guest = knownFriend(life);
  for (const person of [spouse, guest]) {
    Object.assign(person.bond, { affection: 95, trust: 96, compatibility: 90, resentment: 0 });
    ensureNpc(life, person).preferences = [...new Set([life.character.gender, spouse.gender, guest.gender])];
  }
  const outsider = makeNpc(life, 'npc-other-exclusive', 27, 'Acquaintance');
  life.social.people.push(outsider);
  ensureNpc(life, outsider);
  changeRomance(life, outsider.id, 'committed', 'We were together.');
  setAgreement(life, outsider.id, 'exclusive');
  openConcern(life, guest.id, 'argument', 32);
  life.usedActions.push(...Array<string>(3).fill(`intimacy-accepted:${guest.id}`));
  while ([spouse, guest].some((person, i) => npcRandom(life, `intimacy:${person.id}:${[guest, spouse][i]!.id}`, life.year).next() >= .2)) life.seed++;
  const invite = { type: 'intimacy', encounter: 'threesome', first: spouse.id, second: guest.id } as const;
  const result = completeEncounter(act(life, invite), { type: 'choose', event: 'social-threesome', choice: 'accept' });
  assert.ok(result.notices.some(({ title }) => title === 'Just the Three of Us'));
  assert.equal(findContact(result, guest.id)?.bond.trust, guest.bond.trust);
  assert.equal(relationshipState(result, guest.id)?.lastMeaningful, undefined);
  assert.equal(visibleConcerns(result, guest.id)[0]?.severity, 32);
  assert.equal(agreementFor(result, spouse.id), 'exclusive');
  assert.equal(agreementFor(result, outsider.id), 'exclusive');
  const evidenceFor = (person: string) => relationshipState(result, person)?.conflicts.find(({ kind }) => kind === 'boundary')?.breach;
  assert.deepEqual(evidenceFor(spouse.id)?.evidence, [{ who: guest.id, year: life.year, kind: 'intimacy' }]);
  const [who, second] = [spouse.id, guest.id].sort();
  assert.deepEqual(evidenceFor(outsider.id)?.evidence, [{ who, others: [second], year: life.year, kind: 'intimacy' }]);
  boundaryEvidence(result, [guest.id, spouse.id], 'intimacy');
  assert.equal(evidenceFor(outsider.id)?.count, 1);
  assert.equal(evidenceFor(spouse.id)?.count, 1);
  assert.deepEqual(decodeLife(JSON.stringify(result)), result);
});

test('an accepted group encounter applies pregnancy only to eligible participants and retains the scheduled birth after reload', () => {
  const life = adult();
  life.character.gender = 'man';
  const first = knownFriend(life);
  first.gender = 'woman';
  const second = { ...makeNpc(life, 'npc-ineligible-parent', 26, 'Acquaintance'), gender: 'man' as const, friend: true };
  life.social.people.push(second);
  for (const person of [first, second]) {
    Object.assign(person.bond, { affection: 94, trust: 94, compatibility: 86 });
    ensureNpc(life, person).preferences = ['woman', 'man'];
  }
  const key = `pregnancy:${first.id}:${life.journal.length + 2}`;
  while (npcRandom(life, `intimacy:${first.id}:${second.id}`, life.year).next() >= .2 ||
    npcRandom(life, `intimacy:${second.id}:${first.id}`, life.year).next() >= .2 ||
    [first, second].some(({ id }) => npcRandom(life, `protection-consent:${id}:no-barrier:social-threesome`, life.year).next() >= .4) ||
    npcRandom(life, key, life.year).next() >= .2) life.seed++;
  const invited = act(life, { type: 'intimacy', encounter: 'threesome', first: first.id, second: second.id });
  const choice = { type: 'choose', event: 'social-threesome', choice: 'accept' } as const;
  const accepted = completeEncounter(decodeLife(JSON.stringify(invited)), choice, 'no-barrier');
  assert.deepEqual(accepted.social.pregnancies, [{ mother: first.id, father: 'self', dueYear: life.year + 1 }]);
  assert.deepEqual(decodeLife(JSON.stringify(accepted)), accepted);
  assert.deepEqual(completeEncounter(invited, choice, 'no-barrier'), accepted);
  const followup = openNotice(accepted, 'After the Encounter');
  assert.equal(followup.notices[0]?.details?.kind, 'casual-followup');
  const closed = act(followup, { type: 'respond-casual', entry: followup.notices[0]!.entry, response: 'end-contact' });
  assert.equal(closed.social.profiles[first.id]?.casualContact, 'closed');
  assert.deepEqual(closed.social.pregnancies, accepted.social.pregnancies);
  const born = age(decodeLife(JSON.stringify(closed)));
  const child = born.social.people.find(({ role }) => role === 'Child');
  assert.ok(child);
  assert.deepEqual(born.social.parents[child.id], ['self', first.id]);
});

test('new candidate jobs fit the credential, age and experience, and an old pending pool uses its original background', () => {
  const life = adult();
  const pool = datingPool(life);
  const offers = pool.filter(({ profile }) => profile.status === 'employed');
  assert.ok(offers.some(({ profile }) => jobById.get(profile.job!)!.tags.length > 0));
  for (const candidate of pool) {
    const { person, profile } = candidate;
    assert.ok(candidateNetWorth(candidate) >= 0);
    if (profile.educationProgram) assert.ok(validNpcProgram(profile.educationProgram, profile.education, person.age));
    if (profile.status === 'employed') {
      const job = jobById.get(profile.job!)!;
      assert.ok(qualifiedNpc(person.age, profile, job));
      assert.equal(person.occupation, job.title);
      assert.ok(profile.income >= job.salary[0] && profile.income <= job.salary[1]);
    } else {
      assert.equal(profile.job, null);
      assert.equal(profile.income > 0, profile.status === 'retired');
      if (profile.status === 'retired') assert.ok(person.age >= 65);
    }
    if (person.age >= 70) assert.equal(profile.status, 'retired');
  }
  const shown = act(life, { type: 'dating-match', source: 'date' });
  const improved = pendingDatingProfile(shown)!;
  assert.equal(shown.social.datingCycle?.background, 2);
  const old = decodeLife(JSON.stringify({ ...shown, social: { ...shown.social,
    datingCycle: { ...shown.social.datingCycle, background: undefined } } }));
  const legacy = pendingDatingProfile(old)!;
  assert.deepEqual([legacy.person.id, legacy.person.name, legacy.person.appearance], [improved.person.id, improved.person.name, improved.person.appearance]);
  assert.equal(legacy.profile.educationProgram, undefined);
  assert.deepEqual(pendingDatingProfile(decodeLife(JSON.stringify(old))), legacy);
  const passed = act(old, { type: 'choose', event: discoveryEvent, choice: 'pass' });
  assert.equal(passed.social.datingCycle?.background, undefined);
  assert.equal(age(passed).social.datingCycle, undefined);
});

test('Love introductions are adult-only and keep the match and response after reload', () => {
  assert.match(advance(createLife(30), { type: 'dating-match', source: 'date' }).error ?? '', /age 18/);
  const stories = new Set<string>();
  for (const source of datingSources) {
    const matched = act(adult(), { type: 'dating-match', source });
    const restored = decodeLife(JSON.stringify(matched));
    assert.deepEqual(restored, matched);
    const { person, profile, intro } = pendingDatingProfile(restored)!;
    assert.ok(person.age >= 18 && profile.preferences.includes(restored.character.gender));
    if (source === 'lgbtq') assert.ok(person.gender === 'nonbinary' || profile.preferences.includes(person.gender));
    stories.add(intro);
    const result = act(restored, { type: 'choose', event: discoveryEvent, choice: 'pass' });
    assert.equal(result.social.pendingPerson, null);
    assert.equal(activeRomances(result).length, 0);
    assert.ok(advance(result, { type: 'dating-match', source: 'app' }).life);
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
  const invited = legacyMatch(adult(), 'app');
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

test('cross-city mutual matches communicate, book an accepted visit, and keep their history after closing contact', () => {
  let life: Life | undefined;
  let id = '';
  for (let seed = 1; seed < 80; seed++) {
    const base = adult();
    base.seed = seed;
    const configured = act(base, { type: 'dating-profile', profile: { ...defaultDatingProfile, distance: 'distant' } });
    const shown = act(configured, { type: 'dating-match', source: 'app' });
    const candidate = pendingDatingProfile(shown);
    if (!candidate) continue;
    const liked = act(shown, { type: 'choose', event: discoveryEvent, choice: 'like' });
    if (romanceFor(liked, candidate.person.id)?.status !== 'getting-to-know') continue;
    life = liked;
    id = candidate.person.id;
    break;
  }
  assert.ok(life);
  const remote = findContact(life, id)!;
  const care = (action: 'message' | 'phone' | 'interests' | 'visit' | 'end-contact' | 'conversation' | 'exclusive') =>
    ({ type: 'relationship-care', person: id, action }) as const;
  const ask = { type: 'romance', action: 'ask', person: id, venue: 'park' } as const;
  assert.notEqual(remote.city, life.character.city);
  assert.ok(knownRelationship(life, remote));
  assert.ok(datingCandidates(life).some(({ id: person }) => person === id));
  assert.deepEqual(relationshipCareControls(life, remote).map(({ label }) => label), [
    'Call', 'Send a Message', 'Have a Conversation', 'Discuss Shared Interests', 'Plan a Visit', 'End Communication',
  ]);
  assert.match(advance(life, care('exclusive')).error ?? '', /get to know/);
  assert.match(advance(life, ask).error ?? '', /different cities/);
  assert.match(advance(life, care('conversation')).error ?? '', /different cities/);
  assert.equal(careIssue(life, remote, 'interests'), null);

  forceRoll(life, `bond:${id}:message:0`, .1);
  life = act(life, care('message'));
  assert.equal(life.notices.at(-1)?.title, 'Getting to Know Each Other');
  assert.ok(findContact(life, id)!.bond.familiarity > remote.bond.familiarity);
  assert.ok(romanceFor(life, id)?.history.at(-1)?.text.includes(remote.name));
  assert.match(advance(life, care('message')).error ?? '', /next year/);
  life = act(life, care('phone'));
  life = act(life, care('interests'));
  const balance = life.character.bank;
  const declinedVisit = decodeLife(JSON.stringify(life));
  while (npcRandom(declinedVisit, `bond:${id}:visit:3`, declinedVisit.year).next() < .99) declinedVisit.seed++;
  const declined = act(declinedVisit, care('visit'));
  assert.equal(declined.notices.at(-1)?.title, 'Maybe Another Time');
  assert.equal(declined.character.bank, balance);
  assert.match(loveIssue(declined, ask) ?? '', /different cities/);
  forceRoll(life, `bond:${id}:visit:3`, .1);
  const visited = act(life, care('visit'));
  assert.equal(visited.character.bank, balance - visitFee(life, remote));
  assert.equal(visited.character.city, life.character.city);
  assert.equal(loveIssue(decodeLife(JSON.stringify(visited)), ask), null);
  const conversed = act(visited, care('conversation'));
  const expressed = act(conversed, { type: 'romance', person: id, action: 'interest' });
  assert.equal(romanceFor(expressed, id)?.status, 'interest');
  const closed = act(expressed, care('end-contact'));
  assert.equal(romanceFor(closed, id)?.status, 'contact-ended');
  assert.ok(romanceFor(closed, id)!.history.length > 4);
  assert.equal(relationshipState(closed, id)?.visit, undefined);
  assert.match(advance(closed, ask).error ?? '', /communication.*ended/i);
  assert.match(advance(closed, { type: 'talk', person: id }).error ?? '', /communication.*ended/i);
  assert.deepEqual(decodeLife(JSON.stringify(closed)), closed);
});

test('NPCs can message first or stop an early connection, and only shared experience changes their goals', () => {
  const life = adult();
  const person = knownFriend(life);
  changeRomance(life, person.id, 'getting-to-know', 'We exchanged numbers.');
  const profile = ensureNpc(life, person);
  profile.datingGoal = 'long-term';
  const preferences = [...profile.preferences];
  forceRoll(life, `early-connection:${person.id}`, .01);
  advanceEarlyConnections(life);
  assert.equal(life.notices.at(-1)?.title, 'A Message From Them');
  assert.equal(romanceFor(life, person.id)?.status, 'getting-to-know');
  profile.datingGoal = 'not-looking';
  forceRoll(life, `advance:${person.id}`, .01);
  const refused = act(life, { type: 'romance', action: 'ask', person: person.id, venue: 'museum' });
  assert.equal(refused.notices.at(-1)?.title, 'Date Declined');
  assert.equal(refused.character.bank, life.character.bank);
  advanceEarlyConnections(refused);
  assert.equal(romanceFor(refused, person.id)?.status, 'contact-ended');

  changeRomance(life, person.id, 'dating', 'We went out.');
  profile.datingGoal = 'casual';
  assert.ok(datingIntent(life, person, 'commit').adjustment < 0);
  changeRomance(life, person.id, 'committed', 'We tried commitment.');
  assert.match(loveIssue(life, { type: 'romance', action: 'propose', person: person.id }) ?? '', /goals/);
  profile.datingGoal = 'long-term';
  romanceFor(life, person.id)!.started -= 3;
  forceRoll(life, `evolving-goal:${person.id}`, .01);
  advanceEarlyConnections(life);
  assert.equal(profile.datingGoal, 'marriage');
  const future = act(life, { type: 'romance', action: 'future', person: person.id });
  assert.match(future.journal.at(-1)!.text, /marriage-oriented/);
  endRomance(future, findContact(future, person.id)!, 'A serious breach ended it.', 'betrayal');
  assert.equal(future.social.profiles[person.id]?.datingGoal, 'not-looking');
  assert.deepEqual(future.social.profiles[person.id]?.preferences, preferences);
});

test('first-date venues charge only when attended and can lead to positive, neutral, or disappointing dates', () => {
  const life = adult();
  const person = knownFriend(life);
  const park = { type: 'romance', action: 'ask', person: person.id, venue: 'park' } as const;
  const concert = { ...park, venue: 'concert' } as const;
  const account = decodeLife(JSON.stringify(life));
  postTransaction(account, 'Spent my balance', -account.character.bank, 'other');
  assert.match(advance(account, concert).error ?? '', /balance/);
  assert.equal(loveIssue(account, park), null);
  assert.equal(firstDateControls(account, findContact(account, person.id)!).length, 6);
  const parkOutcomes = new Set<string>();
  let expensiveWorse = false;
  for (let seed = 1; seed <= 80; seed++) {
    life.seed = seed;
    const stats = life.character.attributes;
    stats.stress = seed % 2 ? 10 : 90;
    person.bond.familiarity = seed % 2 ? 90 : 15;
    person.bond.trust = seed % 2 ? 94 : 38;
    person.bond.resentment = seed % 2 ? 0 : 44;
    const expected = firstDateOutcome(life, person, 'park');
    expensiveWorse ||= firstDateOutcome(life, person, 'concert').quality < expected.quality;
    const paid = act(life, concert);
    if (paid.notices.at(-1)?.title !== 'Date Declined') {
      assert.equal(paid.character.bank, life.character.bank - firstDatePrice(life, person, 'concert'));
      assert.equal(paid.transactions.at(-1)?.category, 'relationships');
    } else assert.equal(paid.character.bank, life.character.bank);
    const result = act(decodeLife(JSON.stringify(life)), park);
    if (result.notices.at(-1)?.title !== 'A First Date') continue;
    parkOutcomes.add(expected.outcome);
    assert.equal(result.notices.at(-1)?.meter?.value, expected.quality);
    assert.equal(romanceFor(result, person.id)?.status, expected.outcome === 'disappointing' ? 'interest' : 'dating');
    assert.notEqual(agreementFor(result, person.id), 'exclusive');
    assert.deepEqual(decodeLife(JSON.stringify(result)), result);
  }
  assert.equal(new Set(Object.values(firstDateVenues).map(({ label }) => label)).size, 6);
  assert.deepEqual(parkOutcomes, new Set(['positive', 'neutral', 'disappointing']));
  assert.ok(expensiveWorse);
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
  const groups = relationshipGroups(decodeLife(JSON.stringify(life)));
  assert.deepEqual(groups.parents.map(({ id }) => id), life.family.map(({ id }) => id));
  assert.deepEqual(new Set(groups.family.map(({ id }) => id)), new Set([id, first.id]));
  assert.equal(groups.partners.length, 0);
  const spouse = findContact(life, id)!;
  assert.equal(socialRole(life, { ...spouse, gender: 'woman' }), 'Wife');
  assert.equal(socialRole(life, { ...spouse, gender: 'man' }), 'Husband');
  assert.equal(socialRole(life, { ...spouse, gender: 'nonbinary' }), 'Spouse');
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
