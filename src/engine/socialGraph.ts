import { recordNotice } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { allContacts, isFamily, npcProfile, npcRandom, remember } from './npcs.ts';
import { contactIssue } from './interactions.ts';
import { relationshipMemory, takingSpace } from './relationships.ts';
import { findContact, isCurrentClassContact } from './school.ts';
import { availability } from './socialContext.ts';
import type { SocialEdge } from './localSocialTypes.ts';
import type { Contact, Life } from './types.ts';

export const socialGraphLimit = 72;
const canonical = (first: string, second: string): [string, string] => first < second ? [first, second] : [second, first];

export function connectSocialPair(life: Life, a: Contact, b: Contact, setting: string) {
  if (!a.alive || !b.alive || a.id === b.id || a.city !== b.city) return;
  const [first, second] = canonical(a.id, b.id);
  const edges = life.social.graph ??= [];
  const profile = npcProfile(life, a);
  const other = npcProfile(life, b);
  let edge = edges.find(({ people }) => people[0] === first && people[1] === second);
  const random = npcRandom(life, `social-edge:${first}:${second}`, life.year);
  if (!edge) {
    if (edges.length >= socialGraphLimit || [first, second].some((id) => edges.filter(({ people }) => people.includes(id)).length >= 4)) return;
    const common = profile.interests.filter((interest) => other.interests.includes(interest)).length;
    edge = { people: [first, second], type: 'acquaintance', affection: 40, trust: 36, familiarity: 14, resentment: 0,
      compatibility: clamp(58 + common * 13 - Math.round(Math.abs(profile.traits.temperament - other.traits.temperament) / 3) +
        random.integer(-12, 12)), met: life.year, last: life.year,
      memories: [{ year: life.year, text: `${a.name} and ${b.name} met ${setting}.` }] };
    edges.push(edge);
    return;
  }
  if (edge.last >= life.year) return;
  edge.last = life.year;
  edge.familiarity = clamp(edge.familiarity + 8);
  const warmth = edge.compatibility * .55 + (profile.traits.empathy + other.traits.empathy) * .19 -
    edge.resentment * .25 + random.integer(-29, 29);
  let memory: string | undefined;
  if (edge.type === 'rival' && warmth >= 48 && profile.traits.empathy + other.traits.empathy >= 90) {
    edge.resentment = clamp(edge.resentment - 28);
    edge.trust = clamp(edge.trust + 10);
    if (edge.resentment < 38) {
      edge.type = 'acquaintance';
      memory = `${a.name} and ${b.name} talked through their disagreement and reconciled.`;
    }
  } else if (warmth < 31) {
    edge.resentment = clamp(edge.resentment + 21);
    edge.trust = clamp(edge.trust - 12);
    edge.affection = clamp(edge.affection - 7);
    if (edge.resentment >= 48) edge.type = 'rival';
    memory = `${a.name} and ${b.name} disagreed ${setting}.`;
  } else if (warmth >= 44 && edge.type !== 'rival') {
    edge.trust = clamp(edge.trust + 8);
    edge.affection = clamp(edge.affection + 8);
    edge.resentment = clamp(edge.resentment - 5);
    const next = edge.familiarity >= 55 && edge.trust >= 62 && edge.affection >= 66 ? 'close' :
      edge.familiarity >= 29 && edge.trust >= 46 ? 'friend' : edge.type;
    if (next !== edge.type) {
      edge.type = next;
      memory = next === 'close' ? `${a.name} and ${b.name} had become close friends.` : `${a.name} and ${b.name} became friends.`;
    }
  }
  if (memory) edge.memories = [...edge.memories.slice(-4), { year: life.year, text: memory }];
}

export function groupSocialLinks(life: Life, contacts: readonly Contact[], setting: string) {
  const participants = contacts.slice(0, 4);
  for (let i = 1; i < participants.length; i++) connectSocialPair(life, participants[i - 1]!, participants[i]!, setting);
}

