import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { adoptionApplicationFee, adoptionCandidates } from '../src/engine/adoption.ts';
import { accessoryOptions, noAccessories } from '../src/engine/appearance.ts';
import { createLife } from '../src/engine/create.ts';
import { adoptionCost } from '../src/engine/familyLife.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { availableProcedures, findProcedure, surgeons, surgeryFee } from '../src/engine/plasticSurgery.ts';
import { seededRandom } from '../src/engine/random.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { newWorld } from '../src/engine/world.ts';
import { eventPopup } from '../src/eventView.ts';
import { portraitSrc } from '../src/portraits/portrait.ts';

function adult() {
  const life = createLife(4);
  life.year += 18;
  life.character.age = 18;
  life.family.forEach((person) => { person.age += 18; });
  life.world = newWorld(life.seed, life.year, true);
  postTransaction(life, 'Savings', 50000, 'other');
  return life;
}

function act(life: Life, action: Action) {
  const next = advance(life, action);
  assert.ok(next.life, next.error);
  return next.life;
}

test('all hats and glasses render distinctly, equip together, and survive a save', () => {
  const life = adult();
  const { appearance, age } = life.character;
  const portraits = [
    ...accessoryOptions.hat.map((hat) => portraitSrc({ ...appearance, accessories: { ...noAccessories, hat } }, age)),
    ...accessoryOptions.glasses.slice(1).map((glasses) => portraitSrc({ ...appearance, accessories: { ...noAccessories, glasses } }, age)),
  ];
  assert.equal(new Set(portraits).size, 11);
  const choices = { hat: 'Ferrari Edition Cap', glasses: 'Tony Stark Glasses' } as const;
  const equipped = act(life, { type: 'change-accessories', choices });
  assert.equal(life.character.appearance.accessories, undefined);
  const restored = decodeLife(JSON.stringify(equipped));
  assert.deepEqual(restored.character.appearance.accessories, choices);
  assert.notEqual(portraitSrc(restored.character.appearance, age), portraitSrc(appearance, age));
  const removed = act(restored, { type: 'change-accessories', choices: noAccessories });
  assert.equal(portraitSrc(removed.character.appearance, age), portraitSrc(appearance, age));
});

test('a single adult can adopt the exact shortlisted child after reload', () => {
  const life = adult();
  const candidates = adoptionCandidates(life);
  assert.equal(candidates.length, 5);
  assert.deepEqual(new Set(candidates.map(({ person }) => person.age)), new Set([1, 2, 3]));
  assert.deepEqual(adoptionCandidates(decodeLife(JSON.stringify(life))), candidates);
  const selected = candidates[2]!;
  const action = { type: 'adopt-child', person: selected.person.id } as const;
  assert.match(advance(createLife(4), action).error ?? '', /age 18/);
  const application = act(life, action);
  assert.equal(application.character.bank, life.character.bank - adoptionApplicationFee);
  assert.equal(application.social.children[selected.person.id], undefined);
  assert.match(advance(application, action).error ?? '', /reviewed/);
  const adopted = act(decodeLife(JSON.stringify(application)), { type: 'age' });
  const child = adopted.social.people.find(({ id }) => id === selected.person.id);
  assert.deepEqual(child, { ...selected.person, age: selected.person.age + 1 });
  assert.equal(adopted.transactions.filter(({ label }) => /applied to adopt|adopted/.test(label)).reduce((sum, { amount }) => sum + amount, 0), -adoptionCost);
  assert.deepEqual(adopted.social.parents[selected.person.id], ['self']);
  assert.equal(adopted.social.children[selected.person.id]?.learning, selected.smarts);
  assert.equal(adopted.social.children[selected.person.id]?.adopted, true);
  assert.equal(adoptionCandidates(adopted).some(({ person }) => person.id === selected.person.id), false);
  assert.equal(adopted.social.adoption, undefined);
  assert.deepEqual(decodeLife(JSON.stringify(adopted)), adopted);
});

test('surgery charges the selected tier and reports both positive and negative Looks changes', () => {
  const life = adult();
  life.character.gender = 'woman';
  life.character.attributes.looks = 50;
  assert.ok(availableProcedures(life).some(({ id }) => id === 'chest-augmentation'));
  assert.ok(!availableProcedures(life).some(({ id }) => id === 'chest-contouring'));
  const procedure = findProcedure(life, 'nose')!;
  assert.ok(surgeryFee(procedure, surgeons[2]) > surgeryFee(procedure, surgeons[0]));
  assert.ok(surgeons[2].chance > surgeons[0].chance);

  life.random = 0;
  const success = act(life, { type: 'plastic-surgery', procedure: 'nose', surgeon: 'specialist' });
  assert.ok(success.character.attributes.looks > 50);
  assert.equal(success.character.bank, life.character.bank - surgeryFee(procedure, surgeons[2]));
  assert.equal(eventPopup(success)?.title, 'Cosmetic Procedure Complete');
  assert.equal(eventPopup(success)?.meter?.label, 'Looks');

  while (seededRandom(life.random).next() * 100 < surgeons[0].chance) life.random++;
  const failure = act(life, { type: 'plastic-surgery', procedure: 'nose', surgeon: 'local' });
  assert.ok(failure.character.attributes.looks < 50);
  assert.equal(failure.character.bank, life.character.bank - surgeryFee(procedure, surgeons[0]));
  assert.equal(failure.transactions.at(-1)?.category, 'medical');
  assert.equal(eventPopup(failure)?.title, 'Surgery Complication');
  assert.deepEqual(decodeLife(JSON.stringify(failure)), failure);
});
