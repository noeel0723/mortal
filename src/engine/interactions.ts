import { isTuitionDue } from './academics.ts';
import { applyCareerEffect } from './career.ts';
import { eventTitle, recordNotice, resultMeter } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { interactionStory } from './relationshipStories.ts';
import { communicationEnded, inPersonIssue, knownRelationship, meaningfulTime, openConcern, takingSpace, trackConnection } from './relationships.ts';
import { friendshipExperience } from './friendships.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import { ensureNpc, isParent, npcProfile, remember } from './npcs.ts';
import { findContact, isCurrentClassContact, isPeer } from './school.ts';
import { isWorkAcquaintance, isWorkContact } from './workplace.ts';
import type { Contact, Effect, Life } from './types.ts';

type ContactGroup = 'parent' | 'peer' | 'educator' | 'worker';
type Rule = {
  groups: readonly ContactGroup[];
  age: number;
  bond: Partial<Contact['bond']>;
  effects?: Effect;
  academic?: { performance: number; attendance: number; stress: number };
  title: string;
};

const allowance = { 'working-class': 200, 'middle-income': 500, affluent: 800 };

export const relationshipActivities = {
  'ask-allowance': { groups: ['parent'], age: 8, bond: { familiarity: 2 }, title: 'Pocket Money' },
  'thank-parent': { groups: ['parent'], age: 3, bond: { affection: 4, trust: 3 }, title: 'A Word of Thanks' },
  'family-time': { groups: ['parent'], age: 3, bond: { affection: 5, familiarity: 5 }, effects: { happiness: 5, stress: -4 }, title: 'Time Together' },
  'ask-advice': { groups: ['parent'], age: 8, bond: { trust: 4, respect: 3 }, effects: { stress: -4, discipline: 1 }, title: 'A Little Advice' },
  compliment: { groups: ['parent', 'peer', 'educator', 'worker'], age: 6, bond: { affection: 4, respect: 2 }, title: 'A Kind Word' },
  'hang-out': { groups: ['peer'], age: 6, bond: { affection: 5, familiarity: 6, compatibility: 2 }, effects: { happiness: 5, stress: -3 }, title: 'Time Together' },
  'study-together': { groups: ['peer'], age: 6, bond: { trust: 3, familiarity: 3 }, academic: { performance: 3, attendance: 1, stress: -2 }, title: 'Study Partners' },
  'academic-help': { groups: ['educator'], age: 6, bond: { respect: 3, familiarity: 2 }, effects: { stress: -2 }, academic: { performance: 3, attendance: 2, stress: -4 }, title: 'Help with Coursework' },
  'mentor-guidance': { groups: ['educator'], age: 12, bond: { trust: 3, respect: 4 }, effects: { discipline: 2, stress: -3 }, title: 'Mentor Guidance' },
  'thank-educator': { groups: ['educator'], age: 6, bond: { respect: 4, affection: 2 }, title: 'A Word of Thanks' },
  'work-break': { groups: ['worker'], age: 18, bond: { affection: 4, familiarity: 5 }, effects: { happiness: 4, stress: -3 }, title: 'Time Together' },
  'discuss-work': { groups: ['worker'], age: 18, bond: { respect: 3, trust: 3 }, title: 'A Work Discussion' },
  insult: { groups: ['parent', 'peer', 'educator', 'worker'], age: 6, bond: { affection: -8, trust: -5, respect: -6, resentment: 7 }, effects: { reputation: -2, stress: 3 }, title: 'Words That Hurt' },
  'mess-with': { groups: ['parent', 'peer', 'educator', 'worker'], age: 6, bond: { affection: -4, trust: -4, resentment: 5 }, effects: { reputation: -1 }, title: 'A Joke Gone Wrong' },
} as const satisfies Record<string, Rule>;

export type RelationshipActivity = keyof typeof relationshipActivities;

export function contactGroup(person: Contact): ContactGroup {
  if (isWorkContact(person)) return 'worker';
  if ('hobby' in person) return 'peer';
  if (!('stage' in person)) return 'friend' in person ? 'peer' : 'parent';
  return isPeer(person) ? 'peer' : 'educator';
}

export function contactIssue(life: Life, person: Contact) {
  if (!person.alive) return 'This person is no longer available.';
  if (communicationEnded(life, person.id)) return 'Communication with this person has ended.';
  if (isWorkContact(person) && !person.friend && !isWorkAcquaintance(person) &&
    person.employerId !== life.career.current?.employerId) return 'This contact is from a previous workplace.';
  if ('stage' in person && !person.friend && !isCurrentClassContact(life, person)) return 'This contact is from a previous class.';
  return null;
}

export function canStudyWith(life: Life, person: Contact) {
  return 'stage' in person && isCurrentClassContact(life, person);
}

