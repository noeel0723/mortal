import { books, clubs } from '../data/localSocial.ts';
import type { ClubId } from '../data/localSocial.ts';
import { jobById } from '../data/jobs.ts';
import { npcGivenNames, npcSurnames } from '../data/npcNames.ts';
import { skills } from '../data/skills.ts';
import type { SkillId } from '../data/skills.ts';
import { cities, genders } from '../data/veyra.ts';
import { recordNotice } from './eventNotices.ts';
import { friendshipExperience } from './friendships.ts';
import { skillsForInterest } from './hobbies.ts';
import { clamp } from './journal.ts';
import { visitLibrary } from './library.ts';
import { clubActivities, libraryActivities, neighborActivities } from './localSocialTypes.ts';
import type { ClubMembership, LocalSocialAction } from './localSocialTypes.ts';
import { allContacts, communicationCapacity, ensureNpc, initialNpcProfile, isFamily, makeNpc, npcRandom, remember } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { activeFor, communicationEnded, meaningfulTime, openConcern, relationshipMemory, trackConnection } from './relationships.ts';
import { findContact } from './school.ts';
import { incidentalPractice } from './skills.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import type { SocialOccasion } from './socialContext.ts';
import { groupSocialLinks } from './socialGraph.ts';
import type { NpcProfile, SocialPerson } from './socialTypes.ts';
import type { Contact, Life } from './types.ts';

export const readingHistoryLimit = 40;
export const neighborhoodLimit = 48;
export const neighborhoodSize = 6;
const memberCount = 3;
const historyLimit = 12;

const localState = (life: Life) => life.social.local ??= { neighborhoods: {}, memberships: {}, reading: [] };
export const membershipKey = (city: Life['character']['city'], club: ClubId) => `${city}|${club}`;
export const membership = (life: Life, club: ClubId) => life.social.local?.memberships[membershipKey(life.character.city, club)];
export const membershipFee = (life: Life, club: ClubId) => localExpense(life.world, life.character.city, clubs[club].fee);
export const membershipRank = (member: ClubMembership) => member.standing >= 70 ? 'Respected Member' :
  member.standing >= 35 ? 'Active Member' : 'Member';

function address(life: Life) {
  const city = life.character.city.toLowerCase().replaceAll(' ', '-');
  let hash = 2166136261;
  for (const character of life.property.residence) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `${city}-${(hash >>> 0).toString(36)}`;
}

type Visitor = { person: Contact; profile: NpcProfile; known: boolean };
const jobs = ['retail-assistant', 'cashier', 'barista', 'office-assistant', 'records-clerk'] as const;
const neighborJobs = ['barista', 'cashier', 'office-assistant', 'restaurant-crew', 'records-clerk', 'accounts-assistant'] as const;

function preview(life: Life, id: string, slot: number, origin: number, interest?: SkillId, neighborhoodJob?: string): Visitor {
  const known = findContact(life, id);
  if (known) return { person: known, profile: ensurePreviewProfile(life, known), known: true };
  const random = npcRandom(life, `venue-person:${id}`);
  const age = Math.max(8, [9, 14, 21, 30, 43, 60][slot % 6]! + random.integer(-1, 5) + life.year - origin);
  const gender = random.pick(genders);
  const lastName = npcSurnames[random.integer(0, npcSurnames.length - 1)]!;
  const name = `${random.pick(npcGivenNames[gender])} ${lastName}`;
  const person = { ...makeNpc(life, id, Math.min(114, age), 'Acquaintance', name), gender, lastName };
  if (age >= 115) person.alive = false;
  const profile = initialNpcProfile(life, person);
  if (person.age >= 65) {
    profile.status = 'retired';
    profile.income = 12000;
    person.occupation = 'Retired';
  } else if (person.age >= 18 && random.next() < .78) {
    const job = jobById.get(neighborhoodJob ?? random.pick(jobs))!;
    profile.status = 'employed';
    profile.job = job.id;
    profile.income = job.salary[0];
    profile.experience = Math.max(0, age - 18);
    person.occupation = job.title;
  }
  profile.localHousehold = person.age < 18 ? 'family' : random.pick(['alone', 'shared', 'family']);
  profile.commitments = profile.localHousehold === 'family' && person.age >= 18 ? 3500 : 0;
  if (interest) profile.interests = [interest, ...profile.interests.filter((item) => item !== interest).slice(0, 1)];
  return { person, profile, known: false };
}

const ensurePreviewProfile = (life: Life, person: Contact) => life.social.profiles[person.id] ?? initialNpcProfile(life, person);

