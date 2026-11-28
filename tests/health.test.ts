import { newWorld } from '../src/engine/world.ts';
import assert from 'node:assert/strict';
import test from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { advanceIllnesses, activeIllness, healthcareQuote, startIllness } from '../src/engine/health.ts';
import { playerPatient } from '../src/engine/healthTypes.ts';
import { advanceReproductiveHealth, pregnancyFactor, reproductiveSummary } from '../src/engine/reproductiveHealth.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { seededRandom } from '../src/engine/random.ts';
import { createSchoolClass } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { eventPopup } from '../src/eventView.ts';
import { careOptions, carePatients } from '../src/healthView.ts';

const communityVisit = (patient = playerPatient) => ({ service: 'doctor', patient, provider: 'community' } as const);

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function atAge(age: number) {
  const life = createLife(4);
  life.character.age = age;
  life.year += age;
  life.world = newWorld(life.seed, life.year, true);
  return life;
}

test('Doctors screen before treating, cure chlamydia, and keep managed chronic hepatitis B in the save', () => {
  const life = atAge(28);
  postTransaction(life, 'Savings', 14000, 'other');
  life.reproductive = { self: { cases: { chlamydia: { year: life.year - 1 }, hepatitisB: { year: life.year - 2, chronic: true } } } };
  const treatment = { service: 'sti-treatment' } as const;
  assert.deepEqual(reproductiveSummary(life), []);
  assert.match(healthcareQuote(life, treatment).issue ?? '', /diagnosed/);
  assert.match(healthcareQuote(atAge(17), { service: 'sti-screening' }).issue ?? '', /age 18/);
  const screened = apply(decodeLife(JSON.stringify(life)), { type: 'healthcare', visit: { service: 'sti-screening' } });
  assert.match(screened.journal.at(-1)?.text ?? '', /Chlamydia and Hepatitis B/);
  assert.equal(life.reproductive.self?.cases.chlamydia?.diagnosed, undefined);
  const treated = apply(screened, { type: 'healthcare', visit: treatment });
  assert.equal(treated.reproductive?.self?.cases.chlamydia, undefined);
  assert.ok(treated.reproductive?.self?.cases.hepatitisB?.managed);
  assert.equal(screened.reproductive?.self?.cases.hepatitisB?.managed, undefined);
  assert.equal(treated.transactions.at(-1)?.amount, -healthcareQuote(screened, treatment).fee);
  assert.equal(treated.transactions.at(-1)?.category, 'medical');
  assert.deepEqual(reproductiveSummary(treated), [{ label: 'Hepatitis B', value: 'Chronic · in care' }]);
  assert.deepEqual(decodeLife(JSON.stringify(treated)), treated);
  assert.throws(() => decodeLife(JSON.stringify({ ...treated, reproductive: { self: { cases: { hepatitisB: { year: treated.year, managed: true } } } } })),
    /invalid health or event data/);
});

test('vaccination and birth control are distinct and recent hepatitis B resolves or becomes chronic after aging', () => {
  const life = atAge(29);
  life.character.gender = 'woman';
  postTransaction(life, 'Savings', 18000, 'other');
  const vaccine = { service: 'sti-prevention' } as const;
  const birthControl = { service: 'birth-control' } as const;
  const vaccinated = apply(life, { type: 'healthcare', visit: vaccine });
  assert.equal(pregnancyFactor(vaccinated, 'self', false), 1);
  assert.match(healthcareQuote(vaccinated, vaccine).issue ?? '', /already on record/);
  const plan = apply(vaccinated, { type: 'healthcare', visit: birthControl });
  assert.ok(plan.reproductive?.self?.vaccinated);
  assert.equal(pregnancyFactor(plan, 'self', false), .08);
  assert.match(healthcareQuote(plan, birthControl).issue ?? '', /active/);
  const aged = apply(plan, { type: 'age' });
  assert.equal(pregnancyFactor(aged, 'self', false), 1);
  assert.ok(aged.reproductive?.self?.vaccinated);

  const courses = new Set<string>();
  for (let seed = 1; seed <= 120 && courses.size < 2; seed++) {
    const course = atAge(30);
    course.seed = seed;
    course.reproductive = { self: { cases: { hepatitisB: { year: course.year - 1, diagnosed: true } } } };
    advanceReproductiveHealth(course);
    if (course.reproductive.self?.cases.hepatitisB?.chronic) courses.add('chronic');
    if (course.reproductive.self?.hepatitisBImmunity) courses.add('cleared');
    assert.deepEqual(decodeLife(JSON.stringify(course)), course);
  }
  assert.deepEqual(courses, new Set(['chronic', 'cleared']));
});

