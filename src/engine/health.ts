import { findContact } from './school.ts';
import { seededRandom } from './random.ts';
import { clamp, record } from './journal.ts';
import { recordNotice } from './eventNotices.ts';
import { illnessLevels, illnesses, playerPatient } from './healthTypes.ts';
import type { IllnessCase, IllnessId, IllnessLevel } from './healthTypes.ts';
import type { Contact, Life } from './types.ts';

const effects: Record<IllnessLevel, { health: number; energy: number; cost: number; recovery: number }> = {
  mild: { health: 2, energy: 5, cost: 250, recovery: .88 },
  moderate: { health: 4, energy: 10, cost: 750, recovery: .59 },
  severe: { health: 9, energy: 16, cost: 1600, recovery: .25 },
};

export function activeIllness(life: Life, patient = playerPatient) {
  return life.illnesses.find((item) => item.patient === patient);
}

export function canAccompany(life: Life, person: Contact) {
  return life.family.some(({ id }) => id === person.id) || ('friend' in person && person.friend);
}

function hasIncome(life: Life) {
  return life.transactions.some((entry) => entry.category === 'salary' && entry.amount > 0);
}

export function visitCost(life: Life, condition: IllnessCase) {
  return condition.patient === playerPatient && life.character.age < 18 ? 0 : effects[condition.level].cost;
}