function neighborhoodOrigin(life: Life, site: string, slot: number) {
  const saved = life.social.local?.neighborhoods[site]?.rotations[slot];
  const foundation = life.character.birthYear + 8;
  const interval = 45;
  return saved ?? foundation + Math.max(0, Math.floor((life.year - foundation) / interval)) * interval;
}

function neighborhoodVisitor(life: Life, site: string, slot: number) {
  const origin = neighborhoodOrigin(life, site, slot);
  const jobOffset = npcRandom(life, `neighborhood-jobs:${site}`).integer(0, neighborJobs.length - 1);
  const job = neighborJobs[(slot + jobOffset) % neighborJobs.length]!;
  return preview(life, `npc-venue-neighborhood-${site}-${slot}-${origin}`, slot, origin, undefined, job);
}

export function neighbors(life: Life) {
  const site = address(life);
  return Array.from({ length: neighborhoodSize }, (_, slot) => neighborhoodVisitor(life, site, slot))
    .filter(({ person }) => person.alive && person.city === life.character.city);
}

function clubMemberId(life: Life, club: ClubId, slot: number, origin: number) {
  const city = life.character.city.toLowerCase().replaceAll(' ', '-');
  return `npc-venue-club-${city}-${club}-${slot}-${origin}`;
}

function clubVisitors(life: Life, club: ClubId, savedIds?: string[]) {
  const base = life.character.birthYear + 8;
  const origin = base + Math.max(0, Math.floor((life.year - base) / 62)) * 62;
  const skill = clubs[club].skill;
  const familiar = allContacts(life).find((person) => person.alive && person.city === life.character.city && person.age >= 8 &&
    !isFamily(life, person.id) && !communicationEnded(life, person.id) &&
    ensurePreviewProfile(life, person).interests.some((interest) => skillsForInterest(interest).includes(skill)));
  return Array.from({ length: memberCount }, (_, slot) => {
    const id = savedIds?.[slot] ?? (slot === 0 && familiar ? familiar.id : clubMemberId(life, club, slot, origin));
    // Persisted generated members carry their cohort in their ID, even if the club is visited decades later.
    const cohort = id.startsWith('npc-venue-club-') ? Number(id.split('-').at(-1)) : origin;
    return preview(life, id, slot + 2, cohort, skill);
  });
}

export function clubMembers(life: Life, club: ClubId) {
  return clubVisitors(life, club, membership(life, club)?.members)
    .filter(({ person }) => person.alive && person.city === life.character.city);
}

function libraryReaders(life: Life) {
  const city = life.character.city.toLowerCase().replaceAll(' ', '-');
  const base = life.character.birthYear + 5;
  const origin = base + Math.max(0, Math.floor((life.year - base) / 65)) * 65;
  return Array.from({ length: 3 }, (_, slot) =>
    preview(life, `npc-venue-reading-${city}-${slot}-${origin}`, slot + 1, origin, 'writing'))
    .filter(({ person }) => person.alive && person.city === life.character.city);
}

function register(life: Life, visitor: Visitor) {
  if (visitor.known) return visitor.person;
  if (!communicationCapacity(life)) return undefined;
  const person = visitor.person as SocialPerson;
  life.social.people.push(person);
  life.social.profiles[person.id] = visitor.profile;
  relationshipMemory(life, person.id, 'meeting', 2);
  return person;
}

const neighborhoodTexts = {
  introduce: (name: string, known = false) => known ? `I stopped to say hello to ${name} outside our homes.` : `I introduced myself to ${name} outside our homes.`,
  visit: (name: string) => `I stopped by ${name}’s place and we caught up.`,
  invite: (name: string) => `I invited ${name} over for an afternoon at my place.`,
  help: (name: string) => `I offered to help ${name} carry supplies and finish a few errands.`,
  gathering: (name: string) => `${name} and I talked at a neighborhood gathering around a shared table.`,
};

