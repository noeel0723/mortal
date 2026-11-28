import { recordNotice } from './eventNotices.ts';
import { familyRelation } from './kinship.ts';
import { ensureNpc, initialNpcProfile, makeNpc, newPeopleLimit, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import type { SocialPerson } from './socialTypes.ts';
import type { Contact, Life } from './types.ts';

const relativeLimit = 14;
function room(life: Life, count = 1) {
  const reserved = (life.social.pregnancies?.length ?? 0) + 1;
  return life.social.people.length + count + reserved <= newPeopleLimit &&
    life.social.people.filter(({ role }) => ['Sibling', 'Grandparent', 'Relative'].includes(role)).length + count <= relativeLimit;
}

function addRelative(life: Life, id: string, age: number, role: SocialPerson['role'], parents: string[] = [], city = life.character.city) {
  const person = makeNpc(life, id, age, role);
  person.city = city;
  life.social.people.push(person);
  ensureNpc(life, person);
  if (parents.length) life.social.parents[id] = parents;
  return person;
}

export function olderSiblingAtBirth(life: Life) {
  const parents = life.family;
  const oldest = Math.min(6, ...parents.map(({ age }) => age - 18));
  const random = npcRandom(life, 'older-sibling');
  if (!parents.length || oldest < 1 || random.next() >= .13) return;
  const sibling = addRelative(life, 'npc-sibling-older-1', random.integer(1, oldest), 'Sibling', parents.map(({ id }) => id));
  remember(life, sibling, 'An older sibling welcomed me home.');
}

export function meetInLaws(life: Life, spouse: Contact) {
  if (life.social.parents[spouse.id] || !room(life)) return;
  const random = npcRandom(life, `in-laws:${spouse.id}`, life.year);
  const age = spouse.age + random.integer(19, 27);
  if (age >= 88 || random.next() >= .58) return;
  const inLaw = addRelative(life, `npc-in-law-${spouse.id}`, age, 'Relative', [], spouse.city);
  life.social.parents[spouse.id] = [inLaw.id];
  remember(life, inLaw, `I got to know ${spouse.name}’s family around our wedding.`);
  if (room(life) && random.next() < .35) addRelative(life, `npc-in-law-sibling-${spouse.id}`, Math.max(18, spouse.age - 2),
    'Relative', [inLaw.id], spouse.city);
}

function advanceKin(life: Life, age: number) {
  const random = npcRandom(life, 'extended-family', life.year);
  if (age === 4 && life.family[1]?.alive && room(life)) {
    const parent = life.family[1];
    const elderAge = parent.age + random.integer(20, 28);
    if (elderAge < 84 && random.next() < .72 && !life.social.parents[parent.id]) {
      const elder = addRelative(life, 'npc-grandparent-2', elderAge, 'Grandparent', [], parent.city);
      life.social.parents[parent.id] = [elder.id];
    }
  }
  if (age === 7 && room(life, 2) && random.next() < .44) {
    const parent = life.family.find(({ id, age }) => age >= 27 && life.social.parents[id]?.length);
    if (parent) {
      const aunt = addRelative(life, `npc-aunt-uncle-${parent.id}`, parent.age - 2, 'Relative', [...life.social.parents[parent.id]!], parent.city);
      addRelative(life, `npc-cousin-${parent.id}`, Math.min(8, aunt.age - 18), 'Relative', [aunt.id], parent.city);
    }
  }
  if (age >= 5 && age <= 17 && room(life, 2) && life.family.filter(({ alive }) => alive).length === 1 &&
    !life.social.unions?.some(({ people }) => people.some((id) => life.family.some((parent) => parent.id === id))) && random.next() < .045) {
    const parent = life.family.find(({ alive }) => alive)!;
    const partner = addRelative(life, `npc-step-parent-${parent.id}`, Math.min(82, Math.max(23, parent.age + random.integer(-5, 6))), 'Relative', [], parent.city);
    const unions = life.social.unions ??= [];
    unions.push({ people: [parent.id, partner.id], since: life.year, married: life.year });
    ensureNpc(life, parent).localPartner = partner.id;
    ensureNpc(life, partner).localPartner = parent.id;
    addRelative(life, `npc-step-sibling-${parent.id}`, Math.min(age, partner.age - 18), 'Relative', [partner.id], parent.city);
    recordNotice(life, 'family', 'A Blended Family', `${parent.name} married ${partner.name}. We began getting to know our new family.`);
  }
}

export function advanceFamilyNetwork(life: Life) {
  const age = life.character.age;
  advanceKin(life, age);
  const relatives = life.social.people.filter((person) => person.alive && ['Sibling', 'Child'].includes(person.role) && person.age >= 21 && person.age <= 46);
  for (const relative of relatives.slice(0, 6)) {
    const profile = ensureNpc(life, relative);
    const random = npcRandom(life, `family-life:${relative.id}`, life.year);
    const union = life.social.unions?.find(({ people }) => people.includes(relative.id));
    if (!union && !profile.localPartner && room(life, 2) && random.next() < .10) {
      const id = `npc-family-partner-${relative.id}`;
      if (findContact(life, id)) continue;
      const partner = makeNpc(life, id, Math.max(20, relative.age + random.integer(-3, 5)), 'Acquaintance');
      if (!profile.preferences.includes(partner.gender) || !initialNpcProfile(life, partner).preferences.includes(relative.gender)) continue;
      partner.city = relative.city;
      life.social.people.push(partner);
      ensureNpc(life, partner).localPartner = relative.id;
      profile.localPartner = partner.id;
      (life.social.unions ??= []).push({ people: [relative.id, partner.id], since: life.year });
      remember(life, relative, `Started seeing ${partner.name}.`);
      continue;
    }
    if (!union) continue;
    const partner = findContact(life, union.people.find((id) => id !== relative.id));
    if (!partner?.alive || relative.city !== partner.city) continue;
    if (!union.married && life.year - union.since >= 2 && random.next() < .24) {
      union.married = life.year;
      remember(life, relative, `Married ${partner.name}.`);
      recordNotice(life, 'family', 'A Family Wedding', `${relative.name} and ${partner.name} got married.`);
    } else if (union.married && relative.age <= 43 && room(life) && random.next() < .14 &&
      !Object.values(life.social.parents).some((parents) => parents.includes(relative.id))) {
      const newborn = addRelative(life, `npc-family-baby-${relative.id}`, 0, 'Relative', [relative.id, partner.id], relative.city);
      if (familyRelation(life, newborn.id)) recordNotice(life, 'family', 'Our Family Grew', `${relative.name} and ${partner.name} welcomed ${newborn.name}.`);
    }
  }
}
