import { recordNotice } from './eventNotices.ts';
import { outstanding } from './finance.ts';
import { clamp } from './journal.ts';
import { npcProfile, npcRandom, remember } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { findContact } from './school.ts';
import { activeRomanceStatuses } from './socialTypes.ts';
import { careActions, milestoneKinds } from './relationshipTypes.ts';
import type { Agreement, BreachKind, Concern, MemoryKind, RelationshipCareAction, RelationshipState } from './relationshipTypes.ts';
import type { City, Contact, Life } from './types.ts';

export const concernLabels: Record<Concern, string> = { neglect: 'Too little time together', money: 'Financial pressure', workload: 'Work-life imbalance',
  jealousy: 'Uncertainty about other partners', promise: 'A broken promise', goals: 'Different plans for the future', distance: 'Living in different cities',
  parenting: 'Parenting disagreements', argument: 'A hurtful disagreement', boundary: 'A broken relationship agreement' };
export const agreementLabels: Record<Agreement, string> = {
  legacy: 'Expectations not recorded', casual: 'Casual dating', exclusive: 'Exclusive', 'non-exclusive': 'Mutually non-exclusive',
};
export const agreementPhrase = (agreement: 'exclusive' | 'non-exclusive') =>
  agreement === 'exclusive' ? 'an exclusive relationship' : 'a non-exclusive relationship';
export const relationshipState = (life: Life, id: string) => life.social.relationships[id];
export const activeFor = (life: Life, id: string) => life.social.romances.some((entry) => entry.person === id &&
  activeRomanceStatuses.some((status) => entry.status === status));
export const agreementFor = (life: Life, id: string): Agreement => relationshipState(life, id)?.agreement ?? 'legacy';
export const knownRelationship = (life: Life, person: Contact) => activeFor(life, person.id) ||
  ('friend' in person && person.friend && !npcProfile(life, person).formerFriend);

function stateFor(life: Life, id: string): RelationshipState {
  return life.social.relationships[id] ??= { agreement: 'legacy', conflicts: [], memories: [], milestones: {} };
}

export function relationshipMemory(life: Life, id: string, kind: MemoryKind, impact: number, significant = false) {
  const state = stateFor(life, id);
  const memory = { kind, year: life.year, significance: significant ? 'major' as const : 'meaningful' as const, impact };
  if (!state.memories.some((entry) => entry.kind === kind && entry.year === life.year)) {
    state.memories = [...state.memories.slice(-15), memory];
  }
  const milestone = milestoneKinds.find((entry) => entry === kind);
  if (milestone) state.milestones[milestone] ??= memory;
}

export function setAgreement(life: Life, id: string, agreement: Agreement) {
  stateFor(life, id).agreement = agreement;
}

export function relationshipEnded(life: Life, id: string, reason: NonNullable<RelationshipState['endedBecause']>) {
  const state = stateFor(life, id);
  state.endedBecause = reason;
  delete state.apartUntil;
  delete state.move;
  delete state.visit;
  delete state.promise;
  relationshipMemory(life, id, 'breakup', -12, true);
}

export function restartRelationship(life: Life, id: string) {
  const state = stateFor(life, id);
  if (state.endedBecause) {
    delete state.endedBecause;
    state.conflicts = state.conflicts.map((conflict) => ({ ...conflict, state: 'resolved' }));
  }
  state.agreement = 'casual';
  state.lastMeaningful = life.year;
}

export function visibleConcerns(life: Life, person: string) {
  return (relationshipState(life, person)?.conflicts ?? [])
    .filter((entry) => entry.state !== 'resolved' && (!entry.breach || entry.breach.discovered))
    .sort((a, b) => b.severity - a.severity);
}

export function openConcern(life: Life, id: string, kind: Concern, severity: number) {
  const state = stateFor(life, id);
  const active = state.conflicts.find((entry) => entry.kind === kind && entry.state !== 'resolved');
  if (active) {
    if (active.updated < life.year || severity > active.severity) active.severity = clamp(Math.max(active.severity, severity));
    active.peak = Math.max(active.peak, active.severity);
    active.updated = life.year;
    return active;
  }
  // Each category keeps its latest episode. Meaningful earlier events remain in the journal.
  state.conflicts = state.conflicts.filter((entry) => entry.kind !== kind);
  const conflict = { id: `concern:${id}:${kind}:${life.year}`, participants: ['self', id] as ['self', string],
    kind, severity, peak: severity, year: life.year, updated: life.year, state: 'open' as const };
  state.conflicts.push(conflict);
  relationshipMemory(life, id, 'conflict', -severity, severity >= 55);
  return state.conflicts.at(-1)!;
}

