import { eventById, events } from '../data/events.ts';
import { educationLabels } from '../data/veyra.ts';
import { seededRandom } from './random.ts';
import { createSchoolClass, educationAt, findContact, isSchoolStage } from './school.ts';
import { stats } from './types.ts';
import type { Action, Category, Contact, Effect, Life } from './types.ts';

export const maxAge = 115;
export const clamp = (value: number) => Math.max(0, Math.min(100, value));
export const friendshipEnergyCost = 6;

export const activities = {
  read: { age: 5, energy: 10, effects: { smarts: 3, happiness: 2 }, text: 'I spent an afternoon with a good book.' },
  rest: { age: 4, energy: 0, effects: { energy: 20, stress: -8 }, text: 'I cleared my schedule and gave myself time to rest.' },
  walk: { age: 4, energy: 9, effects: { health: 3, stress: -3 }, text: 'I went for a long walk around my neighborhood.' },
  study: { age: 6, energy: 16, effects: { smarts: 4, discipline: 3, stress: 3 }, text: 'I spent extra time reviewing my schoolwork.' },
} as const;
type Activity = keyof typeof activities;

function record(life: Life, category: Category, text: string, effects: Effect = {}) {
  const changes: Effect = {};
  const character = life.character;
  for (const stat of stats) {
    const previous = character.attributes[stat];
    character.attributes[stat] = clamp(previous + (effects[stat] ?? 0));
    if (character.attributes[stat] !== previous) changes[stat] = character.attributes[stat] - previous;
  }
  const delta = Math.max(-character.bank, effects.bank ?? 0);
  if (delta !== 0) {
    character.bank += delta;
    changes.bank = delta;
    life.transactions.push({ year: life.year, label: text, amount: delta });
  }
  life.journal.push({ age: character.age, category, text, changes });
}

function ageUp(life: Life) {
  const random = seededRandom(life.random);
  const character = life.character;
  character.age += 1;
  life.year += 1;
  life.usedActions = [];
  character.attributes.energy = 100;
  character.attributes.stress = clamp(character.attributes.stress - 5);
  const age = character.age;
  character.attributes.health = clamp(character.attributes.health + (
    age < 18 ? random.integer(0, 1) : age < 45 ? random.integer(-1, 1) :
    age < 66 ? random.integer(-2, 0) : random.integer(-4, -1)
  ));
  for (const person of life.family) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 55) person.health = clamp(person.health - random.integer(0, 3));
    if (person.age > 70 && (person.health === 0 || person.age >= maxAge || random.next() < (person.age - 70) / 500)) {
      person.alive = false;
      record(life, 'family', `My ${person.role.toLowerCase()}, ${person.name}, died at age ${person.age}.`, { happiness: -10, stress: 10 });
    }
  }
  for (const person of life.schoolContacts) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) person.alive = false;
  }
  const education = educationAt(age);
  if (education !== character.education) {
    character.education = education;
    if (isSchoolStage(education)) life.schoolContacts.push(...createSchoolClass(life, education));
    const text = education === 'completed' ? 'I graduated from high school.' : `I started ${educationLabels[education].toLowerCase()}.`;
    record(life, 'school', text, { smarts: 2, discipline: 1 });
  }
  const dies = character.attributes.health === 0 || age >= maxAge ||
    (age >= 72 && random.next() < (age - 69) / 650 + (100 - character.attributes.health) / 1800);
  if (dies) {
    character.causeOfDeath = character.attributes.health === 0 ? 'Declining health' : 'Natural causes';
    life.scheduled = [];
    record(life, 'life', `My life ended at age ${age}.`);
    life.random = random.state;
    return;
  }
  for (const consequence of life.scheduled) {
    if (consequence.year === life.year) record(life, 'decision', consequence.text, consequence.effects);
  }
  life.scheduled = life.scheduled.filter(({ year }) => year > life.year);
  const eligible = events.filter((event) => age >= event.ages[0] && age <= event.ages[1] &&
    !life.seen.includes(event.id) && (event.eligible?.(life) ?? true));
  const triggered = eligible.find((event) => event.probability === 1) ??
    eligible.filter((event) => random.next() < event.probability * (event.modifier?.(life) ?? 1))
      .map((event) => ({ event, order: random.next() })).sort((a, b) => a.order - b.order)[0]?.event;
  if (triggered) {
    life.seen.push(triggered.id);
    record(life, triggered.category, triggered.text, triggered.effects);
    if (triggered.choices) life.pending = triggered.id;
  }
  life.random = random.state;
}

