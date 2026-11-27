import { recordNotice, resultMeter } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { ensureNpc, isFamily, makeNpc, newPeopleLimit, npcProfile, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import { pickStory } from './stories.ts';
import type { Romance, SocialAction } from './socialTypes.ts';
import type { Contact, Effect, Life } from './types.ts';

export const romanceLabels: Record<Romance['status'], string> = {
  interest: 'Romantic Interest', dating: 'Dating', engaged: 'Engaged', married: 'Married',
  'broken-up': 'Former Partner', divorced: 'Former Spouse', widowed: 'Late Partner',
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

export type LoveAction = Extract<SocialAction, { type: 'meet' | 'romance' | 'wedding' }>;
const activeStatuses = ['dating', 'engaged', 'married'];
export const romanceFor = (life: Life, id: string) => life.social.romances.find(({ person }) => person === id);
export const activeRomance = (life: Life) => life.social.romances.find(({ status }) => activeStatuses.includes(status));

export function romanceHistory(life: Life, id: string, text: string) {
  const romance = romanceFor(life, id);
  if (romance) romance.history = [...romance.history.slice(-29), { year: life.year, text }];
}

export function changeRomance(life: Life, id: string, status: Romance['status'], text: string) {
  let romance = romanceFor(life, id);
  if (!romance) {
    romance = { person: id, status, started: life.year, engagement: null, wedding: null, ended: null, history: [] };
    life.social.romances.push(romance);
  }
  if (romance.ended !== null && (status === 'interest' || status === 'dating')) {
    Object.assign(romance, { started: life.year, engagement: null, wedding: null, ended: null });
  }
  romance.status = status;
  if (status === 'engaged') romance.engagement = life.year;
  if (status === 'married') romance.wedding = life.year;
  if (status === 'broken-up' || status === 'divorced' || status === 'widowed') romance.ended = life.year;
  romanceHistory(life, id, text);
}

function related(life: Life, id: string) {
  return isFamily(life, id) || !!life.social.parents['self']?.some((parent) => life.social.parents[id]?.includes(parent));
}

export function datingCompatibility(life: Life, person: Contact) {
  const { compatibility, affection, familiarity } = person.bond;
  const profile = npcProfile(life, person);
  return clamp(Math.round(compatibility * .6 + affection * .17 + familiarity * .12 + profile.traits.empathy * .11));
}

function loveKey(action: Exclude<LoveAction, { type: 'meet' }>) {
  if (action.type === 'wedding') return 'wedding';
  // Share a cooldown across all advances, including advances to a different person.
  return action.action === 'ask' || action.action === 'propose' ? 'romantic-advance' : `romance-${action.action}`;
}

export function loveIssue(life: Life, action: LoveAction): string | null {
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (action.type === 'meet') {
    const dating = action.source === 'date' || action.source === 'app';
    if (life.character.age < (dating ? 18 : 8)) return dating ? 'Dating opens at age 18.' : 'Available from age 8.';
    if (dating && activeRomance(life)) return 'You already have a partner.';
    if (life.social.people.filter(({ role }) => role === 'Acquaintance').length >= newPeopleLimit - 8) return 'Your social circle is full.';
    return life.usedActions.includes('meet-new-person') ? 'You already met someone new this year.' : null;
  }
  const person = findContact(life, action.person);
  if (!person?.alive) return 'This person is unavailable.';
  if (life.character.age < 18 || person.age < 18) return 'Both people must be adults.';
  const romance = romanceFor(life, person.id);
  if (life.usedActions.includes(loveKey(action))) return 'Available again next year.';
  if (action.type === 'wedding') {
    if (romance?.status !== 'engaged') return 'You need to be engaged first.';
    return life.character.bank < weddingPlans[action.plan].cost ? 'Your balance does not cover this wedding.' : null;
  }
  const kind = action.action;
  if (kind === 'interest' || kind === 'ask') {
    if (related(life, person.id)) return 'Dating is unavailable with relatives.';
    if (activeRomance(life)) return 'You already have a partner.';
    if (person.city !== life.character.city) return 'This person lives in another city.';
    if (npcProfile(life, person).localPartner) return 'This person is seeing someone.';
    if (kind === 'interest' && romance?.status === 'interest') return 'You already marked this interest.';
  } else if (!romance || !activeStatuses.includes(romance.status)) return 'Available with your current partner.';
  else if (kind === 'propose' && romance.status !== 'dating') return 'Available while dating.';
  else if (kind === 'divorce' && romance.status !== 'married') return 'Available while married.';
  else if (kind === 'breakup' && romance.status === 'married') return 'Use Divorce to end a marriage.';
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

export function applyLove(life: Life, action: LoveAction) {
  const issue = loveIssue(life, action);
  if (issue) return issue;
  if (action.type === 'meet') {
    const age = life.character.age;
    const random = npcRandom(life, 'new-person', life.year);
    const dating = action.source === 'date' || action.source === 'app';
    const person = makeNpc(life, `npc-meet-${life.year}`, Math.min(102,
      Math.max(dating ? 18 : 8, age + random.integer(-3, 3))), 'Acquaintance');
    life.social.people.push(person);
    ensureNpc(life, person);
    life.usedActions.push('meet-new-person');
    const where = { date: 'at a singles event', app: 'through the dating app', hobbies: 'at a hobby group', neighborhood: 'in my neighborhood' };
    const story = `I met ${person.name} ${where[action.source]} and got to know them a little.`;
    remember(life, person, story);
    recordNotice(life, 'community', 'Someone New', story, { happiness: 2 });
    return null;
  }
  const person = findContact(life, action.person)!;
  const profile = ensureNpc(life, person);
  const previous = person.bond.affection;
  life.usedActions.push(loveKey(action));
  let title: string;
  let story: string;
  let effect: Effect = {};
  if (action.type === 'wedding') {
    const plan = weddingPlans[action.plan];
    title = 'Wedding Day';
    story = `I married ${person.name} at our ${plan.label.toLowerCase()}.`;
    changeRomance(life, person.id, 'married', story);
    person.bond.affection = clamp(previous + 6);
    effect = { bank: -plan.cost, happiness: 8 };
  } else if (action.action === 'interest') {
    title = 'Romantic Interest';
    story = `I realized I was interested in getting to know ${person.name} better.`;
    changeRomance(life, person.id, 'interest', story);
  } else if (action.action === 'ask' || action.action === 'propose') {
    const proposing = action.action === 'propose';
    const compatible = profile.preferences.includes(life.character.gender);
    const recent = Math.min(6, Math.max(0, life.year - profile.lastInteraction));
    const history = Math.min(10, profile.conflicts * 2);
    const chance = Math.max(5, Math.min(88, datingCompatibility(life, person) * .55 + person.bond.trust * .37 +
      profile.traits.confidence * .12 - person.bond.resentment * .25 - recent * 2 - history - (proposing ? 17 : 0)));
    const accepted = compatible && !profile.localPartner && npcRandom(life, `advance:${person.id}`, life.year).next() * 100 < chance;
    title = accepted ? proposing ? 'Engaged' : 'A First Date' : proposing ? 'Proposal Declined' : 'Date Declined';
    story = accepted ? proposing ? `${person.name} accepted my proposal.` : `${person.name} agreed to go out with me. We decided to start dating.` :
      proposing ? `${person.name} said they were not ready to get engaged.` : `${person.name} declined my invitation. I respected their answer.`;
    if (accepted) {
      changeRomance(life, person.id, proposing ? 'engaged' : 'dating', story);
      person.bond.affection = clamp(previous + 4);
    } else {
      if (!romanceFor(life, person.id)) changeRomance(life, person.id, 'interest', story);
      else romanceHistory(life, person.id, story);
    }
    effect = { energy: -6, happiness: accepted ? 4 : -2 };
  } else if (action.action === 'breakup' || action.action === 'divorce') {
    const divorce = action.action === 'divorce';
    const settlement = divorce ? Math.min(5000, Math.floor(life.character.bank * .08)) : 0;
    profile.savings += settlement;
    title = divorce ? 'Divorce' : 'Breakup';
    story = divorce ? `${person.name} and I divorced and settled our shared expenses.` : `I ended my relationship with ${person.name}.`;
    changeRomance(life, person.id, divorce ? 'divorced' : 'broken-up', story);
    person.bond.affection = clamp(previous - 12);
    effect = { bank: -settlement, happiness: -5 };
  } else {
    const item = dateActivities[action.action];
    title = item.label;
    story = dateStory(life, person, action.action);
    const strained = action.action !== 'apologize' && person.bond.resentment > 45 &&
      npcRandom(life, `${person.id}:${action.action}`, life.year).next() > profile.traits.empathy / 100;
    const resistance = strained ? .5 : 1;
    if (strained) story += ' The tension between us made it hard to relax.';
    person.bond.affection = clamp(previous + Math.round(item.affection * resistance));
    person.bond.trust = clamp(person.bond.trust + Math.round(item.trust * resistance));
    if (action.action === 'apologize') person.bond.resentment = clamp(person.bond.resentment - 10);
    romanceHistory(life, person.id, story);
    effect = { bank: -item.cost, energy: -6, happiness: strained ? 0 : 3 };
  }
  remember(life, person, story);
  const notice = recordNotice(life, 'community', title, story, effect, 'relationships');
  notice.meter = resultMeter('Affection', previous, person.bond.affection);
  return null;
}
