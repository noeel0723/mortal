import { skills } from '../data/skills.ts';
import { compatibleGoals, datingProfileIssue, playerDatingProfile, validDatingProfile } from './dating.ts';
import type { DatingProfile } from './dating.ts';
import { datingCandidate, datingPool, datingPoolSize, matchesSearch } from './datingPool.ts';
import type { DatingCandidate } from './datingPool.ts';
import { recordNotice } from './eventNotices.ts';
import { skillsForInterest } from './hobbies.ts';
import { record } from './journal.ts';
import { changeRomance, loveIssue } from './love.ts';
import { annualLoveSearches, consumeLoveSearch, loveSearchCount } from './loveSearch.ts';
import { npcRandom, remember } from './npcs.ts';
import { relationshipMemory } from './relationships.ts';
import { datingSources } from './socialTypes.ts';
import type { DatingSource, SocialAction } from './socialTypes.ts';
import type { Life } from './types.ts';

export const discoveryEvent = 'social-dating-discovery';
const introductions: Record<DatingSource, string> = {
  spotlight: 'I found their profile while browsing local public figures.',
  date: 'We crossed paths at a local singles event.',
  app: 'I came across this profile on the dating app.',
  lgbtq: 'I came across this profile on the LGBTQ+ dating app.',
  casual: 'I found their profile while looking for a casual date.',
  matchmaking: 'A local matchmaker suggested this profile.',
};

export function updateDatingProfile(life: Life, profile: DatingProfile) {
  const issue = datingProfileIssue(life);
  if (issue) return issue;
  if (!validDatingProfile(profile)) return 'Choose valid dating preferences.';
  life.social.datingProfile = { ...profile };
  return null;
}

export function pendingDatingProfile(life: Life) {
  const cycle = life.social.datingCycle;
  const pending = cycle?.pending;
  if (!pending) return undefined;
  const candidate = datingCandidate(life, pending.candidate);
  const intro = pending.source === 'date' && cycle.background === 2 ?
    npcRandom(life, `introduction:${candidate.person.id}`).pick([
      'We started talking while waiting for coffee at a local café.',
      'We stopped to talk on the same walking path in the park.',
      'We were introduced at a neighborhood community event.',
      'We ended up at the same table at a hobby meetup.',
      'Someone we both knew introduced us and we struck up a conversation.',
    ]) : introductions[pending.source];
  return { ...candidate, intro };
}

export function validDatingState(life: Life) {
  const { datingProfile, datingCycle, pendingPerson } = life.social;
  const discovering = life.pending === discoveryEvent;
  if (datingProfile !== undefined && (!validDatingProfile(datingProfile) || life.character.age < 18)) return false;
  if (datingCycle === undefined) return !discovering;
  if (!datingCycle || datingCycle.year !== life.year || life.character.age < 18 ||
    (datingCycle.background !== undefined && datingCycle.background !== 2) ||
    !Array.isArray(datingCycle.viewed) || datingCycle.viewed.length > datingSources.length * annualLoveSearches ||
    new Set(datingCycle.viewed).size !== datingCycle.viewed.length ||
    !datingCycle.viewed.every((index) => Number.isInteger(index) && index >= 0 && index < datingPoolSize)) return false;
  const pending = datingCycle.pending;
  if (!discovering) return pending === undefined;
  return !!pending && Number.isInteger(pending.candidate) && !life.character.causeOfDeath && pendingPerson === null && datingSources.includes(pending.source) &&
    loveSearchCount(life, pending.source) > 0 && datingCycle.viewed.at(-1) === pending.candidate &&
    !life.social.people.some(({ id }) => id === `npc-pool-${life.year}-${pending.candidate}`);
}

export function searchDatingPool(life: Life, action: Extract<SocialAction, { type: 'dating-match' }>) {
  const issue = loveIssue(life, action);
  if (issue) return issue;
  const { source } = action;
  const saved = playerDatingProfile(life);
  const preferences = action.preferences ? { ...saved, age: action.preferences.age, netWorth: action.preferences.netWorth } : saved;
  const attempt = consumeLoveSearch(life, source);
  const viewed = life.social.datingCycle?.viewed ?? [];
  const eligible = datingPool(life).filter((candidate) => !viewed.includes(candidate.index) &&
    matchesSearch(life, candidate, source, preferences));
  if (preferences.age === 'any') eligible.sort((a, b) => Math.abs(a.person.age - life.character.age) - Math.abs(b.person.age - life.character.age));
  const random = npcRandom(life, `dating-discovery:${source}:${attempt}`, life.year);
  const candidate = eligible.length ? eligible[random.integer(0, Math.min(eligible.length, 12) - 1)] : undefined;
  if (!candidate) {
    recordNotice(life, 'community', 'No Suitable Profiles', 'I didn’t find anyone new who matched my preferences this time.');
    return null;
  }
  life.social.datingCycle = { ...life.social.datingCycle ?? { background: 2 }, year: life.year,
    viewed: [...viewed, candidate.index], pending: { candidate: candidate.index, source } };
  life.pending = discoveryEvent;
  if (!life.seen.includes(discoveryEvent)) life.seen.push(discoveryEvent);
  record(life, 'community', `I discovered ${candidate.person.name}.`);
  return null;
}

function interestResponse(life: Life, candidate: DatingCandidate) {
  const { person, profile, available } = candidate;
  if (!available || !profile.preferences.includes(life.character.gender) || life.character.age < 18) return 'unavailable';
  if (!compatibleGoals(playerDatingProfile(life).goal, profile.datingGoal)) return 'goals';
  const shares = new Set(profile.interests.flatMap(skillsForInterest));
  const shared = life.skills.hobbies.filter((id) => shares.has(id) && skills[id].age <= person.age).length;
  const affinity = 26 + life.character.attributes.looks * .19 + life.character.attributes.charisma * .11 +
    person.bond.compatibility * .14 + shared * 7 + profile.traits.sociability * .09 -
    Math.max(0, Math.abs(person.age - life.character.age) - 6) * 1.1 - (person.city === life.character.city ? 0 : 7);
  return npcRandom(life, `like-response:${person.id}`).next() * 100 < Math.min(82, Math.max(8, affinity)) ? 'matched' : 'declined';
}

export function answerDatingDiscovery(life: Life, liked: boolean) {
  const cycle = life.social.datingCycle;
  const pending = pendingDatingProfile(life);
  if (!cycle || !pending) return;
  life.social.datingCycle = { year: cycle.year, viewed: cycle.viewed, ...(cycle.background ? { background: cycle.background } : {}) };
  const { person, profile } = pending;
  if (!liked) {
    record(life, 'decision', `I passed on ${person.name}’s profile.`);
    return;
  }
  const result = interestResponse(life, pending);
  if (result !== 'matched') {
    const story = result === 'goals' ? `${person.name} and I were looking for different things.` :
      result === 'unavailable' ? `${person.name} was unavailable to connect.` : `${person.name} didn’t return my like.`;
    recordNotice(life, 'community', 'No Mutual Match', story);
    return;
  }
  life.social.people.push(person);
  life.social.profiles[person.id] = profile;
  const story = `${person.name} liked me back. We agreed to get to know each other.`;
  changeRomance(life, person.id, 'getting-to-know', story);
  relationshipMemory(life, person.id, 'meeting', 3);
  remember(life, person, story);
  recordNotice(life, 'community', 'Mutual Match', story);
}
