import { doctors } from '../data/doctors.ts';
import { findContact } from './school.ts';
import { seededRandom } from './random.ts';
import { clamp, record } from './journal.ts';
import { recordNotice } from './eventNotices.ts';
import { illnessLevels, illnesses, playerPatient } from './healthTypes.ts';
import type { HealthVisit, IllnessCase, IllnessId, IllnessLevel, PatientService } from './healthTypes.ts';
import type { Contact, Life } from './types.ts';

const effects: Record<IllnessLevel, { health: number; energy: number; cost: number; recovery: number }> = {
  mild: { health: 2, energy: 5, cost: 250, recovery: .88 },
  moderate: { health: 4, energy: 10, cost: 750, recovery: .59 },
  severe: { health: 9, energy: 16, cost: 1600, recovery: .25 },
};

const severityPenalty: Record<IllnessLevel, number> = { mild: 0, moderate: 8, severe: 16 };
export const donations = {
  'donate-blood': { energy: 14, happiness: 4, reward: 0, title: 'Blood Donation', text: 'I donated blood at the clinic.' },
  'donate-plasma': { energy: 20, happiness: 2, reward: 400, title: 'Plasma Donation', text: 'I donated plasma and received compensation.' },
} as const;

type VisitQuote = { fee: number; chance?: number; issue: string | null };

export function activeIllness(life: Life, patient = playerPatient) {
  return life.illnesses.find((item) => item.patient === patient);
}

export function canAccompany(life: Life, person: Contact) {
  return life.family.some(({ id }) => id === person.id) || ('friend' in person && person.friend);
}

function hasIncome(life: Life) {
  return life.transactions.some((entry) => entry.category === 'salary' && entry.amount > 0);
}

export function matchesService(condition: IllnessCase, service: PatientService) {
  if (service === 'emergency') return condition.level === 'severe';
  if (service === 'optometrist') return condition.illness === 'eye-strain';
  return true;
}

export function healthcareQuote(life: Life, visit: HealthVisit): VisitQuote {
  const { character, usedActions } = life;
  const blocked = character.causeOfDeath ? 'This life has already ended.' : life.pending ? 'Resolve the pending decision first.' : null;
  const affordable = (fee: number) => character.bank < fee ? 'Your balance does not cover this visit.' : null;
  if ('patient' in visit) {
    const { patient, service } = visit;
    const self = patient === playerPatient;
    const npc = self ? undefined : findContact(life, patient);
    if (!self && (!npc?.alive || !canAccompany(life, npc))) return { fee: 0, issue: blocked ?? 'You can accompany living family members and friends.' };
    const condition = activeIllness(life, patient);
    if (!condition || !matchesService(condition, service)) return { fee: 0, issue: blocked ?? 'This patient has no condition for this service.' };

    const provider = visit.service === 'doctor' ? doctors.find(({ id }) => id === visit.provider) : undefined;
    if (service === 'doctor' && !provider) return { fee: 0, issue: 'This doctor is unavailable.' };
    const price = provider ? Math.round(effects[condition.level].cost * provider.price) : service === 'emergency' ? 3600 : 500;
    const fee = self && character.age < 18 && (!provider || provider.id === 'community') ? 0 : price;
    const chance = provider ? provider.chance - severityPenalty[condition.level] : service === 'emergency' ? 100 : 93;
    const issue = blocked ?? (!self && !hasIncome(life) ? 'Earn a salary before paying for someone else’s visit.' : null) ??
      (usedActions.includes(`doctor:${patient}`) ? 'This patient has already had a visit this year.' : null) ?? affordable(fee);
    return { fee, chance, issue };
  }

  if (visit.service === 'psychiatrist') {
    const fee = character.age < 18 ? 0 : 400;
    const issue = blocked ?? (character.age < 13 ? 'Available from age 13.' : null) ??
      (usedActions.includes('psychiatrist') ? 'You already had a session this year.' : null) ??
      (character.attributes.stress < 20 ? 'A session is available from 20% stress.' : null) ?? affordable(fee);
    return { fee, issue };
  }

  const issue = blocked ?? (character.age < 18 ? 'Available from age 18.' : null) ??
    (usedActions.includes('donation') ? 'You already made a donation this year.' : null) ??
    (activeIllness(life) || character.attributes.health < 65 ? 'You need at least 65% health and no active illness.' : null) ??
    (character.attributes.energy < donations[visit.service].energy ? 'You need more energy.' : null);
  return { fee: 0, issue };
}

function removeIllness(life: Life, condition: IllnessCase) {
  life.illnesses = life.illnesses.filter((item) => item !== condition);
}

function treat(life: Life, condition: IllnessCase, npc: Contact | undefined,
  visit: { fee?: number; success: boolean; title: string; text: string }) {
  life.usedActions.push(`doctor:${condition.patient}`);
  const cost = visit.fee ?? 0;
  const severe = condition.level === 'severe';
  const improvement = visit.success ? severe ? 8 : condition.level === 'moderate' ? 6 : 3 : 0;
  let outcome = 'The illness remained unchanged.';
  if (visit.success) {
    if (severe) {
      condition.level = 'moderate';
      outcome = 'The illness improved to moderate.';
    } else {
      removeIllness(life, condition);
      outcome = 'The illness cleared after the visit.';
    }
  }
  if (npc) npc.health = clamp(npc.health + improvement);
  recordNotice(life, 'health', visit.title, `${visit.text} ${outcome}`, { health: npc ? 0 : improvement, bank: -cost }, 'medical');
}

export function visitHealthcare(life: Life, visit: HealthVisit) {
  const { fee, chance, issue } = healthcareQuote(life, visit);
  if (issue) return issue;

  if ('patient' in visit) {
    const npc = visit.patient === playerPatient ? undefined : findContact(life, visit.patient);
    const random = seededRandom(life.random);
    const success = chance === 100 || random.next() * 100 < chance!;
    life.random = random.state;
    const destination = visit.service === 'doctor' ? doctors.find(({ id }) => id === visit.provider)!.names[life.character.city] :
      visit.service === 'emergency' ? 'the emergency room' : 'the optometrist';
    const title = visit.service === 'doctor' ? 'Doctor Visit' : visit.service === 'emergency' ? 'Emergency Room Visit' : 'Eye Care Visit';
    treat(life, activeIllness(life, visit.patient)!, npc, { fee, success, title,
      text: npc ? `I took ${npc.name} to ${destination}.` : `I went to ${destination}.` });
  } else if (visit.service === 'psychiatrist') {
    life.usedActions.push(visit.service);
    recordNotice(life, 'health', 'Psychiatry Session', 'I talked through some of my stress during a psychiatry session.',
      { stress: -18, happiness: 4, bank: -fee }, 'medical');
  } else {
    const { title, text, energy, happiness, reward } = donations[visit.service];
    life.usedActions.push('donation');
    recordNotice(life, 'health', title, text, { energy: -energy, happiness, bank: reward });
  }
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
    treat(life, condition, npc, { success: true, title: 'Doctor Visit', text: `${npc.name} went to the doctor on their own.` });
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
  return random.pick(['cold', 'stomach-bug', 'eye-strain']);
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