function individual(life: Life, visitor: Visitor, occasion: SocialOccasion, scene: string) {
  if (communicationEnded(life, visitor.person.id)) return { text: `${visitor.person.name} wanted to keep their distance.`, weight: 0 };
  const unavailable = availability(life, visitor.person, occasion);
  if (unavailable) return { text: `I reached out to ${visitor.person.name}. ${unavailable.reason} ${unavailable.alternative ?? ''}`.trim(), weight: 0 };
  const person = register(life, visitor);
  if (!person) return { text: 'I joined the activity without adding new contacts to my social circle.', weight: 0 };
  const outcome = contextualOutcome(life, person, occasion);
  trackConnection(life, person.id);
  const text = `${scene} ${outcome.note}`;
  person.bond.affection = clamp(person.bond.affection + Math.round(outcome.weight * 5));
  person.bond.trust = clamp(person.bond.trust + Math.round(outcome.weight * 3));
  person.bond.familiarity = clamp(person.bond.familiarity + 3);
  if (outcome.weight < 0) person.bond.resentment = clamp(person.bond.resentment - Math.round(outcome.weight * 5));
  if (outcome.weight <= -.60) openConcern(life, person.id, 'argument', 34);
  if (outcome.weight >= .6) meaningfulTime(life, person, 'time', 3);
  remember(life, person, text, outcome.weight <= -.60);
  friendshipExperience(life, person, outcome.weight);
  return { person, text, weight: outcome.weight, title: outcome.title };
}

function gathering(life: Life, people: Visitor[], occasion: SocialOccasion, setting: string, scene: (name: string) => string) {
  const attendees: Contact[] = [];
  const stories: string[] = [];
  let total = 0;
  for (const visitor of people.slice(0, 4)) {
    const result = individual(life, visitor, { ...occasion, group: attendees.map(({ id }) => id) }, scene(visitor.person.name));
    stories.push(result.text);
    if (result.person) attendees.push(result.person);
    total += result.weight;
  }
  groupSocialLinks(life, attendees, setting);
  return { story: stories.join(' ') || 'I stopped by, but nobody else was available.', total, count: attendees.length };
}

const activityKey = (action: LocalSocialAction) => action.type === 'neighborhood' ? `neighbor:${action.activity}:${action.person ?? 'group'}` :
  action.type === 'community' ? `club:${action.club}:${action.activity}:${action.person ?? 'group'}` :
    `library:${action.activity}:${action.book ?? ''}`;

export function localSocialIssue(life: Life, action: LocalSocialAction) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  const age = action.type === 'library-visit' ? 5 : 8;
  if (life.character.age < age) return `Available from age ${age}.`;
  if (action.type === 'neighborhood') {
    if (!neighborActivities.includes(action.activity)) return 'Choose a neighborhood activity.';
    if (action.activity !== 'gathering') {
      const target = neighbors(life).find(({ person }) => person.id === action.person);
      if (!target || communicationEnded(life, target.person.id)) return 'This neighbor is no longer available.';
      if (action.activity !== 'introduce' && !target.known) return 'Introduce yourself first.';
      if (action.activity === 'introduce' && !target.known && !communicationCapacity(life)) return 'Your social circle is full.';
    }
  } else if (action.type === 'community') {
    if (!Object.hasOwn(clubs, action.club) || !clubActivities.includes(action.activity)) return 'Choose a local community.';
    const member = membership(life, action.club);
    if (action.activity === 'join') {
      if (member?.active) return 'You’re already a member.';
      if (life.character.bank < membershipFee(life, action.club)) return 'Your balance does not cover the joining fee.';
      return null;
    }
    if (!member?.active) return 'Join this community first.';
    if (action.activity === 'leave') return null;
    if (action.activity === 'meet' && !clubMembers(life, action.club).some(({ person }) =>
      person.id === action.person && !communicationEnded(life, person.id))) return 'This member is unavailable.';
    if (action.activity === 'project' && !hasAttended(member)) return 'Attend a session before joining a project.';
  } else {
    if (!libraryActivities.includes(action.activity)) return 'Choose a library activity.';
    if (action.activity === 'read' && (!action.book || !Object.hasOwn(books, action.book))) return 'Choose an available book.';
    return null;
  }
  return null;
}

const hasAttended = (member: ClubMembership) => member.attended || member.history.some(({ text }) =>
  text.startsWith('I attended a session') || text.startsWith('I joined a project'));

