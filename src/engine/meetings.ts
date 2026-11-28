import { libraryHobbies } from '../data/libraryEvents.ts';
import { skills } from '../data/skills.ts';
import { recordNotice } from './eventNotices.ts';
import { hobbyGroupContact, personalizedLibraryHobbies, sharedHobbies } from './hobbies.ts';
import { clamp, record } from './journal.ts';
import { ensureNpc, makeNpc, newPeopleLimit, npcRandom, remember } from './npcs.ts';
import { inPersonIssue, relationshipMemory } from './relationships.ts';
import { meetingSources } from './socialTypes.ts';
import type { MeetingSource } from './socialTypes.ts';
import { pickStory } from './stories.ts';
import type { Life } from './types.ts';

const sources = {
  neighborhood: { age: 8, title: 'A New Neighbor' },
  hobbies: { age: 8, title: 'At the Hobby Group' },
  library: { age: 5, title: 'A Shared Hobby' },
};
const meetingKey = (source: MeetingSource) => `meeting:${source}`;

function knownGuest(life: Life, source: MeetingSource) {
  if (source !== 'hobbies') return undefined;
  const person = hobbyGroupContact(life);
  return person && !inPersonIssue(life, person) ? person : undefined;
}

export function meetingIssue(life: Life, source: MeetingSource) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  if (life.character.age < sources[source].age) return `Available from age ${sources[source].age}.`;
  if (life.usedActions.includes(meetingKey(source))) return 'You already used this activity to meet someone this year.';
  if (!knownGuest(life, source) && life.social.people.filter(({ role }) => role === 'Acquaintance').length >= newPeopleLimit - 8) {
    return 'Your social circle is full.';
  }
  return null;
}

function meetingDetails(life: Life, source: MeetingSource) {
  const random = npcRandom(life, meetingKey(source), life.year);
  const known = knownGuest(life, source);
  const age = Math.min(114, Math.max(sources[source].age, life.character.age + random.integer(-3, 3)));
  const newcomer = known ? undefined : makeNpc(life, `npc-meet-${source}-${life.year}`, age, 'Acquaintance');
  const person = known ?? newcomer!;
  const hobby = source === 'hobbies' ? (known ? sharedHobbies(life, known)[0] : life.skills.hobbies.find((id) => skills[id].age <= person.age)) : undefined;
  const interests = source === 'library' ? personalizedLibraryHobbies(life) : [];
  const libraryInterest = source === 'library' ? interests[random.integer(0, Math.max(0, interests.length - 1))] ?? random.pick(libraryHobbies) : undefined;
  const name = person.name;
  const introductions = {
    neighborhood: [
      `I met ${name} while picking up a parcel in my neighborhood. They offered to show me a shortcut home.`,
      `I held the gate open for ${name} in my neighborhood. They recognized me from walks around the block.`,
      `At the neighborhood market, ${name} asked if I knew which stall had the fresh bread.`,
      `I noticed ${name} watering the plants outside in my neighborhood. They waved me over.`,
      `I met ${name} when the wind blew their shopping list under my feet in my neighborhood.`,
      `${name} and I reached for the same bench in my neighborhood. There was room for both of us.`,
    ],
    hobbies: [
      `I ${known ? 'ran into' : 'met'} ${name} at a hobby group. We ended up sharing a table.`,
      `I ${known ? 'ran into' : 'met'} ${name} at a hobby group when we both volunteered for the same demonstration.`,
      `I ${known ? 'ran into' : 'met'} ${name} at a hobby group. They offered to trade supplies so we could both get started.`,
      `I ${known ? 'ran into' : 'met'} ${name} at a hobby group just as everyone was pairing up.`,
      `I ${known ? 'ran into' : 'met'} ${name} at a hobby group after their project made me laugh.`,
    ],
    library: [
      `I met ${name} at the library when we both reached for the same book.`,
      `I met ${name} at the library after they left a bookmark on the table beside mine.`,
      `At the library, ${name} asked if the chair across from me was free.`,
      `I met ${name} while we compared handwritten book recommendations on the library noticeboard.`,
      `I met ${name} in the library line. They were returning a book I had been waiting for.`,
      `At the library, ${name} spotted me looking through a stack they had just finished browsing.`,
    ],
  } satisfies Record<MeetingSource, [string, ...string[]]>;
  const suffix = hobby ? ` We both enjoy ${skills[hobby].name}.` : libraryInterest ? ` We both enjoy ${libraryInterest}.` : '';
  const intro = random.pick(introductions[source]) + suffix;
  return { person, newcomer, interest: hobby ?? libraryInterest, intro, title: sources[source].title };
}