export function activityIssue(life: Life, activity: Activity) {
  const entry = activities[activity];
  if (life.character.age < entry.age) return `Available from age ${entry.age}.`;
  if (activity === 'study' && life.character.education === 'completed') return 'Only available while attending school.';
  if (life.usedActions.includes(activity)) return 'Already done this year.';
  if (life.character.attributes.energy < entry.energy) return 'You need more energy.';
  return null;
}

function contactIssue(life: Life, person: Contact) {
  if (!person.alive) return 'This person is no longer available.';
  if ('stage' in person && !person.friend && person.stage !== life.character.education) {
    return 'This contact is from a previous class.';
  }
  return null;
}

export function talkIssue(life: Life, id: string) {
  const person = findContact(life, id);
  if (!person) return 'This person is no longer available.';
  const issue = contactIssue(life, person);
  if (issue) return issue;
  if (life.character.age < 3) return 'Available from age 3.';
  if (life.usedActions.includes(`talk:${id}`)) return 'Already done this year.';
  if (life.character.attributes.energy < 8) return 'You need more energy.';
  return null;
}

export function befriendIssue(life: Life, id: string) {
  const person = life.schoolContacts.find((contact) => contact.id === id);
  if (!person || person.role !== 'Classmate') return 'You can only befriend a classmate.';
  if (person.friend) return 'You are already friends.';
  const issue = contactIssue(life, person);
  if (issue) return issue;
  if (life.character.attributes.energy < friendshipEnergyCost) return 'You need more energy.';
  return null;
}

export function advance(previous: Life, action: Action): { life: Life; error?: never } | { error: string; life?: never } {
  if (previous.character.causeOfDeath) return { error: 'This life has already ended.' };
  if (previous.pending && action.type !== 'choose') return { error: 'Resolve your pending decision in the journal first.' };
  const life = structuredCloneLife(previous);
  switch (action.type) {
    case 'age':
      ageUp(life);
      break;
    case 'choose': {
      const choice = eventById.get(action.event)?.choices?.find(({ id }) => id === action.choice);
      if (life.pending !== action.event || !choice) return { error: 'This decision is no longer available.' };
      life.pending = null;
      record(life, 'decision', choice.outcome, choice.effects);
      if (choice.delayed) {
        life.scheduled.push({ year: life.year + choice.delayed.years, text: choice.delayed.text, effects: choice.delayed.effects });
      }
      break;
    }
    case 'activity': {
      const issue = activityIssue(life, action.activity);
      if (issue) return { error: issue };
      const item = activities[action.activity];
      life.usedActions.push(action.activity);
      record(life, action.activity === 'study' ? 'school' : 'life', item.text, { energy: -item.energy, ...item.effects });
      break;
    }
    case 'talk': {
      const issue = talkIssue(life, action.person);
      if (issue) return { error: issue };
      const person = findContact(life, action.person)!;
      life.usedActions.push(`talk:${person.id}`);
      person.bond.affection = clamp(person.bond.affection + 3);
      person.bond.trust = clamp(person.bond.trust + 2);
      person.bond.familiarity = clamp(person.bond.familiarity + 4);
      record(life, 'stage' in person ? 'community' : 'family',
        `I caught up with ${person.name} about what we had been doing lately.`, { energy: -8, happiness: 3 });
      break;
    }
    case 'befriend': {
      const issue = befriendIssue(life, action.person);
      if (issue) return { error: issue };
      const person = life.schoolContacts.find(({ id }) => id === action.person)!;
      person.friend = true;
      person.bond.affection = clamp(person.bond.affection + 8);
      person.bond.trust = clamp(person.bond.trust + 5);
      person.bond.familiarity = clamp(person.bond.familiarity + 6);
      record(life, 'school', `I became friends with ${person.name} from my class.`, { energy: -friendshipEnergyCost, happiness: 5 });
      break;
    }
  }
  return { life };
}

function structuredCloneLife(life: Life): Life {
  return {
    ...life,
    character: { ...life.character, attributes: { ...life.character.attributes } },
    family: life.family.map((person) => ({ ...person, bond: { ...person.bond } })),
    schoolContacts: life.schoolContacts.map((person) => ({ ...person, bond: { ...person.bond } })),
    journal: [...life.journal],
    seen: [...life.seen],
    scheduled: [...life.scheduled],
    usedActions: [...life.usedActions],
    transactions: [...life.transactions],
  };
}
