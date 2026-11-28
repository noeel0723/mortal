import { recordNotice, resultMeter } from './eventNotices.ts';
import { supportChildHobby } from './childSkills.ts';
import { setSurname } from './familyNames.ts';
import { clamp } from './journal.ts';
import { romanceFor } from './love.ts';
import { inPersonIssue } from './relationships.ts';
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
  gift: { label: 'Give a Gift', age: 3, health: 0, trust: 2, cost: 500 },
  support: { label: 'Offer Support', age: 3, health: 2, trust: 4, cost: 0 },
  future: { label: 'Discuss Their Future', age: 12, health: 0, trust: 5, cost: 0 },
} as const;
export const adoptionCost = 3500;
export type FamilyAction = Extract<SocialAction, { type: 'plan-child' | 'parent-child' }>;

export function ageFamilyOpportunities(life: Life) {
  const age = life.character.age;
  if (age === 2 && life.family.length && !life.social.parents[life.family[0]!.id]) {
    const parent = life.family[0]!;
    const elder = makeNpc(life, 'npc-grandparent-1', parent.age + 23, 'Grandparent');
    if (parent.alive && elder.age < 90) {
      life.social.people.push(elder);
      ensureNpc(life, elder);
      life.social.parents[parent.id] = [elder.id];
    }
  }
  if (age < 3 || age > 9 || life.family.filter(({ alive }) => alive).length !== 2 ||
    life.social.people.some(({ role }) => role === 'Sibling') || npcRandom(life, 'sibling', life.year).next() > .18) return;
  const sibling = makeNpc(life, `npc-sibling-${life.year}`, 0, 'Sibling');
  life.social.people.push(sibling);
  ensureNpc(life, sibling);
  life.social.parents[sibling.id] = [...life.social.parents.self!];
  recordNotice(life, 'family', 'A New Sibling', `${sibling.name} was born and joined our family.`);
}

export function annualChildcare(life: Life) {
  const children = life.social.people.filter((person) =>
    person.alive && person.age <= 18 && Object.hasOwn(life.social.children, person.id));
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
}

export function registerChild(life: Life, child: SocialPerson, partner: Contact | undefined, adopted: boolean, learning = 15 + child.age * 3) {
  life.social.people.push(child);
  life.social.parents[child.id] = partner ? ['self', partner.id] : ['self'];
  life.social.children[child.id] = {
    year: life.year, adopted, wellbeing: child.health, learning, confidence: 30 + child.age * 2, supportEnded: false,
  };
  const subject = partner ? `${partner.name} and I` : 'I';
  const story = adopted ? `${subject} adopted ${child.name}.` : `${subject} welcomed ${child.name} into our family.`;
  if (partner) {
    ensureNpc(life, partner).commitments += 2000;
    remember(life, partner, story);
  }
  remember(life, child, adopted ? 'Joined the family through adoption.' : 'Born into the family.');
  const notice = recordNotice(life, 'family', adopted ? 'Adoption Day' : 'A New Arrival', story,
    { happiness: 8, bank: adopted ? -adoptionCost : 0 }, 'personal');
  if (!adopted) notice.details = { kind: 'birth', person: child.id };
}

export function chanceOfPregnancy(life: Life, partner: Contact, entry = life.journal.length) {
  const player = life.character;
  const mother = player.gender === 'woman' && partner.gender === 'man' ? 'self' :
    player.gender === 'man' && partner.gender === 'woman' ? partner.id : undefined;
  if (!mother || player.age < 18 || partner.age < 18 || !partner.alive ||
    (mother === 'self' ? player.age : partner.age) > 45 || !roomForChild(life) ||
    life.social.pregnancies?.some((entry) => entry.mother === mother)) return;
  const random = npcRandom(life, `pregnancy:${partner.id}:${entry}`, life.year);
  if (random.next() >= .22) return;
  const father = mother === 'self' ? partner.id : 'self';
  life.social.pregnancies = [...(life.social.pregnancies ?? []), { mother, father, dueYear: life.year + 1 }];
  const news = mother === 'self' ? 'I found out I’m pregnant.' : `${partner.name} told me she’s pregnant.`;
  recordNotice(life, 'family', 'Pregnancy', `${news} The baby is due in nine months. The birth will happen the next time I age up.`);
}

