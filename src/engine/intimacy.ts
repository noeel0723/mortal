import { recordNotice } from './eventNotices.ts';
import { offerCasualFollowup } from './casualConnections.ts';
import { chanceOfPregnancy } from './familyLife.ts';
import { clamp, record } from './journal.ts';
import { isActiveRomance, romanceFor, romanceHistory } from './love.ts';
import { closeKin } from './kinship.ts';
import { consumeLoveSearch, hookupCandidateLimit, loveSearchIssue } from './loveSearch.ts';
import { allContacts, ensureNpc, isFamily, makeNpc, newPeopleLimit, npcProfile, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import { boundaryEvidence, communicationEnded, inPersonIssue, meaningfulTime, relationshipMemory } from './relationships.ts';
import { assessEncounterHealth, barrierFee, hasKnownInfection } from './reproductiveHealth.ts';
import type { IntimacyAction } from './socialTypes.ts';
import { pickStory } from './stories.ts';
import type { Contact, Life } from './types.ts';

export const intimacyEvents = ['social-make-love', 'social-hookup', 'social-threesome'] as const;
export type IntimacyEvent = typeof intimacyEvents[number];
export const isIntimacyEvent = (id: string | null): id is IntimacyEvent => intimacyEvents.some((event) => event === id);
const isPartner = (life: Life, person: Contact) => isActiveRomance(romanceFor(life, person.id));

export function isIntimacyContact(life: Life, person: Contact) {
  if (life.character.age < 18 || person.age < 18 || !person.alive || communicationEnded(life, person.id)) return false;
  if (isPartner(life, person)) return true;
  const sharesParent = life.social.parents.self?.some((parent) => life.social.parents[person.id]?.includes(parent));
  return !sharesParent && !isFamily(life, person.id) && 'friend' in person && person.friend && !npcProfile(life, person).formerFriend;
}

function contactIssue(life: Life, person: Contact | undefined) {
  if (!person || !isIntimacyContact(life, person)) return 'Choose a current partner or adult friend.';
  const travel = inPersonIssue(life, person);
  if (travel) return travel;
  return null;
}

export function canShareInvitation(life: Life, first: Contact, second: Contact) {
  return first.id !== second.id && first.city === second.city && !closeKin(life, first.id, second.id);
}

export function intimacyGuests(life: Life, first?: Contact) {
  const contacts = allContacts(life).filter((person) => !contactIssue(life, person));
  return contacts.filter((person) => first ? canShareInvitation(life, first, person) :
    contacts.some((other) => canShareInvitation(life, person, other)));
}

export function intimacyIssue(life: Life, action: IntimacyAction | { encounter: 'threesome' }): string | null {
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (life.character.age < 18) return 'Available from age 18.';
  if (action.encounter === 'hookup') {
    const limit = loveSearchIssue(life, 'hookup');
    if (limit) return limit;
    return life.social.people.filter(({ role }) => role === 'Acquaintance').length >= newPeopleLimit - 8 ? 'Your social circle is full.' : null;
  }
  if (action.encounter === 'make-love') return contactIssue(life, findContact(life, action.person));
  if (!('first' in action)) return intimacyGuests(life).length < 2 ? 'You need two eligible adults in your city.' : null;
  const first = findContact(life, action.first);
  const second = findContact(life, action.second);
  return contactIssue(life, first) ?? contactIssue(life, second) ??
    (first && second && canShareInvitation(life, first, second) ? null : 'Choose two different, unrelated people.');
}

export function prepareIntimacy(life: Life, action: IntimacyAction) {
  const issue = intimacyIssue(life, action);
  if (issue) return issue;
  if (action.encounter === 'make-love') return { event: 'social-make-love', person: action.person } as const;
  if (action.encounter === 'threesome') return { event: 'social-threesome', person: action.first, guest: action.second } as const;
  const attempt = consumeLoveSearch(life, 'hookup');
  const random = npcRandom(life, `hookup-introduction:${attempt}`, life.year);
  const prefix = `npc-hookup-${life.year}-${attempt}`;
  for (let index = 1; index <= hookupCandidateLimit; index++) {
    const person = makeNpc(life, index === 1 ? prefix : `${prefix}-guest-${index}`,
      Math.min(114, Math.max(18, life.character.age + random.integer(-5, 5))), 'Acquaintance');
    if (!agrees(life, person, undefined)) continue;
    life.social.people.push(person);
    relationshipMemory(life, person.id, 'meeting', 2);
    ensureNpc(life, person);
    return { event: 'social-hookup', person: person.id } as const;
  }
  recordNotice(life, 'community', 'No Suitable Profiles', 'I didn’t meet anyone who wanted the same kind of evening.');
  return null;
}

function agrees(life: Life, person: Contact, other: Contact | undefined) {
  const profile = npcProfile(life, person);
  if (!profile.preferences.includes(life.character.gender) || profile.localPartner || person.bond.resentment >= 65) return false;
  if (other && !profile.preferences.includes(other.gender)) return false;
  const { trust, affection, compatibility, resentment } = person.bond;
  const chance = Math.max(7, Math.min(96, 13 + (isPartner(life, person) ? 28 : 0) + trust * .35 + affection * .2 +
    compatibility * .12 + profile.traits.riskTolerance * .12 - resentment * .4 - (other ? 14 : 0)));
  return npcRandom(life, `intimacy:${person.id}:${other?.id ?? 'private'}`, life.year).next() * 100 < chance;
}

function privateStories(life: Life, person: Contact, event: IntimacyEvent, guest?: Contact) {
  const { name } = person;
  if (guest) return [
    `The three of us spent the night together after a long talk about what felt right. In the morning, ${name} made coffee while ${guest.name} declared our toast a lost cause.`,
    `My evening with ${name} and ${guest.name} started with a quiet dinner and ended with the three of us spending the night together. We checked in with each other over breakfast.`,
    `${name}, ${guest.name}, and I spent the night together. We talked the next morning about what the evening meant to each of us, then went for a walk before heading home.`,
  ];
  if (event === 'social-hookup') return [
    `I met ${name} after a late show. We spent one night together and said a warm goodbye the next morning.`,
    `A conversation with ${name} lasted until closing time. We spent the night together, then parted over coffee with the same understanding we had at the start.`,
    `I clicked with ${name} a little faster than I expected. We spent the night together and laughed about how neither of us had ordered dessert by the time the kitchen closed.`,
  ];
  if (isPartner(life, person)) return [
    `${name} and I put on the playlist from our first dates and spent the night together. In the morning, they teased me for remembering the song order.`,
    `The rain canceled my plans with ${name}, so we stayed in and made love. We made breakfast in our pajamas the next morning.`,
    `${name} and I both needed an evening away from our routines. We spent the night together and lingered over breakfast the next morning.`,
  ];
  return [
    `I talked openly with ${name} about what we both wanted. We spent the night together and caught our usual coffee the next morning.`,
    `I asked ${name} how they felt about crossing that line as friends. We both wanted to spend the night together and checked in about how it felt in the morning.`,
    `A long evening with ${name} turned into a night together. We agreed to check in with each other the next day, then got sidetracked by a disagreement about pancakes.`,
  ];
}

function enjoyment(life: Life, event: IntimacyEvent, participants: readonly Contact[]) {
  const ids = participants.map(({ id }) => id).sort().join(':');
  const variance = (id: string) => npcRandom(life, `enjoyment:${event}:${ids}:${id}:${life.journal.length}`, life.year).integer(-14, 14);
  const shared = participants.reduce((total, { bond }) => total + bond.compatibility * .24 + bond.trust * .14, 0) / participants.length;
  const { happiness, stress } = life.character.attributes;
  return [
    { person: 'self', value: clamp(Math.round(38 + shared + happiness * .19 - stress * .20 + variance('self'))) },
    ...participants.map((person) => {
      const { compatibility, affection, trust, resentment } = person.bond;
      const openness = npcProfile(life, person).traits.riskTolerance;
      return { person: person.id, value: clamp(Math.round(31 + compatibility * .22 + affection * .12 + trust * .16 +
        person.health * .11 + openness * (event === 'social-hookup' ? .13 : .06) - resentment * .21 + variance(person.id))) };
    }),
  ];
}

export function answerIntimacy(life: Life, event: IntimacyEvent, person: Contact, guest: Contact | undefined,
  protection: 'barrier' | 'no-barrier' | 'pass') {
  if (event === 'social-threesome' && !guest?.alive) return false;
  const participants = guest ? [person, guest] : [person];
  if (protection === 'pass') {
    const names = participants.map(({ name }) => name).join(' and ');
    record(life, 'decision', event === 'social-hookup' ? `I thanked ${names} for the invitation and went home.` :
      `I kept my plans with ${names} as they were and decided to leave the invitation for another time.`);
    return false;
  }
  const declined = event === 'social-hookup' ? [] : participants.filter((contact) => !agrees(life, contact, contact === person ? guest : person));
  if (declined.length) {
    const names = declined.map(({ name }) => name).join(' and ');
    const story = pickStory(life, `intimacy-declined:${names}`, [
      `${names} said they would rather keep things as they were. I respected their answer and we changed the subject.`,
      `${names} said the timing did not feel right. I thanked them for being honest and left it there.`,
    ]);
    for (const contact of participants) remember(life, contact, story);
    recordNotice(life, 'community', 'Invitation Declined', story);
    return false;
  }
  const refuses = participants.filter((contact) => {
    const profile = npcProfile(life, contact);
    const roll = npcRandom(life, `protection-consent:${contact.id}:${protection}:${event}`, life.year).next();
    if (protection === 'barrier') return roll < .02;
    if (hasKnownInfection(life, contact.id)) return true;
    const willing = .54 + profile.traits.riskTolerance / 270 + contact.bond.trust / 460 - (guest ? .08 : 0);
    return roll >= Math.min(.97, willing);
  });
  if (refuses.length) {
    const names = refuses.map(({ name }) => name).join(' and ');
    recordNotice(life, 'community', 'Protection Choice Declined',
      `${names} didn’t agree to the protection choice. We stopped there, and nobody was charged.`);
    return false;
  }
  const barrier = protection === 'barrier';
  const agreement = barrier ? 'We agreed to use barrier protection.' : 'We agreed to continue without barrier protection.';
  const stories = privateStories(life, person, event, guest).map((story) => `${story} ${agreement}`);
  const story = pickStory(life, `intimacy:${event}:${person.id}`, stories);
  const scores = enjoyment(life, event, participants);
  for (const contact of participants) {
    const key = `intimacy-accepted:${contact.id}`;
    const score = scores.find(({ person: id }) => id === contact.id)!.value;
    const benefit = score >= 45 && life.usedActions.filter((item) => item === key).length < 3;
    if (benefit) {
      life.usedActions.push(key);
      contact.bond.affection = clamp(contact.bond.affection + 3);
      contact.bond.trust = clamp(contact.bond.trust + (event === 'social-hookup' ? 1 : 2));
      meaningfulTime(life, contact, 'time', 3);
    }
    remember(life, contact, story);
    if (isPartner(life, contact)) romanceHistory(life, contact.id, story);
  }
  boundaryEvidence(life, participants.map(({ id }) => id), 'intimacy');
  const titles = { 'social-hookup': 'A Night Together', 'social-make-love': 'A Private Evening', 'social-threesome': 'Just the Three of Us' };
  const enjoyed = scores[0]!.value >= 45 && life.usedActions.filter((item) => item === 'intimacy-player-benefit').length < 3;
  if (enjoyed) life.usedActions.push('intimacy-player-benefit');
  const notice = recordNotice(life, 'community', titles[event], story,
    { ...(enjoyed ? { happiness: 3, stress: -2 } : {}), bank: barrier ? -barrierFee(life) : 0 }, 'medical');
  notice.details = { kind: 'enjoyment', scores };
  const entry = life.journal.length;
  assessEncounterHealth(life, participants, barrier, entry);
  for (const contact of [...participants].sort((a, b) => a.id.localeCompare(b.id))) {
    chanceOfPregnancy(life, contact, entry, barrier);
    if (!isPartner(life, contact)) offerCasualFollowup(life, contact, scores.find(({ person: id }) => id === contact.id)!.value);
  }
  return true;
}