export function boundaryEvidence(life: Life, participants: readonly string[], kind: BreachKind) {
  for (const romance of life.social.romances) {
    const id = romance.person;
    if (!activeFor(life, id) || participants.includes(id) || agreementFor(life, id) !== 'exclusive') continue;
    const who = participants[0]!;
    if (relationshipState(life, id)?.conflicts.some((entry) => entry.kind === 'boundary' &&
      entry.breach?.evidence.some((evidence) => evidence.who === who && evidence.kind === kind && evidence.year === life.year))) continue;
    const earlier = relationshipState(life, id)?.conflicts.find((entry) => entry.kind === 'boundary')?.breach?.count ?? 0;
    const conflict = openConcern(life, id, 'boundary', kind === 'intimacy' ? 72 : kind === 'commitment' ? 66 : 52);
    const previous = conflict.breach;
    conflict.breach = { count: earlier + 1, discovered: previous?.discovered ?? false, unseen: true,
      evidence: [...(previous?.evidence.slice(-3) ?? []), { who, kind, year: life.year }] };
    conflict.severity = clamp(conflict.severity + (previous ? 8 : 0));
    conflict.peak = Math.max(conflict.peak, conflict.severity);
    relationshipMemory(life, id, 'boundary', -conflict.severity, true);
  }
}

export function attraction(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  if (!profile.preferences.includes(life.character.gender) || profile.localPartner || !person.alive || person.age < 18) return 0;
  const interests = person.bond.compatibility * .21 + Math.min(15, profile.interests.filter((item) => (life.skills.hobbies as readonly string[]).includes(item)).length * 6);
  const values = 12 - Math.abs(profile.traits.ambition - life.character.attributes.discipline) * .12;
  const recency = Math.min(14, Math.max(0, life.year - profile.lastInteraction - 1) * 4);
  return clamp(Math.round(12 + interests + values + person.bond.familiarity * .17 + person.bond.trust * .24 +
    person.bond.affection * .16 + profile.traits.empathy * .08 - person.bond.resentment * .38 - recency));
}

export function relationshipSatisfaction(life: Life, person: Contact) {
  const { affection, trust, respect, compatibility, resentment, familiarity } = person.bond;
  const strain = visibleConcerns(life, person.id)[0]?.severity ?? 0;
  return clamp(Math.round(affection * .27 + trust * .30 + respect * .17 + compatibility * .16 + familiarity * .10 -
    resentment * .26 - strain * .25));
}

export function relationshipCondition(life: Life, person: Contact) {
  const state = relationshipState(life, person.id);
  const visible = visibleConcerns(life, person.id);
  const severity = visible[0]?.severity ?? 0;
  const score = relationshipSatisfaction(life, person);
  if (visible.some((entry) => entry.breach && entry.severity >= 45) && person.bond.trust < 62) return 'Broken Trust';
  if (score < 36 || (state?.apartUntil ?? 0) > life.year) return 'Unstable';
  if (severity >= 35 || person.bond.resentment >= 34) return 'Strained';
  if (activeFor(life, person.id) && attraction(life, person) < 30) return 'One-Sided';
  if (activeFor(life, person.id) && life.year - (state?.lastMeaningful ?? npcProfile(life, person).lastInteraction) >= 2) return 'Emotionally Distant';
  if (score >= 82 && person.bond.trust >= 78 && person.bond.familiarity >= 70) return 'Deeply Connected';
  return score >= 66 ? 'Healthy' : 'Stable';
}

export function inPersonIssue(life: Life, person: Contact) {
  const state = relationshipState(life, person.id);
  if (takingSpace(life, person.id)) return 'They’ve asked for time apart.';
  if (person.city === life.character.city || (state?.visit?.year === life.year && state.visit.city === person.city)) return null;
  return 'You live in different cities. Arrange a visit first.';
}

export const takingSpace = (life: Life, id: string) => (relationshipState(life, id)?.apartUntil ?? 0) > life.year;