export function pendingMeeting(life: Life) {
  const source = life.social.pendingMeeting;
  return source ? meetingDetails(life, source) : undefined;
}

export function validPendingMeeting(life: Life) {
  const { pendingMeeting: source } = life.social;
  if (life.pending !== 'social-meeting') return source === undefined;
  return source !== undefined && meetingSources.includes(source) && life.social.pendingPerson === null &&
    life.character.age >= sources[source].age && life.usedActions.includes(meetingKey(source));
}

export function startMeeting(life: Life, source: MeetingSource) {
  const issue = meetingIssue(life, source);
  if (issue) return issue;
  life.usedActions.push(meetingKey(source));
  life.social.pendingMeeting = source;
  life.pending = 'social-meeting';
  if (!life.seen.includes(life.pending)) life.seen.push(life.pending);
  record(life, 'community', meetingDetails(life, source).intro);
  return null;
}

export function answerMeeting(life: Life, accepted: boolean) {
  const source = life.social.pendingMeeting;
  const meeting = pendingMeeting(life);
  delete life.social.pendingMeeting;
  if (!source || !meeting) return;
  const { person, newcomer, interest } = meeting;
  const name = person.name;
  if (!accepted) {
    record(life, 'decision', pickStory(life, `meeting-pass:${source}`, [
      `I smiled at ${name} and carried on with my plans.`,
      `I waved goodbye to ${name} and left before the conversation got very far.`,
      `I decided to keep to myself and said goodbye to ${name}.`,
    ]));
    return;
  }
  if (newcomer) {
    life.social.people.push(newcomer);
    relationshipMemory(life, person.id, 'meeting', 2);
  }
  const profile = ensureNpc(life, person);
  if (newcomer && interest) profile.interests = [interest, ...profile.interests.filter((item) => item !== interest).slice(0, 1)];
  person.bond.affection = clamp(person.bond.affection + 2);
  person.bond.familiarity = clamp(person.bond.familiarity + 3);
  const conversations = {
    neighborhood: [`I traded local recommendations with ${name}. We agreed to say hello next time.`,
      `${name} told me a funny story about the block. We stayed to chat longer than planned.`,
      `I walked down the street with ${name} and we found a spot to meet again.`,
      `I shared my favorite place in the neighborhood with ${name}, and they offered to show me theirs.`],
    hobbies: [`${name} and I compared what we were working on and swapped a few tips.`,
      `I teamed up with ${name} for the next exercise. We agreed to work together again.`,
      `I helped ${name} finish a small project and they invited me back for the next session.`,
      `I shared a trick with ${name}. Their version worked even better than mine.`],
    library: [`I compared reading lists with ${name}. We picked a book to discuss next time.`,
      `${name} and I walked through the shelves together and wrote down each other’s recommendations.`,
      `I asked ${name} about the book they were carrying. One question turned into a long conversation.`,
      `I helped ${name} track down a title and agreed to catch up on our next visit.`],
  };
  const story = pickStory(life, `meeting-chat:${source}`, conversations[source]);
  remember(life, person, story);
  recordNotice(life, 'community', newcomer ? 'A New Acquaintance' : 'A Good Catch-Up', story, { happiness: 2 });
}
