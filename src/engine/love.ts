import { recordNotice, resultMeter } from './eventNotices.ts';
import { moveHousehold } from './household.ts';
import { compatibleGoals, datingGoals, datingIntent, isDatingApp, playerDatingProfile, validDatingPreferences } from './dating.ts';
import { firstDateIssue, firstDateOutcome, firstDatePrice } from './firstDates.ts';
import { sharedHobbies } from './hobbies.ts';
import { clamp } from './journal.ts';
import { loveSearchIssue } from './loveSearch.ts';
import { meetingIssue, startMeeting } from './meetings.ts';
import { ensureNpc, isFamily, newPeopleLimit, npcProfile, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import { agreementFor, attraction, boundaryEvidence, inPersonIssue, meaningfulTime, openConcern, relationshipEnded, relationshipMemory,
  restartRelationship, responseScale, takingSpace } from './relationships.ts';
import type { RelationshipState } from './relationshipTypes.ts';
import { pickStory } from './stories.ts';
import { activeRomanceStatuses, datingSources } from './socialTypes.ts';
import type { Romance, SocialAction } from './socialTypes.ts';
import type { Contact, Effect, Life } from './types.ts';

export const romanceLabels: Record<Romance['status'], string> = {
  'getting-to-know': 'Getting to Know Each Other', interest: 'Romantic Interest', dating: 'Going on Dates',
  committed: 'Committed Partners', engaged: 'Engaged', married: 'Married',
  'contact-ended': 'Communication Ended', 'broken-up': 'Former Partner', divorced: 'Former Spouse', widowed: 'Late Partner',
};

export const weddingPlans = {
  civil: { label: 'Civil Ceremony', cost: 2500 },
  gathering: { label: 'Family Gathering', cost: 6500 },
  celebration: { label: 'Wedding Celebration', cost: 14000 },
} as const;

export const dateActivities = {
  date: { label: 'Go on a Date', cost: 300, affection: 5, trust: 1 },
  gift: { label: 'Give a Gift', cost: 500, affection: 4, trust: 2 },
  dinner: { label: 'Have Dinner Together', cost: 650, affection: 6, trust: 2 },
  movie: { label: 'Watch a Movie', cost: 400, affection: 4, trust: 1 },
  support: { label: 'Offer Support', cost: 0, affection: 3, trust: 5 },
  future: { label: 'Discuss the Future', cost: 0, affection: 2, trust: 4 },
  apologize: { label: 'Apologize', cost: 0, affection: 2, trust: 3 },
} as const;

export type LoveAction = Extract<SocialAction, { type: 'meet' | 'dating-match' | 'romance' | 'wedding' }>;
export const isActiveRomance = (entry?: Romance) => !!entry && activeRomanceStatuses.some((status) => entry.status === status);
export const romanceFor = (life: Life, id: string) => life.social.romances.find(({ person }) => person === id);
export const committedRomance = (life: Life) => life.social.romances.find(({ status }) => status === 'engaged' || status === 'married');
export const activeRomances = (life: Life) => life.social.romances.filter(isActiveRomance);
export const activeRomance = (life: Life) => committedRomance(life) ?? life.social.romances.find(isActiveRomance);

export function romanceHistory(life: Life, id: string, text: string) {
  const romance = romanceFor(life, id);
  if (romance) romance.history = [...romance.history.slice(-29), { year: life.year, text }];
}

export function changeRomance(life: Life, id: string, status: Romance['status'], text: string) {
  let romance = romanceFor(life, id);
  const previous = romance?.status;
  if (!romance) {
    romance = { person: id, status, started: life.year, engagement: null, wedding: null, ended: null, history: [] };
    life.social.romances.push(romance);
  }
  if (romance.ended !== null && (status === 'getting-to-know' || status === 'interest' || status === 'dating')) {
    Object.assign(romance, { started: life.year, engagement: null, wedding: null, ended: null });
  }
  romance.status = status;
  if (status === 'dating' && (previous === 'getting-to-know' || previous === 'interest')) romance.started = life.year;
  if (status === 'engaged') romance.engagement = life.year;
  if (status === 'married') romance.wedding = life.year;
  if (status === 'broken-up' || status === 'divorced' || status === 'widowed') romance.ended = life.year;
  romanceHistory(life, id, text);
  if (status === 'dating') {
    delete life.social.profiles[id]?.casualContact;
    restartRelationship(life, id);
    relationshipMemory(life, id, 'date', 8, true);
    boundaryEvidence(life, [id], 'date');
  }
  if (status === 'engaged' || status === 'married') {
    relationshipMemory(life, id, status === 'engaged' ? 'engagement' : 'marriage', 12, true);
    meaningfulTime(life, findContact(life, id)!, 'time', 8);
  }
}

export function endRomance(life: Life, person: Contact, text: string, reason: NonNullable<RelationshipState['endedBecause']> = 'player') {
  const divorce = romanceFor(life, person.id)?.status === 'married';
  const settlement = divorce ? Math.min(5000, Math.floor(life.character.bank * .08)) : 0;
  const profile = ensureNpc(life, person);
  profile.savings += settlement;
  if (profile.datingGoal && (reason === 'betrayal' || reason === 'conflict')) profile.datingGoal = 'not-looking';
  changeRomance(life, person.id, divorce ? 'divorced' : 'broken-up', text);
  person.bond.affection = clamp(person.bond.affection - 12);
  relationshipEnded(life, person.id, reason);
  return settlement;
}

export function canPropose(life: Life, romance?: Romance) {
  const person = romance && findContact(life, romance.person);
  return !!person && datingIntent(life, person, 'engage').allowed && !committedRomance(life) && (romance?.status === 'committed' ||
    (romance?.status === 'dating' && agreementFor(life, romance.person) === 'legacy'));
}

function related(life: Life, id: string) {
  return isFamily(life, id) || !!life.social.parents['self']?.some((parent) => life.social.parents[id]?.includes(parent));
}

export function datingCompatibility(life: Life, person: Contact) {
  const { compatibility, affection, familiarity } = person.bond;
  const profile = npcProfile(life, person);
  return clamp(Math.round(compatibility * .6 + affection * .17 + familiarity * .12 + profile.traits.empathy * .11 + Math.min(8, sharedHobbies(life, person).length * 4)));
}

function loveKey(action: Exclude<LoveAction, { type: 'meet' | 'dating-match' }>) {
  if (action.type === 'wedding') return 'wedding';
  return action.action === 'ask' || action.action === 'propose' ? 'romantic-advance' : `romance-${action.action}`;
}

export function loveIssue(life: Life, action: LoveAction): string | null {
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (action.type === 'meet' || action.type === 'dating-match') {
    const match = action.type === 'dating-match';
    if (match && !datingSources.includes(action.source)) return 'Choose a dating activity.';
    if (match && action.preferences !== undefined && (!isDatingApp(action.source) || !validDatingPreferences(action.preferences))) {
      return 'Choose a valid age range and net worth.';
    }
    if (action.source === 'hobbies' || action.source === 'neighborhood') return meetingIssue(life, action.source);
    if (life.character.age < 18) return 'Dating opens at age 18.';
    if (playerDatingProfile(life).goal === 'not-looking') return 'Update your relationship goal in Dating Profile to start looking.';
    if (life.social.people.filter(({ role }) => role === 'Acquaintance').length >= newPeopleLimit - 8) return 'Your social circle is full.';
    return loveSearchIssue(life, action.source);
  }
  const person = findContact(life, action.person);
  if (!person?.alive) return 'This person is unavailable.';
  if (life.character.age < 18 || person.age < 18) return 'Both people must be adults.';
  const romance = romanceFor(life, person.id);
  const key = loveKey(action);
  if (life.usedActions.includes(key) || life.usedActions.includes(`${key}:${person.id}`)) return 'Available again next year.';
  if (action.type === 'wedding') {
    if (romance?.status !== 'engaged') return 'You need to be engaged first.';
    return inPersonIssue(life, person) ?? (life.character.bank < weddingPlans[action.plan].cost ? 'Your balance does not cover this wedding.' : null);
  }
  const kind = action.action;
  if (romance?.status === 'contact-ended') return 'Communication with this person has ended.';
  if (takingSpace(life, person.id) && kind !== 'breakup' && kind !== 'divorce') return 'They’ve asked for time apart.';
  if (kind === 'interest' || kind === 'ask') {
    if (related(life, person.id)) return 'Dating is unavailable with relatives.';
    if (isActiveRomance(romance)) return 'You are already together.';
    if (kind === 'ask' && inPersonIssue(life, person)) return inPersonIssue(life, person);
    if (action.action === 'ask' && action.venue !== undefined) {
      const issue = firstDateIssue(life, person, action.venue);
      if (issue) return issue;
    }
    if (npcProfile(life, person).localPartner) return 'This person is seeing someone.';
    if (kind === 'interest' && romance?.status === 'interest') return 'You already marked this interest.';
  } else if (!romance || !isActiveRomance(romance)) return 'Available with a current partner.';
  else if (kind === 'propose' && !canPropose(life, romance)) return datingIntent(life, person, 'engage').allowed ?
    'Discuss commitment first. Only one engagement or marriage can be active.' : 'Their current relationship goals don’t include engagement.';
  else if (kind === 'divorce' && romance.status !== 'married') return 'Available while married.';
  else if (kind === 'breakup' && romance.status === 'married') return 'Use Divorce to end a marriage.';
  if ((kind === 'date' || kind === 'dinner' || kind === 'movie' || kind === 'gift' || kind === 'propose') && inPersonIssue(life, person)) {
    return inPersonIssue(life, person);
  }
  if (kind in dateActivities && life.character.bank < dateActivities[kind as keyof typeof dateActivities].cost) return 'Your balance does not cover this activity.';
  if (kind !== 'interest' && kind !== 'breakup' && kind !== 'divorce' && life.character.attributes.energy < 6) return 'You need 6 energy.';
  return null;
}

function dateStory(life: Life, person: Contact, action: keyof typeof dateActivities) {
  const { name } = person;
  const stories = {
    date: [`I explored a weekend market with ${name} and we picked a place for our next date.`, `I shared a picnic with ${name} by the water.`, `I went out for coffee with ${name} and we lost track of time.`],
    gift: [`I brought ${name} a book they had mentioned wanting to read.`, `I gave ${name} a little gift that reminded me of our first date.`, `I surprised ${name} with their favorite snack and a note.`],
    dinner: [`I tried a new restaurant with ${name} and we ordered dishes to share.`, `I took ${name} to dinner and we talked until the room started to empty.`, `I went out to dinner with ${name} and we picked a dessert for each other.`],
    movie: [`I shared popcorn with ${name} while we watched a movie.`, `I let ${name} pick the film and we talked about the ending afterward.`, `I watched a movie with ${name} and we both laughed at the same scene.`],
    support: [`I listened to ${name} after a difficult day and asked what would help.`, `I offered to handle an errand so ${name} could have a quieter evening.`, `I checked in with ${name} about something that had been worrying them.`],
    future: [`I asked ${name} what they hoped life would look like in a few years.`, `I talked with ${name} about which plans we could work on together.`, `I compared my priorities with ${name} and found a goal we both wanted.`],
    apologize: [`I apologized to ${name} for not listening closely enough.`, `I told ${name} what I regretted saying and gave them time to respond.`, `I acknowledged how I had upset ${name} and asked how I could make it right.`],
  };
  return pickStory(life, `${person.id}:romance:${action}`, stories[action]);
}

export function applyLove(life: Life, action: Extract<LoveAction, { type: 'romance' | 'wedding' }> |
  { type: 'meet'; source: 'hobbies' | 'neighborhood' }) {
  const issue = loveIssue(life, action.type === 'romance' && action.action === 'ask' ? { ...action, venue: action.venue ?? 'park' } : action);
  if (issue) return issue;
  if (action.type === 'meet') return startMeeting(life, action.source);
  const person = findContact(life, action.person)!;
  const profile = ensureNpc(life, person);
  const previous = person.bond.affection;
  life.usedActions.push(`${loveKey(action)}:${person.id}`);
  let title: string;
  let story: string;
  let effect: Effect = {};
  let dateQuality: number | undefined;
  if (action.type === 'wedding') {
    const plan = weddingPlans[action.plan];
    title = 'Wedding Day';
    story = `I married ${person.name} at our ${plan.label.toLowerCase()}.`;
    changeRomance(life, person.id, 'married', story);
    moveHousehold(life, life.character.city);
    person.bond.affection = clamp(previous + 6);
    effect = { bank: -plan.cost, happiness: 8 };
  } else if (action.action === 'interest') {
    title = 'Romantic Interest';
    story = `I told ${person.name} I was interested in getting to know them romantically. I gave them room to decide how they felt.`;
    changeRomance(life, person.id, 'interest', story);
  } else if (action.action === 'ask' || action.action === 'propose') {
    const proposing = action.action === 'propose';
    const venue = action.action === 'ask' ? action.venue ?? 'park' : 'park';
    const mutualInterest = attraction(life, person);
    const intention = datingIntent(life, person, proposing ? 'engage' : 'date');
    const history = Math.min(10, profile.conflicts * 2);
    const chance = Math.max(5, Math.min(88, mutualInterest * .64 + person.bond.trust * .19 + profile.traits.confidence * .16 -
      person.bond.resentment * .25 - history - (proposing ? 16 : 0) + intention.adjustment));
    const accepted = intention.allowed && mutualInterest > 0 && npcRandom(life, `advance:${person.id}`, life.year).next() * 100 < chance;
    title = accepted ? proposing ? 'Engaged' : 'A First Date' : proposing ? 'Proposal Declined' : 'Date Declined';
    if (accepted && !proposing) {
      const date = firstDateOutcome(life, person, venue);
      dateQuality = date.quality;
      story = date.story;
      if (date.outcome !== 'disappointing') changeRomance(life, person.id, 'dating', story);
      else {
        if (romanceFor(life, person.id)) romanceHistory(life, person.id, story);
        else changeRomance(life, person.id, 'interest', story);
        relationshipMemory(life, person.id, 'date', -4);
        boundaryEvidence(life, [person.id], 'date');
      }
      const warmth = date.outcome === 'positive' ? 5 : date.outcome === 'neutral' ? 1 : -3;
      person.bond.affection = clamp(previous + warmth);
      person.bond.trust = clamp(person.bond.trust + (date.outcome === 'positive' ? 3 : 0));
      person.bond.familiarity = clamp(person.bond.familiarity + 3);
      if (date.outcome !== 'disappointing') meaningfulTime(life, person, 'time');
      effect = { bank: -firstDatePrice(life, person, venue), energy: -6, happiness: warmth };
    } else if (accepted) {
      story = `${person.name} accepted my proposal.`;
      changeRomance(life, person.id, 'engaged', story);
      person.bond.affection = clamp(previous + 4);
      effect = { energy: -6, happiness: 4 };
    } else {
      story = proposing ? `${person.name} said they were not ready to get engaged.` :
        !intention.allowed ? `${person.name} said they aren’t looking to date right now. I respected their answer.` :
          `${person.name} declined my invitation. I respected their answer.`;
      if (!romanceFor(life, person.id)) changeRomance(life, person.id, 'interest', story);
      else romanceHistory(life, person.id, story);
      effect = { energy: -6, happiness: -2 };
    }
  } else if (action.action === 'breakup' || action.action === 'divorce') {
    const divorce = action.action === 'divorce';
    title = divorce ? 'Divorce' : 'Breakup';
    story = divorce ? `${person.name} and I divorced and settled our shared expenses.` : `I ended my relationship with ${person.name}.`;
    const settlement = endRomance(life, person, story);
    effect = { bank: -settlement, happiness: -5 };
  } else {
    const item = dateActivities[action.action];
    title = item.label;
    story = dateStory(life, person, action.action);
    const resistance = responseScale(life, person, action.action);
    if (action.action === 'future' && profile.datingGoal) {
      const compatible = compatibleGoals(playerDatingProfile(life).goal, profile.datingGoal);
      story = `${person.name} told me their priority was ${datingGoals[profile.datingGoal].label.toLowerCase()}. ${compatible ?
        'We talked about what that could mean for us.' : 'Our plans were different, and we talked about what each of us could offer.'}`;
      if (!compatible) openConcern(life, person.id, 'goals', 32);
    }
    if (resistance === 0) story += ' It didn’t land as I’d hoped. They needed space to think.';
    person.bond.affection = clamp(previous + Math.round(item.affection * resistance));
    person.bond.trust = clamp(person.bond.trust + Math.round(item.trust * resistance));
    if (resistance > 0) {
      const support = action.action === 'support';
      meaningfulTime(life, person, support ? 'support' : 'time', Math.ceil((action.action === 'apologize' ? 8 : support ? 7 : 4) * resistance));
      if (action.action === 'apologize') person.bond.resentment = clamp(person.bond.resentment - Math.ceil(7 * resistance));
      if (action.action === 'date') boundaryEvidence(life, [person.id], 'date');
    } else if (action.action === 'future' && Math.abs(profile.traits.ambition - life.character.attributes.discipline) >= 45) {
      openConcern(life, person.id, 'goals', 38);
    }
    romanceHistory(life, person.id, story);
    effect = { bank: -item.cost, energy: -6, happiness: Math.round(3 * resistance) };
  }
  remember(life, person, story);
  const notice = recordNotice(life, 'community', title, story, effect, 'relationships');
  if (action.type === 'wedding') notice.details = { kind: 'wedding-names', person: person.id };
  else if (dateQuality !== undefined) notice.meter = resultMeter('Date Quality', dateQuality, dateQuality);
  else notice.meter = resultMeter('Affection', previous, person.bond.affection);
  return null;
}