export function meaningfulTime(life: Life, person: Contact, act: 'time' | 'support', repair = 0) {
  if (!knownRelationship(life, person)) return;
  const state = stateFor(life, person.id);
  state.lastMeaningful = life.year;
  if (act === 'support') relationshipMemory(life, person.id, 'support', 4);
  if (state.promise?.status === 'pending' && state.promise.kind === act) {
    state.promise.status = 'kept';
    relationshipMemory(life, person.id, 'promise', 6);
  }
  const conflict = visibleConcerns(life, person.id)[0];
  if (!conflict || repair <= 0) return;
  const serious = conflict.breach || conflict.peak >= 48 || conflict.year < life.year;
  const threshold = serious && (conflict.repairYear === undefined || conflict.repairYear === life.year) ? 24 : 0;
  conflict.repairYear ??= life.year;
  conflict.severity = Math.min(conflict.severity, Math.max(threshold, conflict.severity - repair));
  conflict.state = conflict.severity === 0 ? 'resolved' : 'repairing';
  if (conflict.state === 'resolved' && serious) relationshipMemory(life, person.id, 'reconciliation', 5, true);
  conflict.updated = life.year;
}

export function responseScale(life: Life, person: Contact, action: string) {
  if (!knownRelationship(life, person) || life.character.age < 18) return 1;
  const conflict = visibleConcerns(life, person.id)[0]?.severity ?? 0;
  const used = life.usedActions.filter((key) => key === `connection:${person.id}`).length;
  life.usedActions.push(`connection:${person.id}`);
  const quality = relationshipSatisfaction(life, person);
  const interest = npcProfile(life, person).traits.empathy;
  const chance = 35 + quality * .44 + interest * .15 - conflict * .27 - life.character.attributes.stress * .12;
  if (npcRandom(life, `bond:${person.id}:${action}:${used}`, life.year).next() * 100 > chance) return 0;
  return Math.max(.2, 1 - used * .19 - conflict * .006);
}

export const counselingFee = 1750;
export const visitFee = (life: Life, person: Contact) => localExpense(life.world, person.city, 1700);

export function careIssue(life: Life, person: Contact, action: RelationshipCareAction['action']) {
  if (!careActions.includes(action) || life.character.causeOfDeath || !person.alive) return 'This relationship action is unavailable.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (life.character.age < 18 || person.age < 18 || !knownRelationship(life, person)) return 'Available with adult friends and partners.';
  const state = relationshipState(life, person.id);
  const apart = (state?.apartUntil ?? 0) > life.year;
  const concern = visibleConcerns(life, person.id)[0];
  if (life.usedActions.includes(`care:${person.id}:${action}`)) return 'Available again next year.';
  if (apart && action !== 'space') return 'They’ve asked for time apart. Give them until next year.';
  if ((action === 'exclusive' || action === 'non-exclusive' || action === 'counseling' || action === 'relocation') && !activeFor(life, person.id)) {
    return 'Discuss this with a current partner.';
  }
  if (action === 'exclusive' || action === 'non-exclusive') {
    if (agreementFor(life, person.id) === action) return 'You already have this agreement.';
    if (action === 'exclusive' && life.social.romances.some((entry) => entry.person !== person.id && activeFor(life, entry.person))) {
      return 'Resolve your other active relationships before agreeing to exclusivity.';
    }
  }
  if ((action === 'discuss' || action === 'counseling' || action === 'reconcile' || action.startsWith('promise-')) && !concern) return 'No unresolved concern to address.';
  if (action.startsWith('promise-') && state?.promise?.status === 'pending') return 'You already made a promise about this relationship.';
  if (action === 'reconcile' && (concern?.repairYear === undefined || concern.repairYear >= life.year || concern.severity > 50)) {
    return 'Follow through and make time over more than one year before asking to reconcile.';
  }
  if (action === 'space' && apart) return 'You are already taking time apart.';
  if (action === 'visit' && person.city === life.character.city) return 'You already live in the same city.';
  if (action === 'visit' && life.character.bank < visitFee(life, person)) return 'Your balance does not cover the visit.';
  if (action === 'counseling' && (inPersonIssue(life, person) || life.character.bank < counselingFee)) {
    return inPersonIssue(life, person) ?? 'Your balance does not cover counseling.';
  }
  return null;
}

