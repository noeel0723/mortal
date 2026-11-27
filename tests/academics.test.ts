import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { programById } from '../src/data/academics.ts';
import { eventById } from '../src/data/events.ts';
import { highestQualification, latestApplication } from '../src/engine/academics.ts';
import { createLife } from '../src/engine/create.ts';
import { currentClass } from '../src/engine/school.ts';
import { advance, talkIssue } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function resolve(life: Life, choice?: string) {
  if (!life.pending) return life;
  const selected = choice ?? eventById.get(life.pending)?.choices?.[0]?.id;
  assert.ok(selected);
  return act(life, { type: 'choose', event: life.pending, choice: selected });
}

function ageTo(start: Life, age: number) {
  let life = start;
  while (life.character.age < age) life = act(resolve(life), { type: 'age' });
  return life;
}

function qualified(choice = 'university') {
  const graduate = ageTo(createLife(4), 18);
  assert.equal(graduate.pending, 'graduation-plan');
  const life = resolve(graduate, choice);
  const diploma = highestQualification(life);
  assert.ok(diploma);
  life.character.attributes.smarts = 90;
  life.character.attributes.discipline = 90;
  diploma.performance = 90;
  return life;
}

function enrollWithAid(life: Life, programId: string) {
  const accepted = act(life, { type: 'apply-program', programId });
  assert.equal(latestApplication(accepted, programId)?.result, 'accepted');
  const awarded = act(accepted, { type: 'apply-scholarship', programId });
  return act(awarded, { type: 'enroll-program', programId });
}

function expectIssue(life: Life, action: Action, message: RegExp) {
  assert.match(advance(life, action).error ?? '', message);
}

test('school records progress in sequence and the high school plan must be resolved after reload', () => {
  const life = ageTo(createLife(4), 18);
  const loaded = decodeLife(JSON.stringify(life));
  assert.deepEqual(loaded, life);
  assert.deepEqual(loaded.academic.history.map(({ level, outcome }) => [level, outcome]),
    [['primary', 'completed'], ['secondary', 'completed'], ['high', 'graduated']]);
  assert.equal(highestQualification(loaded)?.year, life.year);
  assert.equal(loaded.pending, 'graduation-plan');
  expectIssue(loaded, { type: 'age' }, /pending decision/);
  expectIssue(loaded, { type: 'apply-program', programId: 'education' }, /pending decision/);
  const gap = resolve(loaded, 'gap-year');
  expectIssue(gap, { type: 'apply-program', programId: 'education' }, /gap year/);
  assert.equal(ageTo(gap, 19).academic.gapUntil, null);
  for (const path of ['university', 'vocational', 'workforce']) assert.equal(resolve(loaded, path).academic.path, path);
});

test('academic activities use energy, record actual effects independently of Smarts, and respect bounds', () => {
  const school = resolve(ageTo(createLife(8), 6));
  const enrollment = school.academic.enrollment!;
  enrollment.attendance = 99;
  enrollment.performance = 99;
  enrollment.stress = 2;
  const activity = { type: 'activity', activity: 'academic-talk' } as const;
  const next = act(school, activity);
  assert.deepEqual((['performance', 'attendance', 'stress'] as const).map((key) => next.academic.enrollment![key]), [100, 100, 0]);
  assert.equal(next.character.attributes.smarts, school.character.attributes.smarts);
  assert.equal(next.character.attributes.energy, school.character.attributes.energy - 7);
  assert.match(next.journal.at(-1)?.text ?? '', /academic feedback/);
  assert.equal(enrollment.performance, 99);
  expectIssue(next, activity, /already done/i);
  expectIssue(createLife(8), activity, /age 6/);
});

