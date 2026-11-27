import { jobById } from '../data/jobs.ts';
import { cities, genders } from '../data/veyra.ts';
import { allContacts, newPeopleLimit } from '../engine/npcs.ts';
import { isActiveRomance } from '../engine/love.ts';
import { employment, npcEducation, romanceStatuses, socialEvents, traits } from '../engine/socialTypes.ts';
import type { Life } from '../engine/types.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;

export function validateSocial(life: Life, savedPerson: (value: unknown) => value is Record<string, unknown>) {
  const social = life.social;
  const { year, character } = life;
  const date = (value: unknown) => integer(value, character.birthYear, year);
  const amount = (value: unknown) => integer(value, 0, Number.MAX_SAFE_INTEGER);
  const history = (value: unknown, length: number) => Array.isArray(value) && value.length <= length &&
    value.every((item: unknown) => record(item) && date(item.year) && typeof item.text === 'string');
  if (!record(social) || !Array.isArray(social.people) || social.people.length > newPeopleLimit ||
    !social.people.every((person: unknown) => savedPerson(person) && typeof person.id === 'string' &&
      /^npc-[a-z0-9-]+$/.test(person.id) && ['Sibling', 'Grandparent', 'Child', 'Acquaintance'].includes(String(person.role)) &&
      typeof person.friend === 'boolean') || !record(social.profiles) || !record(social.parents) || !record(social.children) ||
      !Array.isArray(social.romances)) return false;
  const contacts = allContacts(life);
  const ids = new Set(contacts.map(({ id }) => id));
  if (ids.has('self') || ids.size !== contacts.length || Object.keys(social.profiles).length !== ids.size) return false;
  for (const id of ids) {
    if (!Object.hasOwn(social.profiles, id)) return false;
    const profile = social.profiles[id];
    if (!record(profile) || !record(profile.traits) || !traits.every((trait) => integer(profile.traits[trait], 0, 100)) ||
      !Array.isArray(profile.interests) || profile.interests.length !== 2 || !profile.interests.every((item) => typeof item === 'string') ||
      !Array.isArray(profile.preferences) || !profile.preferences.length || !profile.preferences.every((item) => genders.includes(item)) ||
      !npcEducation.includes(profile.education) || !employment.includes(profile.status) ||
      (profile.job !== null && !jobById.has(profile.job)) ||
      ![profile.income, profile.expenses, profile.savings, profile.commitments, profile.experience, profile.conflicts].every(amount) ||
      !integer(profile.born, 1800, year) || !date(profile.met) || !date(profile.lastInteraction) || profile.lastInteraction < profile.met ||
      (profile.friendsSince !== null && (!date(profile.friendsSince) || profile.friendsSince < profile.met)) ||
      typeof profile.formerFriend !== 'boolean' || !history(profile.memories, 12) ||
      (profile.localPartner !== null && (!ids.has(profile.localPartner) || profile.localPartner === id)) ||
      (profile.movedFrom !== undefined && !cities.includes(profile.movedFrom))) return false;
  }
  const exists = (id: string) => id === 'self' || ids.has(id);
  const born = (id: string) => id === 'self' ? character.birthYear : social.profiles[id]!.born;
  if (!Array.isArray(social.parents.self) || social.parents.self.length !== life.family.length ||
    !life.family.every(({ id }) => social.parents.self!.includes(id))) return false;
  for (const [child, parents] of Object.entries(social.parents)) {
    if (!exists(child) || !Array.isArray(parents) || parents.length === 0 || parents.length > 2 || new Set(parents).size !== parents.length ||
      !parents.every((parent) => typeof parent === 'string' && exists(parent) && born(child) - born(parent) >= 18)) return false;
  }
  for (const [id, child] of Object.entries(social.children)) {
    if (!social.people.some((person) => person.id === id && person.role === 'Child') ||
      !record(child) || !date(child.year) || child.year < born(id) || typeof child.adopted !== 'boolean' || typeof child.supportEnded !== 'boolean' ||
      ![child.wellbeing, child.learning, child.confidence].every((value) => integer(value, 0, 100)) ||
      !social.parents[id]?.includes('self') || social.parents[id]?.length !== 2) return false;
  }
  for (const person of social.people) {
    if (person.role === 'Child' && !Object.hasOwn(social.children, person.id)) return false;
    if (person.role === 'Sibling' && (social.parents[person.id]?.length !== social.parents.self.length ||
      !social.parents.self.every((id) => social.parents[person.id]!.includes(id)))) return false;
    if (person.role === 'Grandparent' && !social.parents.self.some((id) => social.parents[id]?.includes(person.id))) return false;
  }
  const relatives = new Set([...social.parents.self, ...social.parents.self.flatMap((id) => social.parents[id] ?? []),
    ...social.people.filter(({ role }) => role !== 'Acquaintance').map(({ id }) => id)]);
  const seen = new Set<string>();
  let commitments = 0;
  for (const entry of social.romances) {
    if (!record(entry) || !ids.has(entry.person) || relatives.has(entry.person) || seen.has(entry.person) || !romanceStatuses.includes(entry.status) ||
      !date(entry.started) || entry.started < character.birthYear + 18 || entry.started < born(entry.person) + 18 ||
      !history(entry.history, 30) ||
      ![entry.engagement, entry.wedding, entry.ended].every((value) => value === null || (date(value) && value >= entry.started)) ||
      (entry.wedding !== null && (entry.engagement === null || entry.wedding < entry.engagement)) ||
      (entry.status === 'married' && entry.wedding === null) || (entry.status === 'engaged' && entry.engagement === null) ||
      (['broken-up', 'divorced', 'widowed'].includes(entry.status) !== (entry.ended !== null))) return false;
    seen.add(entry.person);
    if ((entry.status === 'engaged' || entry.status === 'married') && ++commitments > 1) return false;
  }
  if (!socialEvents.some((event) => event === life.pending)) return social.pendingPerson === null;
  const participant = contacts.find(({ id, alive }) => id === social.pendingPerson && alive);
  if (!participant) return false;
  if (life.pending === 'social-affair') {
    const partners = social.romances.filter(isActiveRomance);
    return partners.some(({ person }) => person === participant.id) &&
      contacts.some(({ id, alive }) => alive && id !== participant.id && partners.some(({ person }) => person === id));
  }
  if (life.pending === 'social-dating-match' || life.pending === 'social-casual-match') {
    return character.age >= 18 && participant.age >= 18 && participant.id === `npc-dating-${year}` &&
      !seen.has(participant.id) && social.profiles[participant.id]!.preferences.includes(character.gender);
  }
  if (life.pending === 'social-proposal') {
    return commitments === 0 && social.romances.some(({ person, status }) => person === participant.id && status === 'dating');
  }
  return true;
}
