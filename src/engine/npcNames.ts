import { npcGivenNames, npcSurnames } from '../data/npcNames.ts';
import { genders } from '../data/veyra.ts';
import { allContacts } from './npcs.ts';
import type { seededRandom } from './random.ts';
import type { Gender, Life } from './types.ts';

export function npcNamePicker(life: Life) {
  const { firstName, lastName } = life.character;
  const contacts = allContacts(life);
  const surnameFrom = (name: string) => name.slice(name.lastIndexOf(' ') + 1);
  const usedSurnames = new Set([lastName, ...contacts.map((person) => person.lastName ?? surnameFrom(person.name))].map((name) => name.toLowerCase()));
  const usedNames = new Set([`${firstName} ${lastName}`, ...contacts.map(({ name }) => name)].map((name) => name.toLowerCase()));
  const unusedSurnames = npcSurnames.filter((surname) => !usedSurnames.has(surname.toLowerCase()));

  return (random: ReturnType<typeof seededRandom>, gender: Gender = random.pick(genders)) => {
    const given = random.pick(npcGivenNames[gender]);
    const pool = unusedSurnames.length ? unusedSurnames : npcSurnames;
    const index = random.integer(0, pool.length - 1);
    let surname = pool[index]!;
    if (unusedSurnames.length) unusedSurnames.splice(index, 1);
    else if (usedNames.has(`${given} ${surname}`.toLowerCase())) {
      surname = npcSurnames.find((candidate) => !usedNames.has(`${given} ${candidate}`.toLowerCase())) ?? surname;
    }
    const name = `${given} ${surname}`;
    usedNames.add(name.toLowerCase());
    return { name, gender, lastName: surname };
  };
}