export function performLocalSocial(life: Life, action: LocalSocialAction) {
  const issue = localSocialIssue(life, action);
  if (issue) return issue;
  const key = activityKey(action);
  if (action.type === 'library-visit') {
    performLibraryVisit(life, action, key);
    return null;
  }
  if (action.type === 'neighborhood') {
    const site = address(life);
    const streets = localState(life).neighborhoods;
    if (!streets[site] && Object.keys(streets).length < neighborhoodLimit) {
      const rotations = Object.fromEntries(Array.from({ length: neighborhoodSize }, (_, slot) => [slot, neighborhoodOrigin(life, site, slot)]));
      streets[site] = { rotations };
    }
    const people = neighbors(life);
    const occasion: SocialOccasion = { key, location: 'local', demanding: action.activity === 'gathering' || action.activity === 'visit' || action.activity === 'invite' };
    if (action.activity === 'gathering') {
      const visit = gathering(life, people, occasion, 'at our neighborhood gathering', neighborhoodTexts.gathering);
      recordNotice(life, 'community', 'Neighborhood Gathering', visit.story, { happiness: Math.round(visit.total) });
    } else {
      const visitor = people.find(({ person }) => person.id === action.person)!;
      const result = individual(life, visitor, occasion, neighborhoodTexts[action.activity](visitor.person.name, visitor.known));
      recordNotice(life, 'community', result.title ?? 'Maybe Another Time', result.text);
    }
    return null;
  }
  const { club, activity } = action;
  const venue = clubs[club];
  const memberships = localState(life).memberships;
  const id = membershipKey(life.character.city, club);
  if (activity === 'join') {
    const previous = memberships[id];
    const joined = previous ?? { club, city: life.character.city, joined: life.year, active: true, standing: 0,
      members: clubVisitors(life, club).map(({ person }) => person.id), history: [] };
    memberships[id] = { ...joined, active: true };
    const text = `I joined the ${venue.name} in ${life.character.city}.`;
    clubHistory(life, memberships[id]!, text);
    recordNotice(life, 'community', 'A New Membership', text, { bank: -membershipFee(life, club) }, 'personal');
    return null;
  }
  const member = memberships[id]!;
  if (activity === 'leave') {
    member.active = false;
    const story = `I left the ${venue.name}. I kept the contacts and memories from my time there.`;
    clubHistory(life, member, story);
    recordNotice(life, 'community', 'Membership Ended', story);
    return null;
  }
  if (activity === 'attend' || hasAttended(member)) member.attended = true;
  const people = clubMembers(life, club);
  const selected = activity === 'meet' ? people.filter(({ person }) => person.id === action.person) : people;
  const label = activity === 'project' ? venue.project : activity === 'attend' ? venue.session : 'got to know each other between sessions';
  const visit = gathering(life, selected, { key, location: 'local', demanding: activity !== 'meet', cost: activity === 'project' ? 250 : 0 },
    `at the ${venue.name}`, (name) => `${name} and I ${label}.`);
  const story = `${activity === 'attend' ? 'I attended a session' : activity === 'project' ? 'I joined a project' : 'I met a member'} at the ${venue.name}. ${visit.story}`;
  clubHistory(life, member, story);
  if (activity !== 'meet' && visit.count) {
    member.standing = clamp(member.standing + Math.round(visit.total * (activity === 'project' ? 7 : 5)));
    if (visit.total > .8 && npcRandom(life, `club-benefit:${key}`, life.year).next() < .64 &&
      life.character.age >= skills[venue.skill].age) incidentalPractice(life, venue.skill, 1, 46);
  }
  recordNotice(life, 'community', activity === 'project' ? 'Community Project' : activity === 'meet' ? 'A Club Conversation' : 'Club Session', story);
  return null;
}

function clubHistory(life: Life, member: ClubMembership, text: string) {
  member.history = [...member.history.slice(-(historyLimit - 1)), { year: life.year, text }];
}

export function advanceNeighborhood(life: Life) {
  const site = address(life);
  const street = life.social.local?.neighborhoods[site];
  if (!street || life.character.causeOfDeath) return;
  const emptySlots = Array.from({ length: neighborhoodSize }, (_, slot) => slot).filter((slot) => {
    const { person } = neighborhoodVisitor(life, site, slot);
    return !person.alive || person.city !== life.character.city;
  });
  if (emptySlots.length) {
    for (const slot of emptySlots) street.rotations[slot] = life.year;
    const name = neighborhoodVisitor(life, site, emptySlots[0]!).person.name;
    recordNotice(life, 'community', 'A New Resident', `I heard that ${name} had moved into a vacant home nearby.`);
    return;
  }
  const random = npcRandom(life, `neighborhood-year:${site}`, life.year);
  const roll = random.next();
  const slot = random.integer(0, neighborhoodSize - 1);
  const resident = neighborhoodVisitor(life, site, slot);
  const person = resident.person;
  if (roll < .14 && person.age >= 18 && !isFamily(life, person.id) && !activeFor(life, person.id)) {
    if (resident.known && person.alive && person.city === life.character.city) {
      const from = person.city;
      person.city = random.pick(cities.filter((city) => city !== from) as [typeof from, ...typeof from[]]);
      ensureNpc(life, person).movedFrom = from;
    }
    street.rotations[slot] = life.year;
    const arrival = neighborhoodVisitor(life, site, slot).person;
    recordNotice(life, 'community', resident.known ? 'A Neighbor Moved' : 'A New Resident',
      resident.known ? `${person.name} moved away. ${arrival.name} has moved into the neighborhood.` :
        `I heard that ${arrival.name} had moved into the neighborhood.`);
  } else if (roll < .25 && resident.known && person.alive && person.city === life.character.city) {
    const dispute = person.bond.resentment >= 30 || roll < .18;
    const text = dispute ? `${person.name} and I disagreed about how the shared space should be used.` :
      `${person.name} waved me over after a walk and we caught up about what had changed on the street.`;
    if (dispute) openConcern(life, person.id, 'argument', 33);
    else person.bond.familiarity = clamp(person.bond.familiarity + 2);
    remember(life, person, text, dispute);
    recordNotice(life, 'community', dispute ? 'A Neighborhood Dispute' : 'A Familiar Face', text);
  }
}