export function advanceSocialGraph(life: Life) {
  if (life.character.age < 6) return;
  const residents = allContacts(life).filter((person) => person.alive && person.city === life.character.city);
  const domains = [
    { label: 'through family', people: residents.filter((person) => isFamily(life, person.id)) },
    { label: 'at school', people: residents.filter((person) => 'stage' in person && isCurrentClassContact(life, person)) },
    { label: 'at work', people: residents.filter((person) => 'employerId' in person && person.employerId === life.career.current?.employerId) },
    { label: 'around the neighborhood', people: residents.filter(({ id }) => id.startsWith('npc-venue-neighborhood-') &&
      !life.social.profiles[id]?.movedFrom) },
  ];
  for (const { label, people } of domains) {
    const direct = people.slice(0, 8);
    if (direct.length < 2) continue;
    const random = npcRandom(life, `social-circles:${label}`, life.year);
    const first = random.integer(0, direct.length - 1);
    const second = (first + random.integer(1, direct.length - 1)) % direct.length;
    connectSocialPair(life, direct[first]!, direct[second]!, label);
  }
  const residentsById = new Map(residents.map((person) => [person.id, person]));
  const active = (life.social.graph ?? []).filter(({ people, last }) => last < life.year && people.every((id) => residentsById.has(id)));
  active.sort((a, b) => a.last - b.last);
  for (const edge of active.slice(0, 4)) {
    connectSocialPair(life, residentsById.get(edge.people[0])!, residentsById.get(edge.people[1])!, 'while catching up');
  }
}

export function possibleIntroduction(life: Life, through: Contact) {
  if (!('friend' in through) || !through.friend || npcProfile(life, through).formerFriend || contactIssue(life, through) ||
    takingSpace(life, through.id)) return undefined;
  return (life.social.graph ?? []).filter(({ people, type }) => people.includes(through.id) && (type === 'friend' || type === 'close'))
    .map(({ people }) => findContact(life, people.find((id) => id !== through.id)))
    .find((person) => person?.alive && person.city === life.character.city && !contactIssue(life, person) &&
      'friend' in person && !person.friend && person.bond.familiarity < 36);
}

export function socialCircle(life: Life, person: Contact) {
  const connections: string[] = [];
  const roles: Record<SocialEdge['type'], string> = { acquaintance: 'acquaintance', friend: 'friend', close: 'close friend', rival: 'rival' };
  for (const { people, type } of life.social.graph ?? []) {
    if (!people.includes(person.id)) continue;
    const other = findContact(life, people.find((id) => id !== person.id));
    if (other) connections.push(`${other.name} · ${roles[type]}`);
  }
  return connections.length ? [{ label: 'Social Circle', value: connections.join(', ') }] : [];
}

export function introductionIssue(life: Life, through: Contact) {
  if (life.pending || life.character.causeOfDeath) return 'Resolve the current life event first.';
  return possibleIntroduction(life, through) ? null : 'They have nobody new to introduce right now.';
}

export function introduceThroughFriend(life: Life, id: string) {
  const through = findContact(life, id);
  if (!through) return 'This person is unavailable.';
  const issue = introductionIssue(life, through);
  if (issue) return issue;
  const person = possibleIntroduction(life, through)!;
  const unavailable = availability(life, person, { key: 'friend-introduction', location: 'local', demanding: true });
  const story = unavailable ? `${through.name} offered to introduce me to ${person.name}. ${unavailable.reason}` :
    `${through.name} introduced me to their friend ${person.name}. The three of us stayed to talk for a while.`;
  if (!unavailable) {
    person.bond.familiarity = clamp(person.bond.familiarity + 9);
    relationshipMemory(life, person.id, 'meeting', 3);
    remember(life, person, story);
  }
  recordNotice(life, 'community', unavailable ? 'Maybe Another Time' : 'An Introduction', story);
  return null;
}
