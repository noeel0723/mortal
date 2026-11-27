import { libraryEvents, libraryFriendEvent, libraryHobbies } from '../data/libraryEvents.ts';
import { genders, givenNames, surnames } from '../data/veyra.ts';
import { contactIdentity } from './appearance.ts';
import { record } from './journal.ts';
import { seededRandom } from './random.ts';
import type { CommunityFriend, Life, LifeEvent } from './types.ts';

function libraryGuest(life: Life): CommunityFriend {
  const id = `library-${life.year}`;
  const random = seededRandom(life.seed ^ Math.imul(life.year, 0xa14df399));
  const gender = random.pick(genders);
  const known = new Set([...life.family, ...life.schoolContacts, ...life.career.contacts, ...life.communityFriends].map(({ name }) => name));
  const firstName = random.pick(givenNames[gender]);
  const lastName = random.pick(surnames);
  const preferred = `${firstName} ${lastName}`;
  const name = known.has(preferred)
    ? givenNames[gender].flatMap((first) => surnames.map((last) => `${first} ${last}`)).find((candidate) => !known.has(candidate)) ?? preferred
    : preferred;
  const age = Math.min(115, Math.max(5, life.character.age + random.integer(-2, 2)));
  return { id, name, ...contactIdentity(life.seed, id, name, 'Friend'), role: 'Friend', friend: true,
    age, city: life.character.city, alive: true, health: random.integer(68, 95), occupation: age < 18 ? 'Student' : 'Library member',
    hobby: random.pick(libraryHobbies), bond: { affection: 56, trust: 45, respect: 55, compatibility: 75, resentment: 0, familiarity: 20 } };
}

export function eventStory(life: Life, event: LifeEvent) {
  if (event.id !== libraryFriendEvent) return event.text;
  const guest = libraryGuest(life);
  return `I met ${guest.name} while browsing the library shelves. We both enjoy ${guest.hobby}.`;
}

export function visitLibrary(life: Life) {
  const check = ['library-check-1', 'library-check-2', 'library-check-3'].find((key) => !life.usedActions.includes(key));
  if (!check || life.usedActions.includes('library-encounter')) return;
  life.usedActions.push(check);
  const random = seededRandom(life.random);
  const roll = random.next();
  const available = libraryEvents.filter((event) => life.character.age >= event.ages[0] &&
    (event.id === libraryFriendEvent || !life.seen.includes(event.id)) && roll < event.probability);
  const event = available.length ? available[random.integer(0, available.length - 1)] : undefined;
  life.random = random.state;
  if (!event) return;
  life.usedActions.push('library-encounter');
  if (!life.seen.includes(event.id)) life.seen.push(event.id);
  record(life, event.category, eventStory(life, event));
  life.pending = event.id;
}

export function befriendLibraryGuest(life: Life) {
  const guest = libraryGuest(life);
  life.communityFriends.push(guest);
  return `I became friends with ${guest.name} at the library. We planned to meet again and spend more time ${guest.hobby}.`;
}
