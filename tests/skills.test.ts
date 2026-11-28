import { newWorld } from '../src/engine/world.ts';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skillIds, trainingMethods } from '../src/data/skills.ts';
import { eventById } from '../src/data/events.ts';
import { decodeLife } from '../src/database/codec.ts';
import { createLife } from '../src/engine/create.ts';
import { ensureNpc, makeNpc } from '../src/engine/npcs.ts';
import { datingCompatibility } from '../src/engine/love.ts';
import { findContact } from '../src/engine/school.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { advance } from '../src/engine/simulation.ts';
import { ageSkills, skillAt, skillTier, trainingIssue, trainingUsed } from '../src/engine/skills.ts';
import { showcaseIssue } from '../src/engine/skillShowcases.ts';
import { skillLimits } from '../src/engine/skillTypes.ts';
import type { Action, Life } from '../src/engine/types.ts';

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function atAge(age: number) {
  const life = createLife(612);
  life.character.age = age;
  life.year += age;
  life.world = newWorld(life.seed, life.year, true);
  return life;
}

test('all individual skills start at zero and aptitudes are seeded with a matching talent bonus', () => {
  const life = createLife(171);
  const copy = createLife(171);
  assert.equal(skillIds.length, 26);
  for (const id of skillIds) {
    assert.deepEqual(skillAt(life, id), skillAt(copy, id));
    assert.equal(skillAt(life, id).proficiency, 0);
    assert.equal(skillAt(life, id).firstYear, null);
  }
  life.character.talent = null;
  copy.character.talent = 'academic';
  assert.equal(skillAt(copy, 'programming').aptitude - skillAt(life, 'programming').aptitude, 16);
  assert.equal(skillAt(copy, 'running').aptitude, skillAt(life, 'running').aptitude);
  assert.deepEqual([14, 15, 30, 55, 75, 90].map(skillTier), ['Novice', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Elite']);
});

test('training verifies age, energy and funds, books the fee once and persists the result', () => {
  const birth = createLife(118);
  assert.match(trainingIssue(birth, 'programming', 'course') ?? '', /age 10/);
  const adult = atAge(20);
  adult.character.bank = 0;
  adult.transactions = [];
  assert.match(trainingIssue(adult, 'programming', 'course') ?? '', /need \$/);
  postTransaction(adult, 'Savings', 1000, 'other');
  adult.character.attributes.energy = 0;
  assert.match(trainingIssue(adult, 'programming', 'course') ?? '', /energy/);
  adult.character.attributes.energy = 100;
  const trained = apply(adult, { type: 'train-skill', skill: 'programming', method: 'course' });
  const progress = skillAt(trained, 'programming');
  assert.ok(progress.proficiency > 0);
  assert.equal(progress.experience, trainingMethods.course.experience);
  assert.equal(progress.lastYear, adult.year);
  assert.equal(trained.character.bank, 1000 - trainingMethods.course.fee);
  assert.equal(trained.character.bank, trained.transactions.reduce((sum, entry) => sum + entry.amount, 0));
  assert.equal(trained.transactions.filter(({ category }) => category === 'training').length, 1);
  assert.equal(skillAt(adult, 'programming').proficiency, 0);
  assert.equal(trained.notices.at(-1)?.meter?.value, progress.proficiency);
  assert.deepEqual(decodeLife(JSON.stringify(trained)), trained);
});

test('rest cannot bypass annual training limits and expert practice has diminishing returns', () => {
  const action = { type: 'train-skill', skill: 'running', method: 'practice' } as const;
  const initial = atAge(14);
  const expert = structuredClone(initial);
  expert.skills.entries.running = { ...skillAt(expert, 'running'), proficiency: 85, best: 85, experience: 400,
    firstYear: expert.year - 4, lastYear: expert.year - 1 };
  assert.ok(skillAt(apply(initial, action), 'running').lastChange > skillAt(apply(expert, action), 'running').lastChange);
  let life = initial;
  for (let index = 0; index < skillLimits.yearlyPerSkill; index++) life = apply(life, action);
  const rested = apply(life, { type: 'activity', activity: 'rest' });
  assert.equal(trainingUsed(rested), skillLimits.yearlyPerSkill);
  assert.match(advance(rested, action).error ?? '', /finished your sessions/);
  assert.ok(skillAt(rested, 'running').proficiency <= skillLimits.yearlyGain);
  const aged = apply(rested, { type: 'age' });
  assert.equal(trainingUsed(aged), 0);
  assert.equal(skillAt(aged, 'running').proficiency, skillAt(rested, 'running').proficiency);
});

test('the annual session budget is shared across skills and methods', () => {
  let life = atAge(20);
  postTransaction(life, 'Savings', 20000, 'other');
  for (const id of ['running', 'chess', 'programming', 'singing'] as const) {
    for (const method of ['class', 'course', 'coaching', 'practice'] as const) {
      life = apply(life, { type: 'activity', activity: 'rest' });
      life = apply(life, { type: 'train-skill', skill: id, method });
    }
  }
  assert.equal(trainingUsed(life), 16);
  assert.match(trainingIssue(life, 'writing', 'practice') ?? '', /schedule is full/);
  assert.equal(life.transactions.filter(({ category }) => category === 'training').length, 12);
});

test('extended inactivity decays physical skills earlier while retaining experience and a proficiency floor', () => {
  const life = atAge(70);
  for (const id of ['running', 'programming'] as const) {
    life.skills.entries[id] = { ...skillAt(life, id), proficiency: 80, best: 80, experience: 300, firstYear: life.year - 20, lastYear: life.year - 4 };
  }
  ageSkills(life);
  assert.equal(skillAt(life, 'running').proficiency, 78);
  assert.equal(skillAt(life, 'programming').proficiency, 80);
  for (let i = 0; i < 80; i++) {
    life.year++;
    ageSkills(life);
  }
  assert.equal(skillAt(life, 'running').proficiency, 24);
  assert.equal(skillAt(life, 'programming').proficiency, 44);
  assert.equal(skillAt(life, 'programming').experience, 300);
});

test('version 7 migration preserves the prior state and invents no training history', () => {
  const { skills, ...state } = atAge(18);
  const restored = decodeLife(JSON.stringify({ ...state, version: 7 }));
  assert.deepEqual(restored, { ...state, skills });
  assert.throws(() => decodeLife(JSON.stringify({ ...state, skills: { ...skills, hobbies: ['invalid'] } })), /skill data/);
});

test('amateur events require recent training, use deterministic scores, and book at most one entry in a year', () => {
  const life = atAge(25);
  postTransaction(life, 'Savings', 10000, 'other');
  Object.assign(life.character.attributes, { athleticism: 100, health: 100 });
  assert.match(showcaseIssue(life, 'running') ?? '', /Reach 25%/);
  life.skills.entries.running = { ...skillAt(life, 'running'), proficiency: 100, best: 100, experience: 500,
    sessions: 40, firstYear: life.year - 12, lastYear: life.year - 2 };
  assert.match(showcaseIssue(life, 'running') ?? '', /Practice again/);
  life.skills.entries.running.lastYear = life.year;
  const compete = { type: 'skill-showcase', skill: 'running' } as const;
  const winner = apply(life, compete);
  assert.deepEqual(winner, apply(life, compete));
  assert.equal(skillAt(winner, 'running').showcases[0]?.outcome, 'Winner');
  assert.equal(skillAt(winner, 'running').awards, 1);
  assert.equal(winner.character.bank, life.character.bank - 450);
  assert.equal(winner.notices.at(-1)?.title, 'Amateur Champion');
  assert.match(advance(winner, compete).error ?? '', /already took part/);
  assert.deepEqual(decodeLife(JSON.stringify(winner)), winner);
});

test('shared hobbies reuse contacts and improve compatibility, conversations, and joint practice', () => {
  const adult = atAge(25);
  const contact = makeNpc(adult, 'npc-hobby-friend', 24, 'Acquaintance');
  contact.friend = true;
  contact.bond.affection = 50;
  adult.social.people.push(contact);
  ensureNpc(adult, contact).interests = ['chess', 'hiking'];
  const hobby = apply(apply(adult, { type: 'train-skill', skill: 'chess', method: 'practice' }), { type: 'set-hobby', skill: 'chess', enabled: true });
  assert.equal(datingCompatibility(hobby, contact), datingCompatibility(adult, contact) + 4);
  const met = apply(hobby, { type: 'meet', source: 'hobbies' });
  assert.equal(met.social.people.length, 1);
  assert.match(met.journal.at(-1)?.text ?? '', /ran into.*Chess/);
  const caughtUp = apply(met, { type: 'choose', event: 'social-meeting', choice: 'accept' });
  const talked = apply(caughtUp, { type: 'talk', person: contact.id });
  assert.match(talked.journal.at(-1)?.text ?? '', /traded ideas about Chess/);
  const practice = { type: 'share-hobby', person: contact.id, skill: 'chess' } as const;
  const together = apply(talked, practice);
  assert.ok(findContact(together, contact.id)!.bond.affection > findContact(talked, contact.id)!.bond.affection);
  assert.equal(skillAt(together, 'chess').proficiency, skillAt(talked, 'chess').proficiency + 1);
  assert.match(advance(together, practice).error ?? '', /next year/);
});

test('parental support develops age-appropriate child interests with optional lessons charged once', () => {
  const life = atAge(32);
  postTransaction(life, 'Savings', 2500, 'other');
  const child = makeNpc(life, `npc-child-${life.year}`, 7, 'Child');
  const coParent = makeNpc(life, 'npc-co-parent', 32, 'Acquaintance');
  life.social.people.push(child, coParent);
  ensureNpc(life, child).interests = ['sketching', 'reading'];
  life.social.parents[child.id] = ['self', coParent.id];
  life.social.children[child.id] = { year: life.year, adopted: true, wellbeing: 80, learning: 60, confidence: 50, supportEnded: false };
  const encouraged = apply(life, { type: 'parent-child', person: child.id, action: 'hobby' });
  assert.equal(encouraged.skills.children[child.id]?.length, 1);
  assert.equal(encouraged.skills.children[child.id]?.[0]?.proficiency, 2);
  const lesson = { type: 'parent-child', person: child.id, action: 'lesson' } as const;
  const supported = apply(encouraged, lesson);
  assert.equal(supported.skills.children[child.id]?.[0]?.proficiency, 7);
  assert.equal(supported.character.bank, life.character.bank - 750);
  assert.match(advance(supported, lesson).error ?? '', /next year/);
  const nextYear = apply(supported, { type: 'age' });
  assert.ok(nextYear.skills.children[child.id]![0]!.proficiency > 7);
  assert.equal(nextYear.skills.children[child.id]?.length, 1);
  assert.deepEqual(decodeLife(JSON.stringify(nextYear)), nextYear);
});

test('repeatable leisure and walks stop growing the journal once effective visits are exhausted', () => {
  let life = atAge(26);
  postTransaction(life, 'Savings', 5000, 'other');
  const movie = { type: 'lifestyle', activity: 'movie' } as const;
  const walk = { type: 'activity', activity: 'walk' } as const;
  const rest = { type: 'activity', activity: 'rest' } as const;
  for (let index = 0; index < 20; index++) {
    life = apply(apply(apply(life, movie), walk), rest);
  }
  assert.equal(life.transactions.filter(({ category }) => category === 'leisure').length, 3);
  assert.equal(life.journal.length, 1 + 3 + 6 + 6);
  assert.equal(life.notices.length, 3 + 6 + 6);
  assert.equal(apply(life, movie), life);
});

test('library practice and general benefits taper while repeat visits retain the encounter flow', () => {
  const library = { type: 'activity', activity: 'go-to-library' } as const;
  let life = atAge(10);
  for (let visit = 0; visit < 6; visit++) {
    life = apply(life, library);
    if (life.pending) {
      const event = eventById.get(life.pending)!;
      const selected = event.choices!.at(-1)!;
      life = apply(life, { type: 'choose', event: event.id, choice: selected.id });
    }
  }
  assert.equal(skillAt(life, 'writing').proficiency, 4);
  assert.equal(skillAt(life, 'writing').experience, 8);
  assert.equal(life.usedActions.filter((key) => key.startsWith('library-check-')).length >= 1, true);
  for (let visit = 0; visit < 20; visit++) assert.equal(apply(life, library), life);
});