export function negotiateAgreement(life: Life, person: Contact, agreement: 'exclusive' | 'non-exclusive', initiated = false) {
  const profile = npcProfile(life, person);
  const preference = agreement === 'exclusive' ? profile.traits.loyalty * .26 : profile.traits.riskTolerance * .29 + profile.traits.empathy * .10;
  const chance = Math.min(94, 12 + attraction(life, person) * .30 + person.bond.trust * .27 + preference - person.bond.resentment * .35);
  if (!attraction(life, person) || (!initiated && npcRandom(life, `agreement:${person.id}:${agreement}`, life.year).next() * 100 >= chance)) return false;
  const previous = agreementFor(life, person.id);
  setAgreement(life, person.id, agreement);
  const romance = life.social.romances.find((entry) => entry.person === person.id);
  if (romance?.status === 'dating') romance.status = 'committed';
  relationshipMemory(life, person.id, 'commitment', 10, true);
  meaningfulTime(life, person, 'time', 4);
  if (previous !== agreement) boundaryEvidence(life, [person.id], 'commitment');
  return true;
}

export function applyRelationshipCare(life: Life, action: RelationshipCareAction) {
  const person = findContact(life, action.person);
  if (!person) return 'This person is unavailable.';
  const problem = careIssue(life, person, action.action);
  if (problem) return problem;
  const id = person.id;
  const state = stateFor(life, id);
  const concern = visibleConcerns(life, id)[0];
  const { name } = person;
  const kind = action.action;
  life.usedActions.push(`care:${id}:${kind}`);
  let story: string;
  let title: string;
  let cost = 0;
  if (kind === 'exclusive' || kind === 'non-exclusive') {
    const accepted = negotiateAgreement(life, person, kind);
    title = accepted ? 'An Agreement' : 'Different Expectations';
    story = accepted ? `${name} and I talked openly and agreed to ${agreementPhrase(kind)}.` :
      `${name} heard me out, but said the agreement I suggested wasn’t right for them. We kept our existing expectations.`;
  } else if (kind === 'space') {
    state.apartUntil = life.year + 1;
    title = 'Taking Time Apart';
    story = `I asked ${name} for some breathing room. I’ll give us time apart until next year.`;
  } else if (kind === 'promise-time' || kind === 'promise-support') {
    const promise = kind === 'promise-time' ? 'time' : 'support';
    state.promise = { year: life.year, due: life.year + 1, kind: promise, status: 'pending' };
    title = 'A Promise to Keep';
    story = `I promised ${name} I would ${promise === 'time' ? 'make time for us' : 'show up when they need support'} by the end of next year.`;
  } else if (kind === 'relocation') {
    const profile = npcProfile(life, person);
    const readiness = person.bond.trust * .45 + profile.traits.riskTolerance * .32 + relationshipSatisfaction(life, person) * .24 -
      (profile.status === 'employed' ? 24 : 0) - Math.min(18, profile.commitments / 650);
    const accepts = readiness >= 30 && npcRandom(life, `relocation-talk:${id}`, life.year).next() * 100 < readiness;
    title = 'A Conversation About Moving';
    if (accepts) {
      state.move = person.city === life.character.city ? { year: life.year } : { year: life.year + 1, city: life.character.city };
      story = `${name} agreed to ${state.move.city ? `consider a move to ${state.move.city} next year` : 'move with me if I relocate this year'}, after thinking about work and family.`;
    } else story = `${name} said their commitments make moving difficult right now. We agreed to keep talking about it.`;
  } else if (kind === 'reconcile') {
    const accepts = person.bond.trust >= 40 && npcRandom(life, `reconciliation:${id}`, life.year).next() * 100 < relationshipSatisfaction(life, person) + 13;
    title = accepts ? 'Reconciliation' : 'More Time to Heal';
    if (accepts) {
      concern!.state = 'resolved';
      concern!.severity = 0;
      concern!.updated = life.year;
      person.bond.trust = clamp(person.bond.trust + 7);
      person.bond.resentment = clamp(person.bond.resentment - 9);
      relationshipMemory(life, id, 'reconciliation', 9, true);
      story = `${name} recognized the effort I’d made over time. We agreed to put the issue behind us and keep following through.`;
    } else story = `${name} said they could see the effort, but weren’t ready to put the conflict behind us yet.`;
  } else {
    const channel = { phone: 'called', message: 'messaged', video: 'video called', visit: 'visited', counseling: 'went to counseling with',
      discuss: 'talked through the issue with', support: 'checked in and offered some help to' }[kind];
    if (kind === 'visit') {
      state.visit = { year: life.year, city: person.city };
      cost = visitFee(life, person);
    }
    const response = responseScale(life, person, kind);
    const accepted = response > 0;
    if (kind === 'counseling' && accepted) cost = counselingFee;
    if (accepted) {
      const repair = kind === 'counseling' ? 16 : kind === 'discuss' ? 10 : kind === 'support' ? 7 : 4;
      meaningfulTime(life, person, kind === 'support' ? 'support' : 'time', Math.ceil(repair * response));
      person.bond.trust = clamp(person.bond.trust + Math.ceil(3 * response));
      person.bond.resentment = clamp(person.bond.resentment - Math.ceil(repair * response / 2));
    }
    title = kind === 'visit' ? 'A Visit' : accepted ? 'Making Time' : 'A Difficult Conversation';
    story = `I ${channel} ${name}. ${accepted ? 'We made space to listen to what had been on each other’s minds.' :
      'They weren’t ready to talk things through, so I gave them room.'}`;
  }
  remember(life, person, story);
  recordNotice(life, 'community', title, story, { bank: -cost }, 'relationships');
  return null;
}