test('player illnesses persist with severity and paid visits reconcile without changing the original state', () => {
  const life = atAge(30);
  life.random = 0;
  const health = life.character.attributes.health;
  startIllness(life, 'pneumonia');
  assert.equal(life.character.attributes.health, health - 9);
  assert.equal(activeIllness(life)?.level, 'severe');
  assert.match(healthcareQuote(life, communityVisit()).issue ?? '', /balance/);
  postTransaction(life, 'Gift', 1800, 'other');
  const restored = decodeLife(JSON.stringify(life));
  assert.deepEqual(restored, life);
  assert.equal(careOptions(restored, 'doctor', playerPatient)[0]?.fee, '$16.00');

  const treated = apply(restored, { type: 'healthcare', visit: communityVisit() });
  assert.equal(treated.character.bank, 200);
  assert.equal(treated.transactions.at(-1)?.amount, -1600);
  assert.equal(treated.transactions.at(-1)?.category, 'medical');
  assert.equal(activeIllness(treated)?.level, 'moderate');
  assert.equal(activeIllness(restored)?.level, 'severe');
  assert.match(healthcareQuote(treated, communityVisit()).issue ?? '', /balance/);
  assert.equal(treated.notices.at(-1)?.title, 'Doctor Visit');
});

test('minors receive free self care while accompanying relatives or friends requires earned salary and funds', () => {
  const life = atAge(16);
  life.random = 0;
  startIllness(life, 'cold');
  const healthy = apply(life, { type: 'healthcare', visit: communityVisit() });
  assert.equal(activeIllness(healthy), undefined);
  assert.equal(healthy.transactions.length, 0);

  const adult = atAge(27);
  adult.random = 0;
  const parent = adult.family[0]!;
  adult.schoolContacts = createSchoolClass(adult, 'high');
  const [friend, stranger] = adult.schoolContacts.filter(({ role }) => role === 'Classmate');
  assert.ok(friend && stranger);
  friend.friend = true;
  startIllness(adult, 'flu', parent);
  startIllness(adult, 'cold', friend);
  startIllness(adult, 'cold', stranger);
  postTransaction(adult, 'Gift', 250, 'other');
  assert.match(healthcareQuote(adult, communityVisit(friend.id)).issue ?? '', /earn a salary/i);
  assert.match(healthcareQuote(adult, communityVisit(stranger.id)).issue ?? '', /family members and friends/);
  postTransaction(adult, 'Wages', 300, 'salary');
  assert.deepEqual(carePatients(adult, 'doctor').map(({ id }) => id), [parent.id, friend.id]);
  assert.match(healthcareQuote(adult, communityVisit(parent.id)).issue ?? '', /balance/);
  const treatedFriend = apply(adult, { type: 'healthcare', visit: communityVisit(friend.id) });
  assert.equal(activeIllness(treatedFriend, friend.id), undefined);
  postTransaction(treatedFriend, 'Wages', 800, 'salary');
  const treatedParent = apply(treatedFriend, { type: 'healthcare', visit: communityVisit(parent.id) });
  assert.equal(activeIllness(treatedParent, parent.id), undefined);
  assert.equal(treatedParent.character.bank, 350);
});

test('an NPC can seek care alone and can receive follow-up care that year', () => {
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
  assert.equal(healthcareQuote(life, communityVisit(parent.id)).issue, null);
});

test('doctor reputation increases both the fee and the actual chance of improvement', () => {
  const life = atAge(27);
  life.random = 2;
  postTransaction(life, 'Savings', 4000, 'other');
  startIllness(life, 'pneumonia');
  const options = careOptions(life, 'doctor', playerPatient);
  assert.deepEqual(options.map(({ chance, fee, reputation }) => ({ chance, fee, reputation })), [
    { chance: 54, fee: '$16.00', reputation: 54 },
    { chance: 69, fee: '$24.00', reputation: 76 },
    { chance: 80, fee: '$32.00', reputation: 94 },
  ]);
  const low = apply(life, { type: 'healthcare', visit: options[0]!.visit });
  const high = apply(decodeLife(JSON.stringify(life)), { type: 'healthcare', visit: options[2]!.visit });
  assert.equal(activeIllness(low)?.level, 'severe');
  assert.match(low.journal.at(-1)!.text, /remained unchanged/);
  assert.equal(low.transactions.at(-1)?.amount, -1600);
  assert.match(healthcareQuote(low, options[2]!.visit).issue ?? '', /balance/);
  assert.equal(activeIllness(high)?.level, 'moderate');
  assert.equal(high.transactions.at(-1)?.amount, -3200);
  assert.equal(low.random, high.random);
});

