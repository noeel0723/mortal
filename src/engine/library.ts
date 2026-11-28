import { libraryEvents, libraryFriendEvent, libraryHobbies } from '../data/libraryEvents.ts';
import { contactIdentity, generateAppearance } from './appearance.ts';
import { personalizedLibraryHobbies } from './hobbies.ts';
import { record } from './journal.ts';
import { meetingIssue, startMeeting } from './meetings.ts';
import { npcNamePicker } from './npcNames.ts';
import { seededRandom } from './random.ts';
import type { CommunityFriend, Life, LifeEvent } from './types.ts';

export function libraryGuest(life: Life): CommunityFriend {
  const id = `library-${life.year}`;
  const random = seededRandom(life.seed ^ Math.imul(life.year, 0xa14df399));
  const identity = npcNamePicker(life)(random);
  // The journal already contains the guest introduced by an unresolved encounter in an older save.
  const intro = life.journal.findLast(({ age, category, text }) => age === life.character.age &&
    category === 'community' && /^I met .+ while browsing the library shelves\./.test(text));
  const recordedName = intro?.text.match(/^I met (.+?) while browsing the library shelves\./)?.[1];
  const guest = recordedName && recordedName !== identity.name ? { name: recordedName, ...contactIdentity(life.seed, id, recordedName, 'Friend') } :
    { ...identity, appearance: generateAppearance(life.seed, id) };
  const age = Math.min(115, Math.max(5, life.character.age + random.integer(-2, 2)));
  const interests = personalizedLibraryHobbies(life);
  return { id, ...guest, role: 'Friend', friend: true,
    age, city: life.character.city, alive: true, health: random.integer(68, 95), occupation: age < 18 ? 'Student' : 'Library member',
    hobby: interests.length ? interests[random.integer(0, interests.length - 1)]! : random.pick(libraryHobbies),
    bond: { affection: 56, trust: 45, respect: 55, compatibility: 75, resentment: 0, familiarity: 20 } };
}

export function eventStory(life: Life, event: LifeEvent) {
  if (event.id !== libraryFriendEvent) return event.text;
  const guest = libraryGuest(life);
  return `I met ${guest.name} while browsing the library shelves. We both enjoy ${guest.hobby}.`;
}

export function visitLibrary(life: Life) {
  const check = ['library-check-1', 'library-check-2', 'library-check-3'].find((key) => !life.usedActions.includes(key));
  if (!check || life.usedActions.includes('library-encounter')) return false;
  life.usedActions.push(check);
  const random = seededRandom(life.random);
  const roll = random.next();
  const available = libraryEvents.filter((event) => life.character.age >= event.ages[0] &&
    (event.id === libraryFriendEvent ? !meetingIssue(life, 'library') : !life.seen.includes(event.id)) && roll < event.probability);
  const event = available.length ? available[random.integer(0, available.length - 1)] : undefined;
  life.random = random.state;
  if (!event) return false;
  life.usedActions.push('library-encounter');
  if (!life.seen.includes(event.id)) life.seen.push(event.id);
  if (event.id === libraryFriendEvent) {
    startMeeting(life, 'library');
    return true;
  }
  record(life, event.category, eventStory(life, event));
  life.pending = event.id;
  return true;
}

export function befriendLibraryGuest(life: Life) {
  const guest = libraryGuest(life);
  life.communityFriends.push(guest);
  return `I became friends with ${guest.name} at the library. We planned to meet again and spend more time ${guest.hobby}.`;
}
