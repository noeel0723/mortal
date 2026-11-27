import { jobById } from '../data/jobs.ts';
import { skills } from '../data/skills.ts';
import { socialEventCatalog } from '../data/socialEvents.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp, record } from './journal.ts';
import { activeRomances, changeRomance, committedRomance, endRomance, loveIssue, romanceFor, romanceHistory } from './love.ts';
import { allContacts, ensureNpc, makeNpc, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import type { DatingSource, SocialAction, SocialEventId } from './socialTypes.ts';
import type { Life, LifeEvent } from './types.ts';

const matchIntroductions: Record<DatingSource, string> = {
  spotlight: 'through an app for local public figures', date: 'at a singles evening', app: 'through a local dating app',
  lgbtq: 'through an LGBTQ+ dating app', casual: 'at a café after arranging a casual date', matchmaking: 'through a local matchmaker',
};

export function isSocialEvent(id: string) {
  return socialEventCatalog.some((event) => event.id === id);
}

export function socialEventText(life: Life, event: LifeEvent) {
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  if (event.id === 'social-affair' && person) {
    const other = activeRomances(life).filter((entry) => entry.person !== person.id)
      .map((entry) => findContact(life, entry.person)).find((contact) => contact?.alive);
    if (other) return `${person.name} found out I was also dating ${other.name}. ${person.name} told me our relationship was over. How will I respond?`;
  }
  if (!person) return event.text;
  const identity = event.id === 'social-dating-match' || event.id === 'social-casual-match' ?
    `${person.name} (age ${person.age})` : person.name;
  return `${identity} ${event.text}`;
}

function queueSocialEvent(life: Life, id: SocialEventId, person: string) {
  const event = socialEventCatalog.find((item) => item.id === id)!;
  life.social.pendingPerson = person;
  life.pending = id;
  if (!life.seen.includes(id)) life.seen.push(id);
  record(life, event.category, socialEventText(life, event));
}

export function applyDatingMatch(life: Life, action: Extract<SocialAction, { type: 'dating-match' }>) {
  const issue = loveIssue(life, action);
  if (issue) return issue;
  const { source } = action;
  const random = npcRandom(life, `match:${source}`, life.year);
  const person = makeNpc(life, `npc-dating-${life.year}`, Math.min(114,
    Math.max(source === 'spotlight' ? 22 : 18, life.character.age + random.integer(-4, 4))), 'Acquaintance');
  life.social.people.push(person);
  const profile = ensureNpc(life, person);
  profile.preferences = [...new Set([life.character.gender, ...(source === 'lgbtq' ? [person.gender] : profile.preferences)])];
  if (source === 'spotlight') {
    const job = jobById.get('graphic-designer')!;
    Object.assign(profile, { status: 'employed', job: job.id, income: job.salary[0], education: 'Undergraduate' });
    person.occupation = job.title;
  }
  const hobby = source === 'matchmaking' ? life.skills.hobbies.find((id) => skills[id].age <= person.age) : undefined;
  if (hobby) profile.interests = [hobby, ...profile.interests.filter((item) => item !== hobby).slice(0, 1)];
  const note = source === 'spotlight' ? ' They were featured in a recent local arts showcase.' :
    hobby ? ` The matchmaker introduced us because we both enjoy ${skills[hobby].name}.` : '';
  const story = `I met ${person.name} ${matchIntroductions[source]}.${note}`;
  life.usedActions.push('dating-match');
  remember(life, person, story);
  record(life, 'community', story);
  queueSocialEvent(life, source === 'casual' ? 'social-casual-match' : 'social-dating-match', person.id);
  return null;
}

export function offerSocialEvent(life: Life) {
  if (life.pending || life.character.age < 8 || life.character.causeOfDeath) return;
  const romances = activeRomances(life).filter(({ person }) => findContact(life, person)?.alive);
  if (romances.length > 1) {
    const discovery = npcRandom(life, 'romance-discovery', life.year);
    const discoverer = romances[discovery.integer(0, romances.length - 1)]!;
    const person = findContact(life, discoverer.person)!;
    const risk = Math.max(12, Math.min(60, 25 + (romances.length - 2) * 8 + (50 - person.bond.trust) * .2));
    if (discovery.next() * 100 < risk) {
      queueSocialEvent(life, 'social-affair', person.id);
      return;
    }
  }
  const random = npcRandom(life, 'social-event', life.year);
  if (random.next() >= .23) return;
  const possibilities: { person: string; event: SocialEventId }[] = [];
  for (const romance of romances) {
    const partner = findContact(life, romance.person);
    if (partner?.alive) {
      const profile = ensureNpc(life, partner);
      if (romance.status === 'dating' && !committedRomance(life) && life.year > romance.started && partner.bond.trust >= 55 &&
        random.next() < (profile.traits.confidence + profile.traits.loyalty) / 300) {
        possibilities.push({ person: partner.id, event: 'social-proposal' });
      }
      if (life.year - profile.lastInteraction >= 2 || partner.bond.resentment >= 32) possibilities.push({ person: partner.id, event: 'social-time' });
      if (romance.status === 'married' && profile.savings < 20000) possibilities.push({ person: partner.id, event: 'social-finances' });
    }
  }
  const parent = life.family.find((person) => person.alive && ensureNpc(life, person).savings < 16000);
  if (parent && life.character.age >= 18 && life.character.bank >= 1200) possibilities.push({ person: parent.id, event: 'social-support' });
  const child = life.social.people.find((person) => person.role === 'Child' && person.alive && person.age >= 6 && person.age < 18);
  if (child) possibilities.push({ person: child.id, event: 'social-school' });
  const friend = allContacts(life).find((person) => 'friend' in person && person.friend && person.alive &&
    !ensureNpc(life, person).formerFriend && person.city === life.character.city &&
    npcRandom(life, `invite:${person.id}`, life.year).next() < ensureNpc(life, person).traits.sociability / 120);
  if (friend) possibilities.push({ person: friend.id, event: 'social-dinner' });
  const selection = possibilities[random.integer(0, Math.max(0, possibilities.length - 1))];
  if (!selection) return;
  queueSocialEvent(life, selection.event, selection.person);
}

export function answerSocialEvent(life: Life, id: string, choice: string) {
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  life.social.pendingPerson = null;
  if (!person?.alive) return;
  const accepted = choice === 'accept';
  if (id === 'social-dating-match' || id === 'social-casual-match') {
    const dating = id === 'social-dating-match';
    const text = !accepted ? `I thanked ${person.name} for the invitation and decided to pass.` : dating ?
      `${person.name} and I agreed to start dating.` : `I went on a casual date with ${person.name}. We enjoyed the evening and left things there.`;
    if (accepted) {
      person.bond.affection = clamp(person.bond.affection + 6);
      person.bond.trust = clamp(person.bond.trust + 3);
      if (dating) changeRomance(life, person.id, 'dating', text);
    }
    remember(life, person, text);
    if (accepted) recordNotice(life, 'community', dating ? 'Dating Now' : 'A Casual Date', text, { happiness: 4 });
    else record(life, 'decision', text);
    return;
  }
  if (id === 'social-affair') {
    const honest = choice === 'apologize';
    const married = romanceFor(life, person.id)?.status === 'married';
    const response = honest ? `I took responsibility and apologized to ${person.name}.` :
      `I denied it, but ${person.name} did not believe me.`;
    const text = `${response} ${married ? 'We divorced and settled our shared expenses.' : 'Our relationship ended.'}`;
    const settlement = endRomance(life, person, text);
    person.bond.trust = clamp(person.bond.trust - (honest ? 16 : 30));
    person.bond.resentment = clamp(person.bond.resentment + (honest ? 12 : 27));
    remember(life, person, text, true);
    recordNotice(life, 'community', married ? 'Marriage Ended' : 'Relationship Ended', text,
      { bank: -settlement, happiness: honest ? -5 : -9, stress: honest ? 3 : 6 }, 'relationships');
    return;
  }
  const profile = ensureNpc(life, person);
  const cost = accepted && id === 'social-support' ? Math.min(life.character.bank, 1200) : 0;
  profile.savings += cost;
  if (accepted && id === 'social-finances') profile.commitments = Math.max(0, profile.commitments - 600);
  const child = life.social.children[person.id];
  if (accepted && id === 'social-school' && child) child.learning = clamp(child.learning + 4);
  person.bond.trust = clamp(person.bond.trust + (accepted ? 5 : -2));
  person.bond.affection = clamp(person.bond.affection + (accepted ? 4 : -2));
  if (accepted && id === 'social-time') person.bond.resentment = clamp(person.bond.resentment - 7);
  const stories: Record<string, string> = {
    'social-dinner': `I accepted ${person.name}’s invitation and we had dinner together.`,
    'social-time': `I set some time aside for ${person.name} and we talked about how we had been feeling.`,
    'social-proposal': `I accepted ${person.name}’s proposal. We are engaged.`,
    'social-support': `I helped ${person.name} cover part of their household expenses.`,
    'social-school': `I worked through the assignment with ${person.name}.`,
    'social-finances': `I made a household budget with ${person.name} and we reduced some commitments.`,
  };
  const text = accepted ? stories[id]! : `I told ${person.name} I would rather wait. We agreed to leave it for now.`;
  if (accepted && id === 'social-proposal') changeRomance(life, person.id, 'engaged', text);
  else romanceHistory(life, person.id, text);
  remember(life, person, text);
  record(life, 'decision', text, { bank: -cost, happiness: accepted ? 3 : 0 }, 'relationships');
}
