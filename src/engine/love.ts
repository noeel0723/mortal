import { recordNotice, resultMeter } from './eventNotices.ts';
import { meetInLaws } from './familyNetwork.ts';
import { householdFor, settleHousehold } from './household.ts';
import { compatibleGoals, datingGoals, datingIntent, isDatingApp, playerDatingProfile, validDatingPreferences } from './dating.ts';
import { firstDateIssue, firstDateOutcome, firstDatePrice } from './firstDates.ts';
import { interestsMatch, sharedHobbies } from './hobbies.ts';
import { clamp } from './journal.ts';
import { loveSearchIssue } from './loveSearch.ts';
import { meetingIssue, startMeeting } from './meetings.ts';
import { ensureNpc, isFamily, newPeopleLimit, npcProfile, npcRandom, remember } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { findContact } from './school.ts';
import { agreementFor, attraction, boundaryEvidence, inPersonIssue, meaningfulTime, openConcern, recentConnections, relationshipEnded, relationshipMemory,
  restartRelationship, responseScale, takingSpace, trackConnection, visibleConcerns } from './relationships.ts';
import type { RelationshipState } from './relationshipTypes.ts';
import { pickStory } from './stories.ts';
import { activeRomanceStatuses, dateTiers, datingSources, paidRomanticActivities } from './socialTypes.ts';
import type { DateTier, PaidRomanticActivity, Romance, SocialAction } from './socialTypes.ts';
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
  dinner: { label: 'Have Dinner Together', cost: 650, affection: 6, trust: 2 },
  movie: { label: 'Watch a Movie', cost: 400, affection: 4, trust: 1 },
  support: { label: 'Offer Support', cost: 0, affection: 3, trust: 5 },
  future: { label: 'Discuss the Future', cost: 0, affection: 2, trust: 4 },
  apologize: { label: 'Apologize', cost: 0, affection: 2, trust: 3 },
} as const;

type DateOption = { label: string; scene: string; interests: readonly string[]; sociability: number };
export const partnerDateOptions = {
  date: {
    simple: { label: 'Coffee for Two', scene: 'shared a small table at a coffee shop', interests: ['coffee', 'reading', 'cooking'], sociability: 35 },
    standard: { label: 'Gallery Outing', scene: 'took an afternoon to explore a gallery', interests: ['art', 'sketching', 'photography'], sociability: 52 },
    premium: { label: 'Concert Night', scene: 'went to a live concert', interests: ['music', 'singing'], sociability: 78 },
  },
  dinner: {
    simple: { label: 'Neighborhood Diner', scene: 'grabbed a booth at the neighborhood diner', interests: ['cooking', 'coffee'], sociability: 45 },
    standard: { label: 'Bistro Dinner', scene: 'split a few dishes at a bistro', interests: ['cooking', 'baking', 'travel'], sociability: 55 },
    premium: { label: 'Fine Dining', scene: 'tried fine dining with a seasonal tasting menu', interests: ['cooking', 'foreign-languages'], sociability: 64 },
  },
  movie: {
    simple: { label: 'Matinee Tickets', scene: 'saw a comedy at a quiet matinee', interests: ['film', 'acting', 'writing'], sociability: 35 },
    standard: { label: 'Evening Screening', scene: 'went to an evening screening of an animated film', interests: ['film', 'drawing', 'sketching'], sociability: 54 },
    premium: { label: 'Premium Seats', scene: 'watched a crowded action premiere from premium seats', interests: ['film', 'photography', 'gaming'], sociability: 76 },
  },
} satisfies Record<PaidRomanticActivity, Record<DateTier, DateOption>>;

const tierMultipliers: Record<DateTier, number> = { simple: .5, standard: 1, premium: 2.5 };
export const isPaidRomanticActivity = (action: string): action is PaidRomanticActivity =>
  paidRomanticActivities.some((kind) => kind === action);

export function partnerDatePrice(life: Life, person: Contact, activity: PaidRomanticActivity, tier: DateTier = 'standard') {
  return localExpense(life.world, person.city, Math.round(dateActivities[activity].cost * tierMultipliers[tier]));
}

export function partnerDateOutcome(life: Life, person: Contact, activity: PaidRomanticActivity, tier: DateTier = 'standard') {
  const option = partnerDateOptions[activity][tier];
  const { traits, interests } = npcProfile(life, person);
  const { health, stress } = life.character.attributes;
  const { compatibility, trust, resentment } = person.bond;
  const interest = interestsMatch(interests, option.interests);
  const shared = interest && interestsMatch(life.skills.hobbies, option.interests);
  const concern = visibleConcerns(life, person.id)[0]?.severity ?? 0;
  const random = npcRandom(life, `outing:${person.id}:${activity}:${tier}:${life.journal.length}`, life.year);
  const quality = Math.max(4, Math.min(97, Math.round(35 + compatibility * .18 + trust * .07 + traits.empathy * .05 +
    (health + person.health - 120) * .10 + (shared ? 24 : interest ? 17 : 0) - stress * .20 - resentment * .22 - concern * .15 -
    Math.abs(traits.sociability - option.sociability) * .25 - recentConnections(life, person.id) + random.integer(-24, 24))));
  const reception: [string, string] = quality >= 80 ? ['We got so caught up in it that neither of us checked the time.', 'We kept talking about our favorite parts afterward.'] :
    quality >= 62 ? ['We enjoyed ourselves and said we’d do it again sometime.', 'It put us both in a good mood.'] :
      quality >= 42 ? ['We had an okay time, though we’d probably pick something different next time.', 'There were a few good moments, but it didn’t really click.'] :
        ['It wasn’t their kind of outing. We called it a night early.', 'Things felt awkward, and we were ready to go home by the end.'];
  return { quality, story: `${person.name} and I ${option.scene}. ${random.pick(reception)}` };
}

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
  const profile = ensureNpc(life, person);
  if (divorce) settleHousehold(life, person);
  if (profile.datingGoal && (reason === 'betrayal' || reason === 'conflict')) profile.datingGoal = 'not-looking';
  changeRomance(life, person.id, divorce ? 'divorced' : 'broken-up', text);
  person.bond.affection = clamp(person.bond.affection - 12);
  relationshipEnded(life, person.id, reason);
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