export function doctorIssue(life: Life, patient: string) {
  if (life.character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve the open decision first.';
  const npc = patient === playerPatient ? undefined : findContact(life, patient);
  if (patient !== playerPatient) {
    if (!npc?.alive || !canAccompany(life, npc)) return 'You can accompany living family members and friends.';
    if (!hasIncome(life)) return 'Earn a salary before paying for someone else’s visit.';
  }
  const condition = activeIllness(life, patient);
  if (!condition) return 'There is no active illness to treat.';
  if (life.usedActions.includes(`doctor:${patient}`)) return 'This patient has already had a visit this year.';
  if (life.character.bank < visitCost(life, condition)) return 'Your balance does not cover this visit.';
  return null;
}

function removeIllness(life: Life, condition: IllnessCase) {
  life.illnesses = life.illnesses.filter((item) => item !== condition);
}

function treat(life: Life, condition: IllnessCase, npc: Contact | undefined, paidByPlayer: boolean) {
  life.usedActions.push(`doctor:${condition.patient}`);
  const cost = paidByPlayer ? visitCost(life, condition) : 0;
  const severe = condition.level === 'severe';
  const improvement = severe ? 8 : condition.level === 'moderate' ? 6 : 3;
  const visit = npc ? (paidByPlayer ? `I took ${npc.name} to the doctor.` : `${npc.name} went to the doctor on their own.`) : 'I went to the doctor.';
  const outcome = severe ? 'The illness improved to moderate.' : 'The illness cleared after the visit.';
  if (severe) condition.level = 'moderate';
  else removeIllness(life, condition);
  if (npc) npc.health = clamp(npc.health + improvement);
  recordNotice(life, 'health', 'Doctor Visit', `${visit} ${outcome}`, npc ? { bank: -cost } : { health: improvement, bank: -cost }, 'medical');
}

export function visitDoctor(life: Life, patient: string) {
  const issue = doctorIssue(life, patient);
  if (issue) return issue;
  treat(life, activeIllness(life, patient)!, patient === playerPatient ? undefined : findContact(life, patient), true);
  return null;
}

export function startIllness(life: Life, illness: IllnessId, npc?: Contact) {
  const patient = npc?.id ?? playerPatient;
  if (activeIllness(life, patient)) return;
  const definition = illnesses[illness];
  const level = definition.onset;
  const { health, energy } = effects[level];
  life.illnesses.push({ patient, illness, level, started: life.year });
  if (npc) npc.health = Math.max(1, npc.health - health);
  recordNotice(life, 'health', npc ? `${npc.name} Is Ill` : 'I Fell Ill', npc ?
    `${npc.name} came down with an illness. Condition: ${definition.name}. Severity: ${level}.` :
    `I came down with an illness. Condition: ${definition.name}. Severity: ${level}.`,
  npc ? undefined : { health: -Math.min(health, Math.max(0, life.character.attributes.health - 1)), energy: -energy });
}

function progressIllness(life: Life, condition: IllnessCase, random: ReturnType<typeof seededRandom>) {
  const npc = condition.patient === playerPatient ? undefined : findContact(life, condition.patient);
  if (condition.patient !== playerPatient && !npc?.alive) {
    removeIllness(life, condition);
    return;
  }
  if (!npc && life.character.attributes.health === 0) return;
  if (condition.started === life.year) return;
  const definition = illnesses[condition.illness];
  const age = npc?.age ?? life.character.age;
  const severity = effects[condition.level];
  if (npc && random.next() < (condition.level === 'severe' ? .86 : condition.level === 'moderate' ? .61 : .25)) {
    treat(life, condition, npc, false);
    return;
  }
  if (life.year - condition.started >= 4 || random.next() < severity.recovery) {
    removeIllness(life, condition);
    if (npc) npc.health = clamp(npc.health + 2);
    recordNotice(life, 'health', 'Recovery', npc ? `${npc.name} recovered from ${definition.name.toLowerCase()}.` :
      `I recovered from ${definition.name.toLowerCase()}.`, npc ? undefined : { health: 2 });
    return;
  }

  const level = illnessLevels.indexOf(condition.level);
  const getsWorse = level < illnessLevels.indexOf(definition.max) && random.next() < (age >= 60 ? .45 : .20);
  if (getsWorse) condition.level = illnessLevels[level + 1]!;
  const { health, energy } = effects[condition.level];
  if (npc) npc.health = clamp(npc.health - health);
  const text = getsWorse ? `${npc ? `${npc.name}’s` : 'My'} ${definition.name.toLowerCase()} worsened to ${condition.level}.` :
    `${npc ? `${npc.name} is` : 'I am'} still dealing with ${definition.name.toLowerCase()}.`;
  if (npc && npc.health === 0) {
    npc.alive = false;
    removeIllness(life, condition);
    recordNotice(life, 'health', 'A Loss', `${npc.name} died at age ${npc.age} while dealing with ${definition.name.toLowerCase()}.`,
      canAccompany(life, npc) ? { happiness: -8, stress: 6 } : undefined);
  } else if (getsWorse) recordNotice(life, 'health', 'Illness Worsened', text, npc ? undefined : { health: -health, energy: -energy });
  else if (!npc) record(life, 'health', text, { health: -health, energy: -energy });
}

function chooseIllness(age: number, health: number, random: ReturnType<typeof seededRandom>): IllnessId {
  const roll = random.next();
  if ((age >= 55 || health < 52) && roll < .14) return 'pneumonia';
  if (roll < .43) return random.pick(['flu', 'bronchitis', 'migraine']);
  return random.pick(['cold', 'stomach-bug']);
}

export function advanceIllnesses(life: Life) {
  const random = seededRandom(life.seed ^ Math.imul(life.year, 0xb5297a4d));
  const contacts = [...life.family, ...life.schoolContacts, ...life.career.contacts];
  const previouslyIll = new Set(life.illnesses.map(({ patient }) => patient));
  for (const condition of life.illnesses) progressIllness(life, condition, random);
  const { age, attributes } = life.character;
  if (age >= 3 && attributes.health > 0 && !previouslyIll.has(playerPatient) &&
    random.next() < .095 + (100 - attributes.health) * .0012 + (age >= 60 ? .055 : 0)) {
    startIllness(life, chooseIllness(age, attributes.health, random));
  }
  const contactsAtRisk = contacts.filter((person) => person.alive && !previouslyIll.has(person.id));
  if (age >= 3 && contactsAtRisk.length && random.next() < .13) {
    const close = contactsAtRisk.filter((person) => canAccompany(life, person));
    const candidates = close.length && random.next() < .8 ? close : contactsAtRisk;
    const npc = candidates[random.integer(0, candidates.length - 1)]!;
    startIllness(life, chooseIllness(npc.age, npc.health, random), npc);
  }
}
