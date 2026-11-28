import { recordNotice, resultMeter } from './eventNotices.ts';
import { sharedHobbies } from './hobbies.ts';
import { ensureNpc, npcProfile, npcRandom, remember } from './npcs.ts';
import { friendshipStory } from './relationshipStories.ts';
import { availability } from './socialContext.ts';
import type { FriendshipStage } from './localSocialTypes.ts';
import type { Contact, Life } from './types.ts';

export const friendshipLabels: Record<FriendshipStage, string> = {
  acquaintance: 'Acquaintance', casual: 'Casual Friend', friend: 'Friend', close: 'Close Friend', best: 'Best Friend', former: 'Former Friend',
};

export function friendshipStage(life: Life, person: Contact): FriendshipStage {
  const profile = npcProfile(life, person);
  if (profile.formerFriend) return 'former';
  if (profile.friendship) return profile.friendship.stage;
  if (!('friend' in person) || !person.friend) return 'acquaintance';
  const years = life.year - profile.met;
  const score = person.bond.affection * .52 + person.bond.trust * .35 + profile.traits.loyalty * .13;
  if (years >= 4 && score >= 80 && profile.memories.length >= 4) return 'best';
  if (years >= 2 && score >= 66 && profile.memories.length >= 2) return 'close';
  return 'friend';
}

export const invitationKey = (id: string) => `friendship-invite:${id}`;

export function friendshipWillingness(life: Life, person: Contact) {
  const { affection, trust, respect, familiarity, compatibility, resentment } = person.bond;
  const profile = npcProfile(life, person);
  return affection * .18 + trust * .22 + respect * .13 + familiarity * .16 + compatibility * .15 +
    profile.traits.empathy * .09 + profile.traits.sociability * .07 + Math.min(15, sharedHobbies(life, person).length * 6) -
    resentment * .55 + Math.min(12, (profile.friendship?.experiences ?? 0) * 2);
}

export function friendshipResponse(life: Life, person: Contact, cost: number) {
  const issue = availability(life, person, { key: 'friendship', location: 'remote' });
  const score = friendshipWillingness(life, person);
  const disposition = npcRandom(life, `friendship-willingness:${person.id}`, life.year).integer(-16, 16);
  const accepted = !issue && score + disposition >= 47;
  life.usedActions.push(invitationKey(person.id));
  if (accepted) {
    acceptFriendship(life, person, cost);
    return;
  }
  const text = issue ? `${person.name} said this wasn’t a good time. ${issue.reason}` : score >= 35 ?
    `${person.name} wanted to stay acquaintances for now. We agreed to keep getting to know each other.` :
    `${person.name} said they didn’t feel ready for a friendship. I respected their answer.`;
  remember(life, person, text);
  recordNotice(life, 'community', issue ? 'Maybe Another Time' : 'A Friendship Offer', text, { energy: -cost });
}

export function acceptFriendship(life: Life, person: Contact, cost = 0) {
  if (!('friend' in person)) return;
  const profile = ensureNpc(life, person);
  const experiences = profile.friendship?.experiences ?? 0;
  person.friend = true;
  profile.formerFriend = false;
  profile.friendsSince ??= life.year;
  profile.friendship = { stage: 'casual', experiences, changed: life.year, last: life.year };
  const story = `${friendshipStory(life, person)} We both wanted to stay in touch.`;
  remember(life, person, story);
  recordNotice(life, 'community', 'A New Friend', story, { energy: -cost, happiness: 5 }).meter =
    resultMeter('Affection', person.bond.affection, person.bond.affection);
}

export function friendshipExperience(life: Life, person: Contact, quality: number) {
  if (!('friend' in person) || quality < .60 || person.role === 'Teacher' || person.role === 'Professor') return;
  const profile = ensureNpc(life, person);
  const stage = friendshipStage(life, person);
  if (stage === 'former') return;
  const current = profile.friendship ?? { stage, experiences: person.friend ? Math.min(4, profile.memories.length) : 0, changed: life.year };
  const gain = current.last === life.year ? 0 : quality >= .95 ? 2 : 1;
  const experiences = Math.min(32, current.experiences + gain);
  const years = life.year - (profile.friendsSince ?? profile.met);
  const { trust, respect, familiarity, resentment } = person.bond;
  const score = friendshipWillingness(life, person);
  let next = stage;
  if (stage === 'casual' && life.year > current.changed && experiences >= 2 && trust >= 38 && familiarity >= 30 && score >= 50) next = 'friend';
  if (stage === 'friend' && years >= 2 && experiences >= 4 && trust >= 56 && respect >= 48 && score >= 59) next = 'close';
  if (stage === 'close' && years >= 4 && experiences >= 7 && trust >= 72 && respect >= 62 && resentment <= 16 && score >= 71) next = 'best';
  profile.friendship = { stage: next, experiences, changed: next === stage ? current.changed : life.year, last: life.year };
  if (next !== stage) {
    const story = `After the time we’d spent together, ${person.name} and I had grown closer. I now considered them a ${friendshipLabels[next].toLowerCase()}.`;
    remember(life, person, story);
    recordNotice(life, 'community', 'A Friendship Grew', story);
  }
}
