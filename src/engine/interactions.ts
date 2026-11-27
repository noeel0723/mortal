import { isTuitionDue } from './academics.ts';
import { clamp, record } from './journal.ts';
import { findContact, isCurrentClassContact, isPeer } from './school.ts';
import type { Contact, Effect, Life } from './types.ts';

type ContactGroup = 'parent' | 'peer' | 'educator';
type Rule = {
  groups: readonly ContactGroup[];
  age: number;
  energy: number;
  bond: Partial<Contact['bond']>;
  effects?: Effect;
  academic?: { performance: number; attendance: number; stress: number };
  text: (name: string) => string;
};

export const giftCost = 500;
const allowance = { 'working-class': 200, 'middle-income': 500, affluent: 800 };

export const relationshipActivities = {
  'ask-allowance': { groups: ['parent'], age: 8, energy: 5, bond: { familiarity: 2 }, text: (name) => `I received pocket money from ${name}.` },
  'thank-parent': { groups: ['parent'], age: 3, energy: 4, bond: { affection: 4, trust: 3 }, text: (name) => `I thanked ${name} for taking care of me.` },
  'family-time': { groups: ['parent'], age: 3, energy: 12, bond: { affection: 5, familiarity: 5 }, effects: { happiness: 5, stress: -4 }, text: (name) => `I spent an afternoon with ${name}.` },
  'ask-advice': { groups: ['parent'], age: 8, energy: 7, bond: { trust: 4, respect: 3 }, effects: { stress: -4, discipline: 1 }, text: (name) => `I asked ${name} for advice and felt better about what to do next.` },
  compliment: { groups: ['peer'], age: 6, energy: 4, bond: { affection: 4, respect: 2 }, text: (name) => `I gave ${name} a compliment.` },
  'hang-out': { groups: ['peer'], age: 6, energy: 12, bond: { affection: 5, familiarity: 6, compatibility: 2 }, effects: { happiness: 5, stress: -3 }, text: (name) => `I hung out with ${name}.` },
  'study-together': { groups: ['peer'], age: 6, energy: 10, bond: { trust: 3, familiarity: 3 }, academic: { performance: 3, attendance: 1, stress: -2 }, text: (name) => `I studied with ${name} and understood the material better.` },
  gift: { groups: ['parent', 'peer'], age: 8, energy: 5, bond: { affection: 5, trust: 2 }, effects: { bank: -giftCost }, text: (name) => `I bought a small gift for ${name}.` },
  'academic-help': { groups: ['educator'], age: 6, energy: 7, bond: { respect: 3, familiarity: 2 }, effects: { stress: -2 }, academic: { performance: 3, attendance: 2, stress: -4 }, text: (name) => `I asked ${name} for feedback on my coursework.` },
  'mentor-guidance': { groups: ['educator'], age: 12, energy: 7, bond: { trust: 3, respect: 4 }, effects: { discipline: 2, stress: -3 }, text: (name) => `I spoke with ${name} about what to focus on next.` },
  'thank-educator': { groups: ['educator'], age: 6, energy: 4, bond: { affection: 2, respect: 4 }, text: (name) => `I thanked ${name} for their help with my education.` },
} as const satisfies Record<string, Rule>;

export type RelationshipActivity = keyof typeof relationshipActivities;

export function contactGroup(person: Contact): ContactGroup {
  if (!('stage' in person)) return 'parent';
  return isPeer(person) ? 'peer' : 'educator';
}

export function contactIssue(life: Life, person: Contact) {
  if (!person.alive) return 'This person is no longer available.';
  if ('stage' in person && !person.friend && !isCurrentClassContact(life, person)) return 'This contact is from a previous class.';
  return null;
}

export function canStudyWith(life: Life, person: Contact) {
  return 'stage' in person && isCurrentClassContact(life, person);
}

function annualKey(activity: RelationshipActivity, id: string) {
  if (activity === 'academic-help') return 'academic-talk';
  if (activity === 'ask-allowance' || activity === 'study-together') return activity;
  return `${activity}:${id}`;
}

export function relationshipIssue(life: Life, person: Contact, activity: RelationshipActivity) {
  if (!Object.hasOwn(relationshipActivities, activity)) return 'This interaction is unavailable.';
  const rule: Rule = relationshipActivities[activity];
  const unavailable = contactIssue(life, person);
  if (unavailable) return unavailable;
  if (!rule.groups.includes(contactGroup(person))) return 'This interaction is unavailable for this relationship.';
  if (life.character.age < rule.age) return `Available from age ${rule.age}.`;
  if (activity === 'ask-allowance') {
    if (life.character.age >= 18) return 'Pocket money is available before age 18.';
    if (person.bond.trust < 45) return 'Build more trust before asking for pocket money.';
  }
  if (activity === 'gift' && life.character.bank < giftCost) return 'You cannot afford this gift.';
  if (rule.academic) {
    const enrollment = life.academic.enrollment;
    if (!enrollment || !canStudyWith(life, person)) return 'Available with your current class.';
    if (isTuitionDue(enrollment)) return 'Pay this year’s tuition to attend.';
  }
  if (life.usedActions.includes(annualKey(activity, person.id))) return 'Already done this year.';
  if (life.character.attributes.energy < rule.energy) return 'You need more energy.';
  return null;
}

export function performRelationshipActivity(life: Life, id: string, activity: RelationshipActivity) {
  const person = findContact(life, id);
  if (!person) return 'This person is no longer available.';
  const issue = relationshipIssue(life, person, activity);
  if (issue) return issue;
  const rule: Rule = relationshipActivities[activity];
  life.usedActions.push(annualKey(activity, id));
  for (const stat of Object.keys(rule.bond) as (keyof Contact['bond'])[]) {
    person.bond[stat] = clamp(person.bond[stat] + (rule.bond[stat] ?? 0));
  }
  const enrollment = life.academic.enrollment;
  if (enrollment && rule.academic) {
    enrollment.performance = clamp(enrollment.performance + rule.academic.performance);
    enrollment.performanceRecorded = true;
    enrollment.attendance = clamp(enrollment.attendance + rule.academic.attendance);
    enrollment.stress = clamp(enrollment.stress + rule.academic.stress);
  }
  record(life, rule.academic ? 'school' : contactGroup(person) === 'parent' ? 'family' : 'community', rule.text(person.name), {
    energy: -rule.energy, ...rule.effects,
    ...(activity === 'ask-allowance' ? { bank: allowance[life.character.background] } : {}),
  });
  return null;
}