export function relationshipIssue(life: Life, person: Contact, activity: RelationshipActivity) {
  if (!Object.hasOwn(relationshipActivities, activity)) return 'This interaction is unavailable.';
  const rule: Rule = relationshipActivities[activity];
  const unavailable = contactIssue(life, person);
  if (unavailable) return unavailable;
  if (takingSpace(life, person.id)) return 'They’ve asked for time apart.';
  if (!rule.groups.includes(contactGroup(person))) return 'This interaction is unavailable for this relationship.';
  if (life.character.age < rule.age) return `Available from age ${rule.age}.`;
  if (['family-time', 'hang-out', 'study-together', 'work-break', 'mess-with'].includes(activity)) {
    const location = inPersonIssue(life, person);
    if (location) return location;
  }
  if (activity === 'ask-allowance') {
    if (!isParent(life, person.id)) return 'Only a parent can give an allowance.';
    if (life.character.age >= 18) return 'Pocket money is available before age 18.';
    if (person.bond.trust < 45) return 'Build more trust before asking for pocket money.';
    if (npcProfile(life, person).savings < allowance[life.character.background]) return 'They cannot afford pocket money right now.';
  }
  if (activity === 'discuss-work' && (!isWorkContact(person) || person.employerId !== life.career.current?.employerId)) return 'Available with your current workplace.';
  if (rule.academic) {
    const enrollment = life.academic.enrollment;
    if (!enrollment || !canStudyWith(life, person)) return 'Available with your current class.';
    if (isTuitionDue(enrollment)) return 'Pay this year’s tuition to attend.';
  }
  return null;
}

export function performRelationshipActivity(life: Life, id: string, activity: RelationshipActivity) {
  const person = findContact(life, id);
  if (!person) return 'This person is no longer available.';
  const issue = relationshipIssue(life, person, activity);
  if (issue) return issue;
  const rule: Rule = relationshipActivities[activity];
  const stats = Object.keys(rule.bond) as (keyof Contact['bond'])[];
  const tracked = stats[0]!;
  const previous = person.bond[tracked];
  const profile = ensureNpc(life, person);
  const conflict = activity === 'insult' || activity === 'mess-with';
  const occasion = { key: activity, demanding: activity === 'family-time' || activity === 'hang-out' };
  const unavailable = conflict ? null : availability(life, person, occasion);
  trackConnection(life, person.id);
  if (unavailable) {
    const story = `I reached out to ${person.name}. ${unavailable.reason} ${unavailable.alternative ?? ''}`.trim();
    recordNotice(life, 'community', 'Maybe Another Time', story);
    return null;
  }
  const outcome = contextualOutcome(life, person, occasion);
  const reception = conflict ? 1 : outcome.weight;
  for (const stat of stats) {
    person.bond[stat] = clamp(person.bond[stat] + Math.round((rule.bond[stat] ?? 0) * reception));
  }
  const enrollment = life.academic.enrollment;
  if (enrollment && rule.academic) {
    enrollment.performance = clamp(enrollment.performance + rule.academic.performance);
    enrollment.performanceRecorded = true;
    enrollment.attendance = clamp(enrollment.attendance + rule.academic.attendance);
    enrollment.stress = clamp(enrollment.stress + rule.academic.stress);
  }
  const group = contactGroup(person);
  if (knownRelationship(life, person)) {
    if (conflict || reception <= -.60) openConcern(life, id, 'argument', Math.min(75, 25 + person.bond.resentment));
    else if (reception > 0 && ['family-time', 'hang-out', 'work-break', 'study-together'].includes(activity)) meaningfulTime(life, person, 'time', 5);
  }
  if (activity === 'ask-allowance') profile.savings -= allowance[life.character.background];
  if (activity === 'discuss-work') applyCareerEffect(life, { performance: 4, stress: -2 });
  if (isWorkContact(person) && person.employerId === life.career.current?.employerId && conflict) {
    applyCareerEffect(life, { security: activity === 'insult' ? -9 : -5, reputation: -3 });
  }
  const story = interactionStory(life, person, activity) + (conflict ? '' : ` ${outcome.note}`);
  remember(life, person, story, conflict || reception <= -.60);
  if (!conflict) friendshipExperience(life, person, reception);
  const effects = { ...rule.effects };
  if (!conflict && effects.happiness !== undefined) effects.happiness = Math.round(effects.happiness * reception);
  if (!conflict && effects.stress !== undefined) effects.stress = Math.round(effects.stress * reception);
  const notice = recordNotice(life, rule.academic ? 'school' : group === 'parent' ? 'family' : group === 'worker' ? 'career' : 'community',
    rule.title, story, {
    ...effects,
    ...(activity === 'ask-allowance' ? { bank: allowance[life.character.background] } : {}),
  });
  notice.meter = resultMeter(eventTitle(tracked), previous, person.bond[tracked]);
  return null;
}
