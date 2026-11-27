import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { seededRandom } from '../src/engine/random.ts';
import { currentClass, findContact } from '../src/engine/school.ts';
import { activityIssue, advance, friendshipEnergyCost, maxAge, talkIssue } from '../src/engine/simulation.ts';
import { events, eventById } from '../src/data/events.ts';
import type { Action, Life, ProfileInput } from '../src/engine/types.ts';

const custom: ProfileInput = {
  firstName: ' Nara ', lastName: 'Élan', gender: 'nonbinary', city: 'Bellmere', country: 'Veyra',
  birthYear: 1994, background: 'affluent', talent: 'academic',
};

function apply(life: Life, action: Action): Life {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function ageTo(age: number, seed = 4) {
  return ageUntil(createLife(seed), age);
}

function ageUntil(start: Life, age: number) {
  let life = start;
  while (life.character.age < age) {
    const pending = life.pending;
    if (pending) {
      const choice = eventById.get(pending)?.choices?.[0];
      assert.ok(choice);
      life = apply(life, { type: 'choose', event: pending, choice: choice.id });
    }
    life = apply(life, { type: 'age' });
  }
  return life;
}

test('random and custom lives start at birth with individual family members', () => {
  assert.notDeepEqual(createLife(4), createLife(5));
  const life = createLife(4, custom);
  assert.equal(life.character.firstName, 'Nara');
  assert.equal(life.character.lastName, 'Élan');
  assert.equal(life.character.age, 0);
  assert.equal(life.year, 1994);
  assert.equal(life.character.bank, 25000);
  assert.equal(life.family.length, 2);
  assert.equal(new Set(life.family.map((person) => person.id)).size, 2);
  assert.match(life.journal[0]?.text ?? '', /Bellmere/);
});

test('custom creation validates names, years, and city', () => {
  assert.throws(() => createLife(42, { ...custom, firstName: '42' }), /name/);
  assert.throws(() => createLife(42, { ...custom, birthYear: 0 }), /birth year/);
  assert.throws(() => createLife(42, { ...custom, city: 'Unknown' } as unknown as ProfileInput), /Veyra/);
});

test('the same seed and action sequence produce identical lives', () => {
  assert.deepEqual(ageTo(51, 999999), ageTo(51, 999999));
  const original = seededRandom(42);
  original.next();
  const restored = seededRandom(original.state);
  assert.equal(original.next(), restored.next());
});

test('one turn advances the calendar and living parents without changing the previous state', () => {
  const before = createLife(17);
  const after = apply(before, { type: 'age' });
  assert.equal(after.character.age, 1);
  assert.equal(after.year, before.year + 1);
  assert.equal(after.family[0]?.age, (before.family[0]?.age ?? 0) + 1);
  assert.equal(before.character.age, 0);
  assert.equal(before.journal.length, 1);
  assert.ok(after.seen.includes('first-steps'));
});

test('school progresses in order, and age limits govern activities', () => {
  assert.match(advance(createLife(1), { type: 'activity', activity: 'read' }).error ?? '', /age 5/);
  assert.equal(ageTo(6).character.education, 'primary');
  assert.equal(ageTo(12).character.education, 'secondary');
  assert.equal(ageTo(15).character.education, 'high');
  const graduate = ageTo(18);
  assert.equal(graduate.character.education, 'completed');
  assert.match(activityIssue(graduate, 'study') ?? '', /attending school/);
});

test('each school stage generates a stable roster with a teacher and six classmates', () => {
  assert.equal(currentClass(ageTo(5)).length, 0);
  const primary = ageTo(6);
  const roster = currentClass(primary);
  assert.equal(roster.filter((person) => person.role === 'Teacher').length, 1);
  assert.equal(roster.filter((person) => person.role === 'Classmate' && person.age === 6).length, 6);
  assert.equal(new Set(roster.map((person) => person.name)).size, 7);
  assert.deepEqual(roster, currentClass(ageTo(7)).map((person) => ({ ...person, age: person.age - 1 })));
  const secondary = ageUntil(primary, 12);
  assert.equal(currentClass(secondary).length, 7);
  assert.equal(new Set(secondary.schoolContacts.map((person) => person.id)).size, 14);
  assert.ok(currentClass(secondary).every((person) => person.stage === 'secondary'));
});

test('friends keep their identity and can still talk after graduation', () => {
  const starting = ageTo(6);
  const [peer, other] = currentClass(starting).filter((person) => person.role === 'Classmate');
  const teacher = currentClass(starting).find((person) => person.role === 'Teacher');
  assert.ok(peer && other && teacher);
  assert.match(advance(starting, { type: 'befriend', person: peer.id }).error ?? '', /pending decision/);
  const ready = apply(starting, { type: 'choose', event: 'first-classroom', choice: 'join' });
  assert.match(advance(ready, { type: 'befriend', person: teacher.id }).error ?? '', /only befriend a classmate/);
  const talked = apply(ready, { type: 'talk', person: peer.id });
  assert.equal(findContact(talked, peer.id)?.bond.affection, peer.bond.affection + 3);
  const befriended = apply(talked, { type: 'befriend', person: peer.id });
  assert.equal(befriended.character.attributes.energy, ready.character.attributes.energy - 8 - friendshipEnergyCost);
  assert.equal(befriended.schoolContacts.find((person) => person.id === peer.id)?.friend, true);
  assert.equal(starting.schoolContacts.find((person) => person.id === peer.id)?.friend, false);
  assert.match(befriended.journal.at(-1)?.text ?? '', /became friends/);
  assert.match(advance(befriended, { type: 'befriend', person: peer.id }).error ?? '', /already friends/);

  const graduate = ageUntil(decodeLife(JSON.stringify(befriended)), 18);
  assert.equal(currentClass(graduate).length, 0);
  assert.equal(findContact(graduate, peer.id)?.age, 18);
  assert.equal(talkIssue(graduate, peer.id), null);
  assert.match(talkIssue(graduate, other.id) ?? '', /previous class/);
});

test('opening a legacy student save generates the current roster without losing progress', () => {
  const life = ageTo(7);
  const legacy = JSON.stringify({ ...life, version: 1, academic: undefined, schoolContacts: undefined });
  const restored = decodeLife(legacy);
  assert.equal(restored.version, 5);
  assert.deepEqual(restored.schoolContacts, life.schoolContacts);
  assert.deepEqual(restored.character, life.character);
  assert.deepEqual(restored.journal, life.journal);
  assert.equal(restored.random, life.random);
  assert.equal(restored.academic.enrollment?.level, 'primary');
  assert.equal(restored.academic.enrollment?.performanceRecorded, false);
  assert.deepEqual(restored.academic.history, []);
  assert.deepEqual(decodeLife(JSON.stringify({ ...createLife(10), version: 1, academic: undefined, schoolContacts: undefined })).schoolContacts, []);
});

test('pending events are mandatory and grant actual, bounded changes', () => {
  const life = ageTo(6);
  assert.equal(life.pending, 'first-classroom');
  assert.match(advance(life, { type: 'age' }).error ?? '', /pending decision/);
  assert.match(advance(life, { type: 'choose', event: 'first-classroom', choice: 'unknown' }).error ?? '', /no longer available/);
  life.character.attributes.happiness = 99;
  const resolved = apply(life, { type: 'choose', event: 'first-classroom', choice: 'join' });
  assert.equal(resolved.pending, null);
  assert.equal(resolved.character.attributes.happiness, 100);
  assert.equal(resolved.journal.at(-1)?.changes.happiness, 1);
});

test('delayed consequences apply once in their scheduled year', () => {
  const life = ageTo(10);
  life.pending = 'library-mentor';
  const joined = apply(life, { type: 'choose', event: 'library-mentor', choice: 'join' });
  assert.equal(joined.scheduled.at(-1)?.year, joined.year + 2);
  const later = apply(apply(joined, { type: 'age' }), { type: 'age' });
  assert.equal(later.scheduled.length, 0);
  assert.equal(later.journal.filter((entry) => /letter recognizing/.test(entry.text)).length, 1);
});

test('contextual events have unique IDs and honor city requirements', () => {
  assert.ok(events.length >= 50);
  assert.equal(eventById.size, events.length);
  assert.equal(eventById.get('harbor-walk')?.eligible?.(createLife(1, custom)), false);
  assert.equal(eventById.get('market-stall')?.eligible?.(createLife(1, custom)), true);
});

test('activity use is limited per year and energy resets on Age Up', () => {
  const life = ageTo(5);
  const after = apply(life, { type: 'activity', activity: 'read' });
  assert.equal(after.character.attributes.energy, 90);
  assert.match(advance(after, { type: 'activity', activity: 'read' }).error ?? '', /already done/i);
  assert.equal(apply(after, { type: 'age' }).character.attributes.energy, 100);
});

test('available family interactions update multiple bond dimensions', () => {
  const life = ageTo(4);
  const person = life.family[0];
  assert.ok(person);
  const after = apply(life, { type: 'talk', person: person.id });
  assert.equal(after.family[0]?.bond.affection, person.bond.affection + 3);
  assert.equal(after.family[0]?.bond.trust, person.bond.trust + 2);
  person.alive = false;
  assert.match(advance(life, { type: 'talk', person: person.id }).error ?? '', /no longer available/);
});

test('family journal stories vary across years and give the same results after save and reload', () => {
  let life = ageTo(4);
  const father = life.family.find(({ role }) => role === 'Father')!;
  const mother = life.family.find(({ role }) => role === 'Mother')!;
  const talk = { type: 'talk', person: father.id } as const;
  const together = { type: 'interact', person: mother.id, activity: 'family-time' } as const;
  const conversations = new Set<string>();
  const outings = new Set<string>();
  for (let age = 4; age <= 9; age++) {
    life = ageUntil(life, age);
    if (life.pending) life = apply(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending)!.choices![0]!.id });
    const previous = life;
    life = apply(life, talk);
    assert.deepEqual(life, apply(decodeLife(JSON.stringify(previous)), talk));
    const conversation = life.journal.at(-1)!.text;
    assert.ok(conversation.includes(`my father, ${father.name}`));
    conversations.add(conversation);
    life = apply(life, together);
    const outing = life.journal.at(-1)!.text;
    assert.ok(outing.includes(`my mother, ${mother.name}`));
    outings.add(outing);
    assert.equal(life.random, previous.random);
  }
  assert.equal(conversations.size, 6);
  assert.equal(outings.size, 6);
});