test('emergency care stabilizes severe illness and optometry is limited to eye strain', () => {
  const life = atAge(27);
  const emergency = { service: 'emergency', patient: playerPatient } as const;
  const eyeCare = { service: 'optometrist', patient: playerPatient } as const;
  life.random = 0;
  postTransaction(life, 'Savings', 4200, 'other');
  startIllness(life, 'pneumonia');
  assert.ok(healthcareQuote(life, eyeCare).issue);
  const stabilized = apply(life, { type: 'healthcare', visit: emergency });
  assert.equal(activeIllness(stabilized)?.level, 'moderate');
  assert.equal(stabilized.transactions.at(-1)?.amount, -3600);
  assert.equal(stabilized.random, life.random);
  life.illnesses = [];
  startIllness(life, 'eye-strain');
  assert.ok(healthcareQuote(life, emergency).issue);
  const treated = apply(life, { type: 'healthcare', visit: eyeCare });
  assert.equal(activeIllness(treated), undefined);
  assert.equal(treated.notices.at(-1)?.title, 'Eye Care Visit');
});

test('psychiatry and donations apply service-specific conditions, effects, and fees', () => {
  const life = atAge(27);
  Object.assign(life.character.attributes, { stress: 45, energy: 100, health: 75 });
  postTransaction(life, 'Savings', 400, 'other');
  const session = apply(life, { type: 'healthcare', visit: { service: 'psychiatrist' } });
  assert.equal(session.character.attributes.stress, 27);
  assert.equal(session.character.bank, 0);
  const donated = apply(session, { type: 'healthcare', visit: { service: 'donate-plasma' } });
  assert.equal(donated.character.attributes.energy, 100);
  assert.equal(donated.character.bank, 400);
  assert.equal(donated.transactions.at(-1)?.category, 'other');
  const repeated = apply(donated, { type: 'healthcare', visit: { service: 'donate-plasma' } });
  assert.equal(repeated.character.bank, donated.character.bank);
  assert.equal(repeated.character.attributes.energy, donated.character.attributes.energy);
  startIllness(session, 'cold');
  assert.match(healthcareQuote(session, { service: 'donate-blood' }).issue ?? '', /no active illness/);
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

test('legacy V4 games preserve existing decisions and journal, and the current codec rejects invalid references', () => {
  const life = apply(atAge(5), { type: 'age' });
  const restored = decodeLife(JSON.stringify({ ...life, version: 4, illnesses: undefined, notices: undefined }));
  assert.deepEqual({ ...restored, social: undefined, world: undefined, wealth: undefined },
    { ...life, notices: [], illnesses: [], social: undefined, world: undefined, wealth: undefined });
  assert.equal(eventPopup(restored)?.title, 'First Classroom');
  assert.throws(() => decodeLife(JSON.stringify({ ...restored, notices: [{ entry: -1, title: 'Invalid' }] })), /invalid health or event/);
  assert.throws(() => decodeLife(JSON.stringify({ ...restored, illnesses: [{ patient: 'unknown', illness: 'cold', level: 'mild', started: life.year }] })), /invalid health or event/);
  const ending = apply(atAge(114), { type: 'age' });
  const finalNotice = eventPopup(ending);
  assert.equal(finalNotice?.title, 'End of Life');
  assert.deepEqual(finalNotice.portrait?.appearance, ending.character.appearance);
  assert.deepEqual(finalNotice.actions.map(({ destination }) => destination), ['summary', 'journal']);
  assert.deepEqual(apply(ending, finalNotice.actions[0]!.action).notices, []);
});

test('death notices keep the character portrait and funeral choice after reload', () => {
  const life = atAge(35);
  const parent = life.family[0]!;
  Object.assign(parent, { age: 74, health: 0, city: life.character.city });
  const aged = apply(life, { type: 'age' });
  const restored = decodeLife(JSON.stringify({ ...aged, pending: null, social: { ...aged.social, pendingPerson: null } }));
  const popup = eventPopup(restored)!;
  assert.equal(popup.special, 'death');
  assert.equal(popup.cause, 'Declining health');
  assert.deepEqual(popup.portrait, { appearance: parent.appearance, age: 75, name: parent.name, role: parent.role });
  assert.deepEqual(popup.actions.map(({ label }) => label), ['Attend Funeral', 'Skip Funeral', 'Surprise Me']);
  assert.match(advance(restored, { type: 'acknowledge-event', entry: restored.notices[0]!.entry }).error ?? '', /remember/);
  const attended = apply(restored, popup.actions[0]!.action);
  assert.match(attended.journal.at(-1)!.text, /attended/);
  assert.equal(attended.notices.length, restored.notices.length - 1);
  assert.match(advance(attended, popup.actions[0]!.action).error ?? '', /no longer available/);
  const skipped = apply(restored, popup.actions[1]!.action);
  assert.match(skipped.journal.at(-1)!.text, /didn’t go/);
  assert.deepEqual(apply(restored, popup.actions[2]!.action), apply(decodeLife(JSON.stringify(restored)), popup.actions[2]!.action));
  const remote = decodeLife(JSON.stringify(restored));
  remote.character.city = remote.character.city === 'Bellmere' ? 'Northwick' : 'Bellmere';
  const send = eventPopup(remote)!.actions[0]!;
  assert.equal(send.label, 'Send Condolences');
  assert.match(apply(remote, send.action).journal.at(-1)!.text, /sent condolences/);
});