test('applications have deterministic accepted and rejected outcomes, with prerequisites and offer expiry', () => {
  const life = qualified();
  const programId = 'education';
  const application = { type: 'apply-program', programId } as const;
  expectIssue(life, { type: 'enroll-program', programId }, /receive an offer/);
  expectIssue(life, { type: 'apply-program', programId: 'master-computing' }, /undergraduate degree/);
  expectIssue(life, { type: 'apply-program', programId: 'unlisted' }, /unavailable/);
  const offer = act(life, application);
  assert.deepEqual(offer, act(life, application));
  assert.equal(latestApplication(offer, programId)?.result, 'accepted');
  expectIssue(offer, application, /valid offer/);
  const lateOffer = resolve(ageTo(offer, 19));
  const lateAward = act(lateOffer, { type: 'apply-scholarship', programId });
  const lateEnrollment = act(lateAward, { type: 'enroll-program', programId });
  expectIssue(act(lateEnrollment, { type: 'drop-out' }), application, /reapply.*next year/i);
  expectIssue(resolve(ageTo(offer, 21)), { type: 'enroll-program', programId }, /receive an offer/);
  life.character.attributes.smarts = 10;
  life.character.attributes.discipline = 10;
  highestQualification(life)!.performance = 20;
  const declined = act(life, application);
  assert.equal(latestApplication(declined, programId)?.result, 'rejected');
  expectIssue(declined, application, /already applied/);
  expectIssue(declined, { type: 'apply-scholarship', programId }, /eligible offer/);
  expectIssue(declined, { type: 'enroll-program', programId }, /receive an offer/);
});

test('scholarships and tuition reconcile exactly once per funded year through postgraduate study', () => {
  const start = qualified();
  const programId = 'education';
  const program = programById.get(programId)!;
  const bank = start.character.bank;
  const university = enrollWithAid(start, programId);
  assert.equal(university.character.bank, bank);
  assert.equal(university.academic.scholarships[0]?.receivedTotal, program.tuition);
  assert.equal(university.academic.enrollment?.yearsFunded, 1);
  assert.deepEqual(university, enrollWithAid(start, programId));
  expectIssue(university, { type: 'apply-scholarship', programId }, /already been awarded/);
  expectIssue(university, { type: 'enroll-program', programId: 'law' }, /current program/);
  expectIssue(university, { type: 'pay-tuition' }, /no tuition due/);
  assert.equal(currentClass(university).filter(({ role }) => role === 'Professor').length, 1);
  const student = currentClass(university).find(({ role }) => role === 'Student');
  assert.ok(student);
  const friend = act(university, { type: 'befriend', person: student.id });
  const graduate = resolve(ageTo(decodeLife(JSON.stringify(friend)), 21));
  const contact = graduate.schoolContacts.find(({ id }) => id === student.id);
  assert.ok(contact?.friend);
  assert.equal(contact.occupation, 'Graduate');
  assert.equal(talkIssue(graduate, student.id), null);
  assert.equal(ageTo(graduate, 22).schoolContacts.find(({ id }) => id === student.id)?.occupation, 'Job Seeker');
  assert.equal(ageTo(graduate, 23).schoolContacts.find(({ id }) => id === student.id)?.occupation, 'Employed');
  assert.equal(highestQualification(graduate)?.title, program.qualification);
  assert.equal(highestQualification(graduate)?.year, start.year + program.duration);
  assert.deepEqual(highestQualification(graduate)?.careerEligibility, ['teaching']);
  assert.equal(graduate.academic.scholarships[0]?.receivedTotal, program.tuition * program.duration);
  const ledger = graduate.transactions.slice(start.transactions.length);
  assert.deepEqual(ledger.filter(({ label }) => label.includes('scholarship')).map(({ amount }) => amount), [3000, 3000, 3000]);
  assert.deepEqual(ledger.filter(({ label }) => label.includes('tuition')).map(({ amount }) => amount), [-3000, -3000, -3000]);
  assert.equal(graduate.character.bank, graduate.transactions.reduce((sum, item) => sum + item.amount, 0));
  expectIssue(graduate, { type: 'apply-program', programId }, /already hold/);
  expectIssue(graduate, { type: 'apply-program', programId: 'master-computing' }, /requires Computer Science/i);
  const master = enrollWithAid(graduate, 'master-education');
  assert.equal(highestQualification(ageTo(master, 23))?.level, 'postgraduate');
});