test('teacher conversations use classroom topics and time with a young classmate uses play stories', () => {
  const life = apply(ageTo(6), { type: 'choose', event: 'first-classroom', choice: 'join' });
  const [teacher, peer] = currentClass(life);
  assert.ok(teacher && peer);
  const conversation = apply(life, { type: 'talk', person: teacher.id });
  assert.ok(conversation.journal.at(-1)!.text.includes(`my teacher, ${teacher.name}`));
  assert.match(conversation.journal.at(-1)!.text, /class|homework|book|lesson|teacher/);
  const playing = apply(life, { type: 'interact', person: peer.id, activity: 'hang-out' });
  assert.ok(playing.journal.at(-1)!.text.includes(peer.name));
  assert.match(playing.journal.at(-1)!.text, /paper boats|played tag|board game|drew a comic/);
});

test('parents give one allowance per year and gifts debit the full amount', () => {
  const life = ageUntil(createLife(4, custom), 8);
  const [parent, other] = life.family;
  assert.ok(parent && other);
  const ask = { type: 'interact', person: parent.id, activity: 'ask-allowance' } as const;
  const paid = apply(life, ask);
  assert.equal(paid.character.bank, life.character.bank + 800);
  assert.equal(paid.transactions.at(-1)?.amount, 800);
  assert.match(advance(paid, { ...ask, person: other.id }).error ?? '', /already done/i);
  const gift = { type: 'interact', person: parent.id, activity: 'gift' } as const;
  const gifted = apply(paid, gift);
  assert.equal(gifted.character.bank, paid.character.bank - 500);
  assert.equal(gifted.transactions.at(-1)?.amount, -500);
  assert.equal(gifted.family[0]?.bond.affection, Math.min(100, parent.bond.affection + 5));
  assert.match(advance({ ...life, character: { ...life.character, bank: 499 } }, gift).error ?? '', /cannot afford/);
  assert.match(advance(life, { type: 'interact', person: parent.id, activity: 'academic-help' }).error ?? '', /unavailable for this relationship/);
});