export function agreesToMove(life: Life, person: Contact) {
  const state = relationshipState(life, person.id);
  if ((state?.apartUntil ?? 0) > life.year || person.city !== life.character.city) return false;
  if (state?.move?.year === life.year && !state.move.city) return true;
  const profile = npcProfile(life, person);
  return person.bond.trust >= 68 && person.bond.resentment < 24 && profile.status !== 'employed' &&
    visibleConcerns(life, person.id).every((entry) => entry.severity < 38);
}

export function advanceRelationships(life: Life) {
  for (const [id, state] of Object.entries(life.social.relationships)) {
    const person = findContact(life, id);
    if (!person?.alive || !knownRelationship(life, person)) continue;
    if (state.visit && state.visit.year < life.year) delete state.visit;
    if (state.move && state.move.year <= life.year) {
      const city: City | undefined = state.move.city;
      if (city && city === life.character.city && person.city !== city && activeFor(life, id) && !inConflict(life, id)) {
        life.social.profiles[id]!.movedFrom = person.city;
        person.city = city;
        recordNotice(life, 'community', 'A Move Together', `${person.name} followed through on our conversation and moved to ${city}.`);
      }
      delete state.move;
    }
    if (state.promise?.status === 'pending' && life.year > state.promise.due) {
      state.promise.status = 'broken';
      person.bond.trust = clamp(person.bond.trust - 10);
      openConcern(life, id, 'promise', 45);
      relationshipMemory(life, id, 'promise', -10, true);
      recordNotice(life, 'community', 'A Broken Promise', `I failed to follow through on my promise to ${person.name}. They noticed.`);
    }
  }
  for (const romance of life.social.romances) {
    const person = findContact(life, romance.person);
    if (!person?.alive || !activeFor(life, person.id)) continue;
    const state = relationshipState(life, person.id);
    const profile = npcProfile(life, person);
    const years = life.year - Math.max(romance.started, state?.lastMeaningful ?? profile.lastInteraction);
    const age = life.year - romance.started;
    let issue: [Concern, number] | undefined;
    if (years >= 2) issue = ['neglect', Math.min(84, 23 + years * 8)];
    else if (age >= 2 && romance.status === 'married' && outstanding(life) >= 4000) issue = ['money', 35 + Math.min(25, Math.floor(outstanding(life) / 4000))];
    else if (age >= 2 && person.city !== life.character.city) issue = ['distance', 38];
    else if ((life.career.current?.hours ?? 0) > 45 && life.character.attributes.stress >= 60) issue = ['workload', 40];
    else if (romance.status === 'married' && life.character.attributes.stress >= 65 &&
      Object.values(life.social.children).some((child) => !child.supportEnded && child.wellbeing < 55)) issue = ['parenting', 36];
    else if (age >= 3 && Math.abs(profile.traits.ambition - life.character.attributes.discipline) >= 58) issue = ['goals', 36];
    else if (age >= 2 && agreementFor(life, person.id) === 'casual' && profile.traits.loyalty >= 72 &&
      life.social.romances.some((other) => other.person !== person.id && activeFor(life, other.person))) issue = ['jealousy', 32];
    if (issue) {
      const conflict = visibleConcerns(life, person.id).find((entry) => entry.kind === issue[0]);
      if (!conflict || conflict.updated < life.year - 1 || conflict.state === 'open') openConcern(life, person.id, ...issue);
    }
  }
}

function inConflict(life: Life, id: string) {
  return visibleConcerns(life, id).some((entry) => entry.severity >= 55);
}
