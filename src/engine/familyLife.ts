import { recordNotice, resultMeter } from './eventNotices.ts';
import { adoptionCandidates, adoptionIssue, adoptChild } from './adoption.ts';
import { supportChildHobby } from './childSkills.ts';
import { advanceFamilyNetwork } from './familyNetwork.ts';
import { childStaysWithPlayer, familyPlanningWillingness } from './household.ts';
import { setSurname } from './familyNames.ts';
import { clamp } from './journal.ts';
import { romanceFor } from './love.ts';
import { communicationEnded, inPersonIssue, meaningfulTime, openConcern, recentConnections, takingSpace, trackConnection } from './relationships.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import { pregnancyFactor } from './reproductiveHealth.ts';
import { ensureNpc, makeNpc, newPeopleLimit, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import { pickStory } from './stories.ts';
import type { SocialAction, SocialPerson } from './socialTypes.ts';
import type { Contact, Life } from './types.ts';

export const parenting = {
  care: { label: 'Care for Child', age: 0, health: 5, trust: 2, cost: 0 },
  read: { label: 'Read Together', age: 0, health: 0, trust: 3, cost: 0 },
  school: { label: 'Help with School', age: 6, health: 0, trust: 4, cost: 0 },
  hobby: { label: 'Encourage a Hobby', age: 4, health: 0, trust: 2, cost: 0 },
  lesson: { label: 'Pay for Hobby Lessons', age: 7, health: 0, trust: 3, cost: 750 },
  support: { label: 'Offer Support', age: 3, health: 2, trust: 4, cost: 0 },
  future: { label: 'Discuss Their Future', age: 12, health: 0, trust: 5, cost: 0 },
} as const;
export const adoptionCost = 3500;
export type FamilyAction = Extract<SocialAction, { type: 'plan-child' | 'parent-child' }>;

export function parentingAgeIssue(person: Contact, action: keyof typeof parenting) {
  if (!Object.hasOwn(parenting, action)) return 'Choose a parenting activity.';
  if (person.age < parenting[action].age) return `Available when your child turns ${parenting[action].age}.`;
  const lastAge = { care: 5, read: 5, school: 12, hobby: 12, lesson: 17, support: 17, future: 17 }[action];
  return person.age > lastAge ? 'Choose an activity for their current stage of life.' : null;
}

export function ageFamilyOpportunities(life: Life) {
  const age = life.character.age;
  advanceFamilyNetwork(life);
  if (age === 2 && life.family.length && !life.social.parents[life.family[0]!.id]) {
    const parent = life.family[0]!;
    const elder = makeNpc(life, 'npc-grandparent-1', parent.age + 23, 'Grandparent');
    if (parent.alive && elder.age < 90) {
      life.social.people.push(elder);
      ensureNpc(life, elder);
      life.social.parents[parent.id] = [elder.id];
    }
  }
  const siblings = life.social.people.filter(({ role }) => role === 'Sibling').length;
  const living = life.family.filter(({ alive }) => alive);
  if (age < 3 || age > 13 || siblings >= 3 || !living.length || life.social.people.length >= newPeopleLimit - 3 ||
    npcRandom(life, 'sibling', life.year).next() > (siblings ? .07 : .18)) return;
  const step = life.social.unions?.find(({ people, married }) => married && people.includes(living[0]!.id));
  const parents = living.length === 2 ? living.map(({ id }) => id) : step?.people;
  if (!parents?.length || parents.some((id) => !findContact(life, id)?.alive)) return;
  const sibling = makeNpc(life, `npc-sibling-${life.year}`, 0, 'Sibling');
  life.social.people.push(sibling);
  ensureNpc(life, sibling);
  life.social.parents[sibling.id] = [...parents];
  recordNotice(life, 'family', 'A New Sibling', `${sibling.name} was born and joined our family.`);
}

export function annualChildcare(life: Life) {
  const children = life.social.people.filter((person) =>
    person.alive && person.age <= 18 && Object.hasOwn(life.social.children, person.id) && childStaysWithPlayer(life, person.id));
  return children.reduce((total, child) => total + (child.age <= 5 ? 7600 : 5300), 0);
}

export function roomForChild(life: Life) {
  const expected = life.social.pregnancies?.length ?? 0;
  return Object.keys(life.social.children).length + expected < 4 && life.social.people.length + expected < newPeopleLimit;
}

function welcomeChild(life: Life, partner: Contact, age: number, adopted: boolean, name?: string) {
  const id = `npc-child-${life.year}-${Object.keys(life.social.children).length + 1}`;
  const surname = life.character.lastName;
  const child = makeNpc(life, id, age, 'Child', name ? `${name} ${surname}` : undefined);
  if (name) child.lastName = surname;
  else setSurname(child, surname);
  registerChild(life, child, partner, adopted);
  return child;
}

export function registerChild(life: Life, child: SocialPerson, partner: Contact | undefined, adopted: boolean, learning = 15 + child.age * 3, fee = adoptionCost) {
  life.social.people.push(child);
  life.social.parents[child.id] = partner ? ['self', partner.id] : ['self'];
  life.social.children[child.id] = {
    year: life.year, adopted, wellbeing: child.health, learning, confidence: 30 + child.age * 2, supportEnded: false,
  };
  const subject = partner ? `${partner.name} and I` : 'I';
  const story = adopted ? `${subject} adopted ${child.name}.` : `${subject} welcomed ${child.name} into our family.`;
  if (partner?.alive) {
    ensureNpc(life, partner).commitments += 2000;
    remember(life, partner, story);
  }
  remember(life, child, adopted ? 'Joined the family through adoption.' : 'Born into the family.');
  const notice = recordNotice(life, 'family', adopted ? 'Adoption Day' : 'A New Arrival', story,
    { happiness: 8, bank: adopted ? -fee : 0 }, 'personal');
  if (!adopted) notice.details = { kind: 'birth', person: child.id };
}

function eligiblePregnancy(life: Life, partner: Contact) {
  const player = life.character;
  const mother = player.gender === 'woman' && partner.gender === 'man' ? 'self' :
    player.gender === 'man' && partner.gender === 'woman' ? partner.id : undefined;
  if (!mother || player.age < 18 || partner.age < 18 || !partner.alive ||
    (mother === 'self' ? player.age : partner.age) > 45 || !roomForChild(life) ||
    life.social.pregnancies?.some((entry) => entry.mother === mother)) return;
  return mother;
}

export function chanceOfPregnancy(life: Life, partner: Contact, entry = life.journal.length, barrier = false, name?: string) {
  const mother = eligiblePregnancy(life, partner);
  if (!mother || npcRandom(life, `pregnancy:${partner.id}:${entry}`, life.year).next() >= .22 * pregnancyFactor(life, mother, barrier)) return false;
  const father = mother === 'self' ? partner.id : 'self';
  life.social.pregnancies = [...(life.social.pregnancies ?? []), { mother, father, dueYear: life.year + 1, ...(name ? { name } : {}) }];
  const news = mother === 'self' ? 'I found out I’m pregnant.' : `${partner.name} told me she’s pregnant.`;
  recordNotice(life, 'family', 'Pregnancy', `${news} The baby is due in nine months. The birth will happen the next time I age up.`);
  return true;
}

export function deliverPregnancies(life: Life) {
  const pregnancies = life.social.pregnancies;
  if (!pregnancies?.length) return;
  const remaining = pregnancies.filter(({ dueYear }) => dueYear > life.year);
  if (remaining.length) life.social.pregnancies = remaining;
  else delete life.social.pregnancies;
  if (life.character.causeOfDeath) return;
  for (const { mother, father, dueYear, name } of pregnancies) {
    if (dueYear > life.year) continue;
    const partner = findContact(life, mother === 'self' ? father : mother);
    if (!partner) continue;
    if (mother !== 'self' && !partner.alive) {
      recordNotice(life, 'family', 'Pregnancy Loss', `After ${partner.name} died, I learned that we had lost the pregnancy as well.`);
    } else {
      const child = welcomeChild(life, partner, 0, false, name);
      if (partner.alive && (partner.city !== life.character.city || life.social.household?.living === 'separate')) {
        const residence = mother === 'self' ? 'player' : 'other';
        child.city = residence === 'player' ? life.character.city : partner.city;
        (life.social.custody ??= {})[child.id] = { other: partner.id, residence, since: life.year };
      }
    }
  }
}

export function familyIssue(life: Life, action: FamilyAction): string | null {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  const person = findContact(life, action.person);
  if (!person?.alive) return 'This person is unavailable.';
  if (action.type === 'plan-child') {
    if (life.character.age < 18 || person.age < 18 || romanceFor(life, person.id)?.status !== 'married') return 'Available to adult spouses.';
    const meeting = inPersonIssue(life, person);
    if (meeting) return meeting;
    if (!roomForChild(life)) return 'Your household is full.';
    if (life.usedActions.includes('family-planning')) return 'You already discussed family planning this year.';
    if (action.name !== undefined && (!/^\p{L}[\p{L}\p{M} '’.-]{0,27}$/u.test(action.name.trim()))) return 'Enter a name using 1–28 letters.';
    if (action.method === 'adoption') return adoptionIssue(life);
    return eligiblePregnancy(life, person) ? null : 'A pregnancy cannot be scheduled right now. You can explore adoption.';
  }
  if (!life.social.parents[person.id]?.includes('self')) return 'Available with your children.';
  if (communicationEnded(life, person.id) || takingSpace(life, person.id)) return 'They need some space right now.';
  const ageIssue = parentingAgeIssue(person, action.action);
  if (ageIssue) return ageIssue;
  if ((action.action === 'read' || action.action === 'care' || action.action === 'school') && inPersonIssue(life, person)) return inPersonIssue(life, person);
  return life.character.bank < parenting[action.action].cost ? 'Your balance does not cover this activity.' : null;
}

export function applyFamily(life: Life, action: FamilyAction) {
  const issue = familyIssue(life, action);
  if (issue) return issue;
  const person = findContact(life, action.person)!;
  const name = person.name;
  if (action.type === 'plan-child') {
    const profile = ensureNpc(life, person);
    const random = npcRandom(life, `planning:${person.id}`, life.year);
    const chance = Math.min(93, Math.max(10, familyPlanningWillingness(life, person) + profile.traits.loyalty * .20));
    if (random.next() * 100 >= chance) {
      life.usedActions.push('family-planning');
      const story = `${name} told me they were not ready to raise a child. We agreed to give the decision more time.`;
      remember(life, person, story);
      recordNotice(life, 'family', 'Family Planning', story);
      return null;
    }
    if (action.method === 'adoption') {
      const candidate = adoptionCandidates(life)[0];
      if (!candidate) return 'No child profiles are available right now.';
      const applicationIssue = adoptChild(life, candidate.person.id, person.id);
      if (applicationIssue) return applicationIssue;
    } else if (!chanceOfPregnancy(life, person, life.journal.length, false, action.name?.trim())) {
      recordNotice(life, 'family', 'Family Planning', `${name} and I agreed to try for a child. There was no pregnancy this year.`);
    }
    life.usedActions.push('family-planning');
    return null;
  }
  const item = parenting[action.action];
  const child = life.social.children[person.id]!;
  const before = person.bond.trust;
  const activity = { key: `parenting:${action.action}`, location: action.action === 'care' || action.action === 'read' ? 'local' : 'remote' } as const;
  const unavailable = action.action !== 'care' && availability(life, person, activity);
  if (unavailable) {
    recordNotice(life, 'family', 'Maybe Another Time', `${name} wasn’t ready to do this right now. ${unavailable.reason}`);
    return null;
  }
  const outcome = contextualOutcome(life, person, activity);
  const repeats = recentConnections(life, person.id);
  const impact = outcome.weight > 0 ? outcome.weight * Math.max(.22, 1 - repeats * .13) : outcome.weight;
  const stories = {
    care: [`I made sure ${name} had what they needed and spent some quiet time with them.`, `I took care of ${name} and checked how they were feeling.`],
    read: [`I reread ${name}’s favorite story with them.`, `${name} and I took turns choosing what to read together.`],
    school: [`I helped ${name} break a difficult assignment into smaller steps.`, `I reviewed school notes with ${name} and asked them to explain what they had learned.`],
    hobby: [`I helped ${name} make time for a hobby they enjoy.`, `I asked ${name} to show me what they had been working on in their spare time.`],
    lesson: [`I paid for lessons that interested ${name}.`, `I helped ${name} find a class they could enjoy after school.`],
    support: [`I listened to ${name} and asked what kind of help they wanted.`, `I checked in with ${name} after a hard day and let them talk at their own pace.`],
    future: [`I talked with ${name} about what they wanted to try next year.`, `I helped ${name} think about one step they could take toward a goal.`],
  };
  const hobby = action.action === 'hobby' || action.action === 'lesson' ? supportChildHobby(life, person, action.action === 'lesson') : undefined;
  const base = pickStory(life, `parenting:${person.id}:${action.action}`, stories[action.action]);
  const story = `${base}${hobby ? ` They chose to work on ${hobby.name}.` : ''} ${outcome.note}`;
  trackConnection(life, person.id);
  person.bond.trust = clamp(before + Math.round(item.trust * impact));
  person.bond.affection = clamp(person.bond.affection + Math.round(3 * impact));
  person.health = clamp(person.health + Math.round(item.health * Math.max(0, impact)));
  if (action.action === 'read' || action.action === 'school') child.learning = clamp(child.learning + Math.round((action.action === 'school' ? 5 : 3) * impact));
  else if (action.action === 'hobby' || action.action === 'lesson' || action.action === 'future') child.confidence = clamp(child.confidence + Math.round(4 * impact));
  else child.wellbeing = clamp(child.wellbeing + Math.round(3 * impact));
  if (impact > 0) meaningfulTime(life, person, 'support', 3);
  if (impact < -.4) openConcern(life, person.id, 'parenting', 34);
  remember(life, person, story);
  const notice = recordNotice(life, 'family', item.label, story, { happiness: Math.round(3 * impact), bank: -item.cost }, action.action === 'lesson' ? 'training' : 'relationships');
  notice.meter = hobby ? resultMeter(hobby.name, hobby.before, hobby.proficiency) : resultMeter('Trust', before, person.bond.trust);
  return null;
}