export function loveIssue(life: Life, action: LoveAction, checkPartnerPrice = true): string | null {
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
  if ((isPaidRomanticActivity(kind) || kind === 'propose') && inPersonIssue(life, person)) {
    return inPersonIssue(life, person);
  }
  if ('tier' in action && action.tier !== undefined && !dateTiers.includes(action.tier)) return 'Choose a valid option.';
  if (checkPartnerPrice && isPaidRomanticActivity(kind) &&
    life.character.bank < partnerDatePrice(life, person, kind, 'tier' in action ? action.tier : undefined)) {
    return 'Your balance does not cover this activity.';
  }
  return null;
}

function partnerConversationStory(life: Life, person: Contact, action: 'support' | 'future' | 'apologize') {
  const { name } = person;
  const stories = {
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
  let title: string;
  let story: string;
  let effect: Effect = {};
  let experience: { label: string; quality: number } | undefined;
  if (action.type === 'wedding') {
    const plan = weddingPlans[action.plan];
    title = 'Wedding Day';
    story = `I married ${person.name} at our ${plan.label.toLowerCase()}.`;
    changeRomance(life, person.id, 'married', story);
    meetInLaws(life, person);
    householdFor(life, person);
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
      experience = { label: 'Date Quality', quality: date.quality };
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
      effect = { bank: -firstDatePrice(life, person, venue), happiness: warmth };
    } else if (accepted) {
      story = `${person.name} accepted my proposal.`;
      changeRomance(life, person.id, 'engaged', story);
      person.bond.affection = clamp(previous + 4);
      effect = { happiness: 4 };
    } else {
      story = proposing ? `${person.name} said they were not ready to get engaged.` :
        !intention.allowed ? `${person.name} said they aren’t looking to date right now. I respected their answer.` :
          `${person.name} declined my invitation. I respected their answer.`;
      if (!romanceFor(life, person.id)) changeRomance(life, person.id, 'interest', story);
      else romanceHistory(life, person.id, story);
      effect = { happiness: -2 };
    }
  } else if (action.action === 'breakup' || action.action === 'divorce') {
    const divorce = action.action === 'divorce';
    title = divorce ? 'Divorce' : 'Breakup';
    story = divorce ? `${person.name} and I divorced and finalized our household arrangements.` : `I ended my relationship with ${person.name}.`;
    endRomance(life, person, story);
    effect = { happiness: -5 };
  } else if (isPaidRomanticActivity(action.action)) {
    const { action: activity } = action;
    const tier = 'tier' in action ? action.tier : undefined;
    const outing = partnerDateOutcome(life, person, activity, tier);
    const warmth = outing.quality >= 80 ? 6 : outing.quality >= 62 ? 3 : outing.quality >= 42 ? 0 : -3;
    title = dateActivities[activity].label;
    story = outing.story;
    const label = { date: 'Date Enjoyment', dinner: 'Dinner Enjoyment', movie: 'Movie Enjoyment' }[activity];
    experience = { label, quality: outing.quality };
    trackConnection(life, person.id);
    person.bond.affection = clamp(previous + warmth);
    person.bond.trust = clamp(person.bond.trust + (warmth === 6 ? 2 : 0));
    if (warmth > 0) meaningfulTime(life, person, 'time', 4);
    if (activity === 'date') boundaryEvidence(life, [person.id], 'date');
    romanceHistory(life, person.id, story);
    effect = { bank: -partnerDatePrice(life, person, activity, tier), happiness: Math.sign(warmth) * 2 };
  } else {
    const item = dateActivities[action.action];
    title = item.label;
    story = partnerConversationStory(life, person, action.action);
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
    } else if (action.action === 'future' && Math.abs(profile.traits.ambition - life.character.attributes.discipline) >= 45) {
      openConcern(life, person.id, 'goals', 38);
    }
    romanceHistory(life, person.id, story);
    effect = { happiness: Math.round(3 * resistance) };
  }
  remember(life, person, story);
  const notice = recordNotice(life, 'community', title, story, effect, 'relationships');
  if (action.type === 'wedding') notice.details = { kind: 'wedding-names', person: person.id };
  else if (experience) notice.meter = resultMeter(experience.label, experience.quality, experience.quality);
  else notice.meter = resultMeter('Affection', previous, person.bond.affection);
  return null;
}