export function deliverPregnancies(life: Life) {
  const pregnancies = life.social.pregnancies;
  if (!pregnancies?.length) return;
  const remaining = pregnancies.filter(({ dueYear }) => dueYear > life.year);
  if (remaining.length) life.social.pregnancies = remaining;
  else delete life.social.pregnancies;
  if (life.character.causeOfDeath) return;
  for (const { mother, father, dueYear } of pregnancies) {
    if (dueYear > life.year) continue;
    const partner = findContact(life, mother === 'self' ? father : mother);
    if (!partner) continue;
    if (mother !== 'self' && !partner.alive) {
      recordNotice(life, 'family', 'Pregnancy Loss', `After ${partner.name} died, I learned that we had lost the pregnancy as well.`);
    } else welcomeChild(life, partner, 0, false);
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
    return action.method === 'adoption' && life.character.bank < adoptionCost ? 'Your balance does not cover adoption.' : null;
  }
  if (!life.social.parents[person.id]?.includes('self')) return 'Available with your children.';
  if (person.age < parenting[action.action].age) return `Available when your child turns ${parenting[action.action].age}.`;
  if (action.action === 'school' && person.age >= 18) return 'Available while your child is in school.';
  if (action.action === 'lesson' && person.age >= 18) return 'Available to children under 18.';
  if (life.usedActions.includes(`parenting:${person.id}:${action.action}`)) return 'Available again next year.';
  if (life.character.attributes.energy < 5) return 'You need 5 energy.';
  return life.character.bank < parenting[action.action].cost ? 'Your balance does not cover this activity.' : null;
}

export function applyFamily(life: Life, action: FamilyAction) {
  const issue = familyIssue(life, action);
  if (issue) return issue;
  const person = findContact(life, action.person)!;
  const name = person.name;
  if (action.type === 'plan-child') {
    life.usedActions.push('family-planning');
    const profile = ensureNpc(life, person);
    const random = npcRandom(life, `planning:${person.id}`, life.year);
    const chance = Math.min(93, Math.max(10, person.bond.trust * .55 + person.bond.affection * .35 + profile.traits.loyalty * .2 -
      person.bond.resentment * .55));
    if (random.next() * 100 >= chance) {
      const story = `${name} told me they were not ready to raise a child. We agreed to give the decision more time.`;
      remember(life, person, story);
      recordNotice(life, 'family', 'Family Planning', story);
      return null;
    }
    const adopted = action.method === 'adoption';
    const age = adopted ? random.integer(0, Math.min(7, life.character.age - 18, person.age - 18)) : 0;
    welcomeChild(life, person, age, adopted, action.name?.trim());
    return null;
  }
  const item = parenting[action.action];
  const child = life.social.children[person.id]!;
  const before = person.bond.trust;
  const stories = {
    care: [`I made sure ${name} had what they needed and spent some quiet time with them.`, `I took care of ${name} and checked how they were feeling.`],
    read: [`I reread ${name}’s favorite story with them.`, `${name} and I took turns choosing what to read together.`],
    school: [`I helped ${name} break a difficult assignment into smaller steps.`, `I reviewed school notes with ${name} and asked them to explain what they had learned.`],
    hobby: [`I helped ${name} make time for a hobby they enjoy.`, `I asked ${name} to show me what they had been working on in their spare time.`],
    lesson: [`I paid for lessons that interested ${name}.`, `I helped ${name} find a class they could enjoy after school.`],
    gift: [`I gave ${name} a gift I thought they would use.`, `I surprised ${name} with something they had been saving up for.`],
    support: [`I listened to ${name} and asked what kind of help they wanted.`, `I checked in with ${name} after a hard day and let them talk at their own pace.`],
    future: [`I talked with ${name} about what they wanted to try next year.`, `I helped ${name} think about one step they could take toward a goal.`],
  };
  const hobby = action.action === 'hobby' || action.action === 'lesson' ? supportChildHobby(life, person, action.action === 'lesson') : undefined;
  const base = pickStory(life, `parenting:${person.id}:${action.action}`, stories[action.action]);
  const story = hobby ? `${base} They chose to work on ${hobby.name}.` : base;
  person.bond.trust = clamp(before + item.trust);
  person.bond.affection = clamp(person.bond.affection + 3);
  person.health = clamp(person.health + item.health);
  if (action.action === 'read' || action.action === 'school') child.learning = clamp(child.learning + (action.action === 'school' ? 5 : 3));
  else if (action.action === 'hobby' || action.action === 'lesson' || action.action === 'future') child.confidence = clamp(child.confidence + 4);
  else child.wellbeing = clamp(child.wellbeing + 3);
  life.usedActions.push(`parenting:${person.id}:${action.action}`);
  remember(life, person, story);
  const notice = recordNotice(life, 'family', item.label, story, { happiness: 3, energy: -5, bank: -item.cost }, action.action === 'lesson' ? 'training' : 'relationships');
  notice.meter = hobby ? resultMeter(hobby.name, hobby.before, hobby.proficiency) : resultMeter('Trust', before, person.bond.trust);
  return null;
}