test('peer study and teacher help affect coursework and honor yearly limits', () => {
  const life = apply(ageTo(6), { type: 'choose', event: 'first-classroom', choice: 'join' });
  const [teacher, first, second] = currentClass(life);
  assert.ok(teacher && first && second);
  const grade = life.academic.enrollment!.performance;
  const helped = apply(life, { type: 'interact', person: teacher.id, activity: 'academic-help' });
  assert.equal(helped.academic.enrollment?.performance, Math.min(100, grade + 3));
  assert.match(advance(helped, { type: 'activity', activity: 'academic-talk' }).error ?? '', /already done/i);
  const studied = apply(helped, { type: 'interact', person: first.id, activity: 'study-together' });
  assert.equal(studied.academic.enrollment?.performance, Math.min(100, grade + 6));
  assert.match(advance(studied, { type: 'interact', person: second.id, activity: 'study-together' }).error ?? '', /already done/i);
  const friend = apply(studied, { type: 'befriend', person: first.id });
  const older = ageUntil(friend, 12);
  assert.match(advance(older, { type: 'interact', person: first.id, activity: 'study-together' }).error ?? '', /current class/);
  assert.ok(advance(older, { type: 'interact', person: first.id, activity: 'hang-out' }).life);
});

test('a life records a death and cannot age or act again', () => {
  const life = ageTo(8);
  life.character.age = maxAge - 1;
  life.year = life.character.birthYear + life.character.age;
  const ended = apply(life, { type: 'age' });
  assert.ok(ended.character.causeOfDeath);
  assert.equal(ended.character.age, maxAge);
  assert.match(ended.journal.at(-1)?.text ?? '', /ended/);
  assert.match(advance(ended, { type: 'age' }).error ?? '', /already ended/);
});
