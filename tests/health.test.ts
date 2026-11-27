import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { advanceIllnesses, activeIllness, doctorIssue, startIllness } from '../src/engine/health.ts';
import { playerPatient } from '../src/engine/healthTypes.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { seededRandom } from '../src/engine/random.ts';
import { createSchoolClass } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { patientRows } from '../src/healthView.ts';

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function atAge(age: number) {
  const life = createLife(4);
  life.character.age = age;
  life.year += age;
  return life;
}

test('player illnesses persist with severity and paid visits reconcile without changing the original state', () => {
  const life = atAge(30);
  const health = life.character.attributes.health;
  startIllness(life, 'pneumonia');
  assert.equal(life.character.attributes.health, health - 9);
  assert.equal(activeIllness(life)?.level, 'severe');
  assert.match(doctorIssue(life, playerPatient) ?? '', /balance/);
  postTransaction(life, 'Gift', 1800, 'other');
  const restored = decodeLife(JSON.stringify(life));
  assert.deepEqual(restored, life);
  assert.equal(patientRows(restored)[0]?.fee, '$16.00');

  const treated = apply(restored, { type: 'doctor', patient: playerPatient });
  assert.equal(treated.character.bank, 200);
  assert.equal(treated.transactions.at(-1)?.amount, -1600);
  assert.equal(treated.transactions.at(-1)?.category, 'medical');
  assert.equal(activeIllness(treated)?.level, 'moderate');
  assert.equal(activeIllness(restored)?.level, 'severe');
  assert.match(doctorIssue(treated, playerPatient) ?? '', /already had a visit/);
  assert.equal(treated.notices.at(-1)?.title, 'Doctor Visit');
});

test('minors receive free self care while accompanying relatives or friends requires earned salary and funds', () => {
  const life = atAge(16);
  startIllness(life, 'cold');
  const healthy = apply(life, { type: 'doctor', patient: playerPatient });
  assert.equal(activeIllness(healthy), undefined);
  assert.equal(healthy.transactions.length, 0);

  const adult = atAge(27);
  const parent = adult.family[0]!;
  adult.schoolContacts = createSchoolClass(adult, 'high');
  const [friend, stranger] = adult.schoolContacts.filter(({ role }) => role === 'Classmate');
  assert.ok(friend && stranger);
  friend.friend = true;
  startIllness(adult, 'flu', parent);
  startIllness(adult, 'cold', friend);
  startIllness(adult, 'cold', stranger);
  postTransaction(adult, 'Gift', 250, 'other');
  assert.match(doctorIssue(adult, friend.id) ?? '', /earn a salary/i);
  assert.match(doctorIssue(adult, stranger.id) ?? '', /family members and friends/);
  postTransaction(adult, 'Wages', 300, 'salary');
  assert.deepEqual(patientRows(adult).map(({ id }) => id), [parent.id, friend.id]);
  assert.match(doctorIssue(adult, parent.id) ?? '', /balance/);
  const treatedFriend = apply(adult, { type: 'doctor', patient: friend.id });
  assert.equal(activeIllness(treatedFriend, friend.id), undefined);
  postTransaction(treatedFriend, 'Wages', 800, 'salary');
  const treatedParent = apply(treatedFriend, { type: 'doctor', patient: parent.id });
  assert.equal(activeIllness(treatedParent, parent.id), undefined);
  assert.equal(treatedParent.character.bank, 350);
});

test('an NPC can seek care alone and cannot be treated twice in the same year', () => {
  const life = atAge(30);
  const parent = life.family[0]!;
  startIllness(life, 'pneumonia', parent);
  const balance = life.character.bank;
  life.year++;
  life.character.age++;
  while (seededRandom(life.seed ^ Math.imul(life.year, 0xb5297a4d)).next() >= .86) life.seed++;
  advanceIllnesses(life);
  assert.equal(activeIllness(life, parent.id)?.level, 'moderate');
  assert.equal(life.character.bank, balance);
  assert.match(life.journal[life.notices.find(({ title }) => title === 'Doctor Visit')!.entry]?.text ?? '', /on their own/);
  postTransaction(life, 'Wages', 2000, 'salary');
  assert.match(doctorIssue(life, parent.id) ?? '', /already had a visit/);
});

test('choice popups precede queued notices after reload and dismissing a notice preserves its journal entry', () => {
  const life = atAge(5);
  startIllness(life, 'cold');
  const next = apply(life, { type: 'age' });
  const restored = decodeLife(JSON.stringify(next));
  const popup = eventPopup(restored)!;
  assert.equal(popup.title, 'First Classroom');
  assert.equal(popup.dismiss, undefined);
  assert.match(advance(restored, { type: 'acknowledge-event', entry: life.notices[0]!.entry }).error ?? '', /no longer available/);
  const chosen = apply(restored, popup.actions[0]!.action);
  const notice = eventPopup(chosen)!;
  assert.equal(notice.title, 'I Fell Ill');
  assert.equal(notice.actions.length, 1);
  const acknowledged = apply(chosen, notice.actions[0]!.action);
  assert.deepEqual(acknowledged.journal, chosen.journal);
  assert.equal(acknowledged.notices.length, chosen.notices.length - 1);
  assert.match(advance(acknowledged, notice.actions[0]!.action).error ?? '', /no longer available/);
});

test('legacy V4 games preserve existing decisions and journal, and V5 rejects invalid references', () => {
  const life = apply(atAge(5), { type: 'age' });
  const restored = decodeLife(JSON.stringify({ ...life, version: 4, illnesses: undefined, notices: undefined }));
  assert.deepEqual(restored, { ...life, notices: [], illnesses: [] });
  assert.equal(eventPopup(restored)?.title, 'First Classroom');
  assert.throws(() => decodeLife(JSON.stringify({ ...restored, notices: [{ entry: -1, title: 'Invalid' }] })), /invalid health or event/);
  assert.throws(() => decodeLife(JSON.stringify({ ...restored, illnesses: [{ patient: 'unknown', illness: 'cold', level: 'mild', started: life.year }] })), /invalid health or event/);
  const ending = apply(atAge(114), { type: 'age' });
  const finalNotice = eventPopup(ending);
  assert.equal(finalNotice?.title, 'End of Life');
  assert.ok(finalNotice?.dismiss);
  assert.deepEqual(apply(ending, finalNotice.dismiss).notices, []);
});