export function advanceClubMemberships(life: Life) {
  let notified = false;
  for (const member of Object.values(life.social.local?.memberships ?? {})) {
    if (!member.active || member.city !== life.character.city) continue;
    const visitors = clubVisitors(life, member.club, member.members);
    const slot = visitors.findIndex(({ person }) => !person.alive || person.city !== member.city);
    if (slot === -1) continue;
    const newId = clubMemberId(life, member.club, slot, life.year);
    member.members[slot] = newId;
    const newcomer = preview(life, newId, slot + 2, life.year, clubs[member.club].skill).person;
    const text = `${visitors[slot]!.person.name} is no longer attending the ${clubs[member.club].name}. ${newcomer.name} has joined the group.`;
    clubHistory(life, member, text);
    if (!notified) {
      recordNotice(life, 'community', 'A New Club Member', text);
      notified = true;
    }
  }
}

function performLibraryVisit(life: Life, action: Extract<LocalSocialAction, { type: 'library-visit' }>, key: string) {
  const repeats = life.usedActions.filter((item) => item.startsWith('library:read:')).length;
  const used = life.usedActions.filter((item) => item === key).length;
  if (action.activity === 'read') {
    const id = action.book!;
    const book = books[id]!;
    const story = `I read ${book.title} by ${book.author}. ${book.experience}`;
    // Reading stays repeatable. Only the first few distinct books grant benefits each year.
    if (used === 0) {
      life.usedActions.push(key);
      const history = localState(life).reading;
      localState(life).reading = [...history.slice(-(readingHistoryLimit - 1)), { year: life.year, book: id, experience: book.experience }];
    }
    const benefit = used === 0 && repeats < 4 && (repeats < 2 || npcRandom(life, key, life.year).next() < .55);
    if (benefit && book.skill && life.character.age >= skills[book.skill].age) incidentalPractice(life, book.skill, 1, repeats < 2 ? 43 : 24);
    recordNotice(life, 'life', 'Read a Book', story, benefit && book.mood ? { [book.mood]: repeats < 2 ? 2 : 1 } : undefined);
    return;
  }
  if (action.activity === 'research' && used < 2) life.usedActions.push(key);
  if (action.activity === 'socialize' && visitLibrary(life)) return;
  if (action.activity === 'research') {
    if (used < 2 && life.character.age >= skills.writing.age) incidentalPractice(life, 'writing', 1, used === 0 ? 40 : 20);
    recordNotice(life, 'life', 'Study & Research', used === 0 ?
      'I used books from two different shelves to check the same question before writing up what I found.' :
      'I returned to my notes and spent some quiet time at a reading table.', { smarts: used < 2 ? 2 - used : 0 });
    return;
  }
  const readers = libraryReaders(life);
  const scene = (name: string) => action.activity === 'circle' ?
    `${name} and I compared our notes on the reading circle’s book.` : `I caught up with ${name} near the library noticeboard.`;
  const guest = readers.length ? readers[npcRandom(life, `library-reader:${life.journal.length}`, life.year).integer(0, readers.length - 1)]! : undefined;
  const visit = gathering(life, action.activity === 'circle' ? readers : guest ? [guest] : [],
    { key, location: 'local' }, 'at the library', scene);
  recordNotice(life, 'community', action.activity === 'circle' ? 'Reading Circle' : 'At the Library', visit.story);
}
