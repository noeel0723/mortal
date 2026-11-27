import { record } from './journal.ts';
import { findContact } from './school.ts';
import type { Contact, FamilyResponse, Life } from './types.ts';

const lastNameOf = (person: Contact) => person.lastName ?? person.name.slice(person.name.lastIndexOf(' ') + 1);

export function setSurname(person: Contact, name: string) {
  const given = person.name.slice(0, -lastNameOf(person).length).trimEnd() || person.name;
  person.name = `${given} ${name}`;
  person.lastName = name;
  return given;
}

export function surname(life: Life, id: string) {
  if (id === 'self') return life.character.lastName;
  const person = findContact(life, id);
  return person ? lastNameOf(person) : undefined;
}

export function birthParents(life: Life, child: string) {
  const parents = life.social.parents[child];
  if (parents?.length !== 2) return [];
  const gender = (id: string) => id === 'self' ? life.character.gender : findContact(life, id)?.gender;
  const mother = parents.find((id) => gender(id) === 'woman');
  const father = parents.find((id) => gender(id) === 'man');
  if (mother && father) return [{ id: mother, label: 'Mother' }, { id: father, label: 'Father' }];
  return parents.map((id) => ({ id, label: id === 'self' ? 'You' : 'Partner' }));
}

export function respondToSurname(life: Life, kind: 'wedding-names' | 'birth', id: string, response: FamilyResponse) {
  const person = findContact(life, id);
  if (!person) return 'This person is unavailable.';
  if (kind === 'wedding-names' && response === 'keep') return null;
  if (response !== 'first' && response !== 'second') return 'Choose a surname.';
  if (kind === 'birth') {
    const parent = birthParents(life, id)[response === 'first' ? 0 : 1];
    const name = parent && surname(life, parent.id);
    if (!name) return 'This surname is unavailable.';
    const given = setSurname(person, name);
    record(life, 'family', `We chose the surname ${name} for ${given}.`);
  } else {
    if (response === 'first') {
      life.character.lastName = lastNameOf(person);
      record(life, 'family', `I took ${life.character.lastName} as my surname after our wedding.`);
    } else {
      const given = setSurname(person, life.character.lastName);
      record(life, 'family', `${given} took my surname, ${life.character.lastName}, after our wedding.`);
    }
  }
  return null;
}
