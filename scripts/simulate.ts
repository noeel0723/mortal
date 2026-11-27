import assert from 'node:assert/strict';
import { eventById } from '../src/data/events.ts';
import { createLife } from '../src/engine/create.ts';
import { advance, maxAge } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';

const count = Number(process.argv[2] ?? 1000);
assert.ok(Number.isInteger(count) && count >= 1 && count <= 100000, 'Choose between 1 and 100000 lives.');
const ages: number[] = [];
const templates = new Set<string>();
let decisions = 0;
let contextualEvents = 0;

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

for (let seed = 1; seed <= count; seed++) {
  let life = createLife(seed);
  let turns = 0;
  while (!life.character.causeOfDeath) {
    assert.ok(++turns <= maxAge, `Turn limit exceeded for seed ${seed}.`);
    life = apply(life, { type: 'age' });
    if (life.pending) {
      const choices = eventById.get(life.pending)?.choices;
      const choice = choices?.[seed % choices.length];
      assert.ok(choice);
      life = apply(life, { type: 'choose', event: life.pending, choice: choice.id });
      decisions++;
    }
    assert.equal(life.year, life.character.birthYear + life.character.age);
    assert.ok(Object.values(life.character.attributes).every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
    assert.ok(life.family.every((person) => person.age <= maxAge && Object.values(person.bond).every((value) => value >= 0 && value <= 100)));
    assert.equal(life.character.bank, life.transactions.reduce((balance, item) => balance + item.amount, 0));
  }
  assert.equal(life.seen.length, new Set(life.seen).size);
  for (const event of life.seen) templates.add(event);
  contextualEvents += life.seen.length;
  ages.push(life.character.age);
}

ages.sort((a, b) => a - b);
console.log(JSON.stringify({
  lives: count,
  minimumAge: ages[0],
  medianAge: ages[Math.floor(count / 2)],
  maximumAge: ages.at(-1),
  meanAge: Number((ages.reduce((sum, age) => sum + age, 0) / count).toFixed(1)),
  distinctTemplatesObserved: templates.size,
  meanContextualEvents: Number((contextualEvents / count).toFixed(1)),
  decisionsResolved: decisions,
}, null, 2));