test('unfunded tuition holds progression without debiting an empty account, and aid can resume it', () => {
  let life = qualified();
  life.character.bank = 3000;
  life.transactions = [{ year: life.year, label: 'Test funds', amount: 3000 }];
  const programId = 'education';
  life = act(act(life, { type: 'apply-program', programId }), { type: 'enroll-program', programId });
  assert.equal(life.character.bank, 0);
  const waiting = resolve(ageTo(life, 20));
  assert.equal(waiting.character.bank, 0);
  assert.equal(waiting.academic.enrollment?.yearsCompleted, 1);
  assert.equal(waiting.academic.enrollment?.yearsFunded, 1);
  assert.equal(waiting.transactions.filter(({ label }) => label.includes('tuition')).length, 1);
  expectIssue(waiting, { type: 'pay-tuition' }, /cannot afford/);
  expectIssue(waiting, { type: 'activity', activity: 'study' }, /tuition/);
  const awarded = act(waiting, { type: 'apply-scholarship', programId });
  const reopened = decodeLife(JSON.stringify(awarded));
  const funded = act(reopened, { type: 'pay-tuition' });
  assert.equal(funded.character.bank, 0);
  assert.equal(funded.academic.enrollment?.yearsFunded, 2);
  expectIssue(funded, { type: 'pay-tuition' }, /no tuition due/);
});

test('school dropout can reenter as an adult and receive a vocational qualification', () => {
  const school = resolve(ageTo(createLife(9), 12));
  const dropout = act(school, { type: 'drop-out' });
  assert.equal(dropout.academic.history.at(-1)?.outcome, 'withdrawn');
  assert.equal(currentClass(dropout).length, 0);
  expectIssue(dropout, { type: 'apply-program', programId: 'equivalency' }, /age 18/);
  const adult = resolve(ageTo(dropout, 25));
  assert.equal(adult.academic.enrollment, null);
  expectIssue(adult, { type: 'apply-program', programId: 'it-support' }, /high school qualification/);
  const equivalency = act(act(adult, { type: 'apply-program', programId: 'equivalency' }), { type: 'enroll-program', programId: 'equivalency' });
  const ready = resolve(ageTo(equivalency, 26), 'vocational');
  assert.equal(highestQualification(ready)?.level, 'high-school');
  const vocational = enrollWithAid(ready, 'culinary');
  assert.equal(highestQualification(ageTo(vocational, 28))?.level, 'vocational');
});

test('low attendance and performance can fail graduation and dead NPCs cannot interact', () => {
  const start = resolve(ageTo(createLife(4), 17));
  const peer = currentClass(start).find(({ role }) => role === 'Classmate');
  assert.ok(peer);
  peer.alive = false;
  expectIssue(start, { type: 'talk', person: peer.id }, /no longer available/);
  expectIssue(start, { type: 'befriend', person: peer.id }, /no longer available/);
  Object.assign(start.academic.enrollment!, { performance: 0, attendance: 0, stress: 100 });
  const failed = ageTo(start, 18);
  assert.notEqual(failed.pending, 'graduation-plan');
  assert.equal(failed.academic.history.at(-1)?.outcome, 'failed');
  assert.equal(highestQualification(failed), undefined);
});

test('a version 1 graduate gets a migration credential with no invented grades or history', () => {
  const life = resolve(ageTo(createLife(4), 18));
  const legacy = {
    ...life, version: 1, academic: undefined,
    schoolContacts: life.schoolContacts.map((person) => person.role === 'Classmate' ? { ...person, occupation: 'Student' } : person),
  };
  const restored = decodeLife(JSON.stringify(legacy));
  assert.equal(restored.version, 3);
  assert.deepEqual(restored.academic.history, []);
  assert.equal(highestQualification(restored)?.performance, null);
  assert.equal(highestQualification(restored)?.year, life.year);
  assert.deepEqual(restored.schoolContacts, life.schoolContacts);
  assert.deepEqual(restored.transactions, life.transactions);
  assert.equal(restored.random, life.random);
  assert.throws(() => decodeLife(JSON.stringify({ ...restored, academic: null })), /invalid academic data/);
});
