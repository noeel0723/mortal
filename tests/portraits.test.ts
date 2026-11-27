import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { eventById } from '../src/data/events.ts';
import { genders } from '../src/data/veyra.ts';
import { appearanceOptions, creationAppearance, generateAppearance } from '../src/engine/appearance.ts';
import { createLife } from '../src/engine/create.ts';
import { currentClass } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import { portraitAge, portraitSrc } from '../src/portraits/portrait.ts';
import type { Action, Life } from '../src/engine/types.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

test('faces can be edited at birth and hair changes cannot edit those features later', () => {
  const life = createLife(85);
  const customized = act(life, { type: 'change-appearance', choices: { ...creationAppearance, hair: 'Long', eyes: 'Sharp', nose: 'Wide', mouth: 'Full' } });
  assert.equal(customized.character.appearance.hair, 'Long');
  assert.equal(customized.character.appearance.eyes, 'Sharp');
  assert.deepEqual(life.character.appearance, generateAppearance(life.seed, 'player'));
  assert.equal(customized.random, life.random);
  const older = act(customized, { type: 'age' });
  assert.match(advance(older, { type: 'change-appearance', choices: creationAppearance }).error ?? '', /first Age Up/);
  const forgedHair = { hair: 'Bob', hairColor: 'Honey', eyes: 'Round', nose: 'Button', mouth: 'Small' } as const;
  const saved = act(older, { type: 'change-hair', choices: forgedHair });
  assert.deepEqual(saved.character.appearance, { ...customized.character.appearance, hair: 'Bob', hairColor: 'Honey' });
  assert.equal(saved.random, older.random);
  assert.equal(saved.character.bank, older.character.bank);
  assert.deepEqual(decodeLife(JSON.stringify(saved)), saved);
});

test('birth customization is independent of gender and character attributes', () => {
  const profile = { firstName: 'Nara', lastName: 'Vale', gender: 'nonbinary', country: 'Veyra', city: 'Bellmere',
    background: 'middle-income', birthYear: 2000, talent: null } as const;
  const { character: original, random } = createLife(12, profile);
  const updated = createLife(12, { ...profile, appearance: creationAppearance });
  assert.deepEqual(updated.character.appearance, creationAppearance);
  assert.equal(updated.character.gender, profile.gender);
  assert.deepEqual(updated.character.attributes, original.attributes);
  assert.equal(updated.random, random);
});

test('version 2 saves gain stable portraits and preserve existing contacts, friendships, and education data', () => {
  let life = createLife(4);
  while (life.character.age < 6) {
    if (life.pending) life = act(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending)!.choices![0]!.id });
    life = act(life, { type: 'age' });
  }
  life = act(life, { type: 'choose', event: 'first-classroom', choice: 'join' });
  const contact = currentClass(life).find(({ role }) => role === 'Classmate')!;
  life = act(life, { type: 'befriend', person: contact.id });
  const snapshot = JSON.stringify({ ...life, version: 2, illnesses: undefined, notices: undefined,
    character: { ...life.character, appearance: undefined },
    family: life.family.map((person) => ({ ...person, appearance: undefined, gender: undefined })),
    schoolContacts: life.schoolContacts.map((person) => ({ ...person, appearance: undefined, gender: undefined })),
  });
  const restored = decodeLife(snapshot);
  assert.deepEqual({ ...restored, social: undefined }, { ...life, illnesses: [], notices: [], social: undefined });
  assert.equal(restored.schoolContacts.find(({ id }) => id === contact.id)?.friend, true);
  assert.ok(restored.schoolContacts.every((person) => genders.includes(person.gender)));
  const signatures = new Set(restored.schoolContacts.map((person) => portraitSrc(person.appearance, person.age)));
  assert.equal(signatures.size, restored.schoolContacts.length);
  const invalid = { ...restored, character: { ...restored.character, appearance: { ...restored.character.appearance, skin: 20 } } };
  assert.throws(() => decodeLife(JSON.stringify(invalid)), /invalid character data/);
});

test('the same layered portrait changes across life stages and hair colors stay visible in old age', () => {
  const ages = [0, 6, 14, 24, 55, 70];
  assert.deepEqual(ages.map(portraitAge), ['infant', 'child', 'teen', 'adult', 'mature', 'elder']);
  const portraits = ages.map((age) => portraitSrc(creationAppearance, age));
  assert.equal(new Set(portraits).size, ages.length);
  for (const portrait of portraits) {
    assert.match(portrait, /^data:image\/png;base64,/);
    const bytes = Buffer.from(portrait.split(',')[1]!, 'base64');
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 72);
    assert.equal(bytes.readUInt32BE(20), 72);
  }
  assert.notEqual(portraitSrc({ ...creationAppearance, hairColor: 'Honey' }, 70), portraits[5]);
  assert.equal(portraitSrc({ ...creationAppearance }, 70), portraits[5]);
  for (const [field, { values }] of Object.entries(appearanceOptions)) {
    const variants = values.map((value) => portraitSrc({ ...creationAppearance, [field]: value }, 24));
    assert.equal(new Set(variants).size, values.length, `${field} options look distinct`);
  }
});
