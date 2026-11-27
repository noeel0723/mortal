import { jobs, jobById } from '../data/jobs.ts';
import { employers } from '../data/employers.ts';
import { cities, genders, givenNames, surnames } from '../data/veyra.ts';
import { contactIdentity } from './appearance.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { indexedCents, localExpense, marketSalaryFactor } from './pricing.ts';
import { seededRandom } from './random.ts';
import { national } from './world.ts';
import type { WorldState } from './worldTypes.ts';
import { traits } from './socialTypes.ts';
import type { NpcProfile, SocialPerson, SocialState, Traits } from './socialTypes.ts';
import type { Contact, Life } from './types.ts';

export const npcAnnualLimit = 18;
export const newPeopleLimit = 36;
export const interests = ['reading', 'cooking', 'hiking', 'music', 'sketching', 'chess', 'gardening', 'photography'] as const;
const savings = { 'working-class': 15500, 'middle-income': 41500, affluent: 82000 };

export function allContacts(life: Life): Contact[] {
  return [...life.family, ...life.schoolContacts, ...life.career.contacts, ...life.communityFriends, ...(life.social?.people ?? [])];
}

export function newSocial(life: Pick<Life, 'family'>): SocialState {
  return { people: [], profiles: {}, parents: { self: life.family.map(({ id }) => id) }, children: {}, romances: [], pendingPerson: null };
}

export function npcRandom(life: Life, key: string, year = 0) {
  let seed = life.seed ^ Math.imul(year, 0x9e3779b9);
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return seededRandom(seed);
}

export function isParent(life: Life, id: string) {
  return life.social.parents.self?.includes(id) ?? false;
}

export function isFamily(life: Life, id: string) {
  if (life.family.some((person) => person.id === id) || isParent(life, id)) return true;
  if (life.social.parents[id]?.includes('self')) return true;
  if (life.social.people.some((person) => person.id === id && (person.role === 'Sibling' || person.role === 'Grandparent'))) return true;
  return life.social.romances.some((entry) => entry.person === id && entry.status === 'married');
}

export function npcProfile(life: Life, person: Contact): NpcProfile {
  if (Object.hasOwn(life.social.profiles, person.id)) return life.social.profiles[person.id]!;
  const random = npcRandom(life, person.id);
  const traitsForPerson = Object.fromEntries(traits.map((trait) => [trait, random.integer(18, 92)])) as Traits;
  const parent = isParent(life, person.id);
  const teacher = person.role === 'Teacher' || person.role === 'Professor';
  const work = 'employerId' in person;
  const adult = person.age >= 18;
  const educated = ('stage' in person && person.graduationAge !== undefined && person.age >= person.graduationAge);
  const education = person.age < 6 ? 'Early childhood' : !adult ? 'School' : teacher ? 'Postgraduate' :
    educated && person.stage === 'undergraduate' ? 'Undergraduate' : educated && person.stage === 'postgraduate' ? 'Postgraduate' :
      educated && person.stage === 'vocational' ? 'Vocational' : 'High school';
  const status = !adult ? 'student' : parent || teacher || work ? 'employed' : 'seeking';
  const knownAge = parent ? 0 : Math.min(life.character.age, 'stage' in person && person.stage === 'primary' ? 6 :
    'stage' in person && person.stage === 'secondary' ? 12 : 'stage' in person && person.stage === 'high' ? 15 : life.character.age);
  const met = life.character.birthYear + knownAge;
  const hobby = random.pick(interests);
  return {
    traits: traitsForPerson, interests: [hobby, random.pick(interests.filter((item) => item !== hobby) as [string, ...string[]])],
    preferences: random.next() < .33 ? [...genders] : [...new Set([random.pick(genders), random.pick(genders)])],
    education, status, job: null, experience: 0,
    income: status === 'employed' ? parent ? 36000 + Math.floor(savings[life.character.background] * .5) : 53000 : 0,
    savings: parent ? savings[life.character.background] + Math.min(24, Math.max(0, person.age - 39)) * 520 : adult ? random.integer(1500, 18500) : 0,
    expenses: adult ? 36000 : 0, commitments: 0,
    born: parent ? Math.min(life.character.birthYear - 18, life.year - person.age) : life.year - person.age,
    met, friendsSince: 'friend' in person && person.friend ? met : null, lastInteraction: life.year, formerFriend: false,
    memories: [], conflicts: 0, localPartner: null,
  };
}

export function ensureNpc(life: Life, person: Contact) {
  return life.social.profiles[person.id] ??= npcProfile(life, person);
}

export function syncNpcs(life: Life) {
  for (const person of allContacts(life)) ensureNpc(life, person);
}

export function cloneSocial(social: SocialState): SocialState {
  return {
    ...social, people: social.people.map((person) => ({ ...person, bond: { ...person.bond } })),
    profiles: Object.fromEntries(Object.entries(social.profiles).map(([id, profile]) => [id, { ...profile, memories: [...profile.memories] }])),
    parents: { ...social.parents }, children: Object.fromEntries(Object.entries(social.children).map(([id, child]) => [id, { ...child }])),
    romances: social.romances.map((entry) => ({ ...entry, history: [...entry.history] })),
  };
}

export function makeNpc(life: Life, id: string, age: number, role: SocialPerson['role'], name?: string): SocialPerson {
  const random = npcRandom(life, id);
  const gender = random.pick(genders);
  const display = name ?? `${random.pick(givenNames[gender])} ${random.pick(surnames)}`;
  return { id, name: display, role, ...contactIdentity(life.seed, id, display, role), friend: false, age,
    city: life.character.city, alive: true, health: random.integer(75, 96), occupation: age < 6 ? 'At home' : age < 18 ? 'Student' : 'Job seeker',
    bond: { affection: role === 'Acquaintance' ? 40 : 73, trust: role === 'Acquaintance' ? 35 : 73,
      familiarity: 20, compatibility: random.integer(48, 88), respect: 48, resentment: 0 } };
}

export function remember(life: Life, person: Contact, text: string, conflict = false) {
  const profile = ensureNpc(life, person);
  profile.lastInteraction = life.year;
  profile.memories = [...profile.memories.slice(-11), { year: life.year, text }];
  if (conflict) profile.conflicts++;
}

export function ageNewPeople(life: Life, maxAge: number) {
  for (const person of life.social.people) {
    if (!person.alive) continue;
    person.age++;
    if (person.age > 61) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) {
      person.alive = false;
      recordNotice(life, isFamily(life, person.id) ? 'family' : 'community', 'A Loss', `${person.name} died at age ${person.age}.`);
    }
    const child = life.social.children[person.id];
    if (child && person.alive && person.age <= 18) {
      const profile = ensureNpc(life, person);
      child.wellbeing = clamp(child.wellbeing + (person.health < 45 ? -2 : 1));
      child.learning = clamp(child.learning + (person.age < 6 ? 2 : profile.traits.discipline >= 60 ? 4 : 3));
      child.confidence = clamp(child.confidence + (profile.traits.confidence >= 55 ? 2 : 1));
    }
  }
}

const levels = { 'high-school': 2, vocational: 3, undergraduate: 4, postgraduate: 5 };
const educationLevel = { 'Early childhood': 0, School: 1, 'High school': 2, Vocational: 3, Undergraduate: 4, Postgraduate: 5 };

export function advanceNpcLives(life: Life, elapsedWorld: WorldState = life.world) {
  const contacts = allContacts(life);
  const byId = new Map(contacts.map((person) => [person.id, person]));
  for (const [id, child] of Object.entries(life.social.children)) {
    const person = byId.get(id);
    if (child.supportEnded || (person?.alive && person.age <= 18)) continue;
    child.supportEnded = true;
    for (const parent of life.social.parents[id] ?? []) {
      const profile = life.social.profiles[parent];
      if (profile) profile.commitments = Math.max(0, profile.commitments - 2000);
    }
  }
  const partners = new Set(life.social.romances.filter(({ ended }) => ended === null).map(({ person }) => person));
  const coParents = new Set(Object.keys(life.social.children).flatMap((id) => life.social.parents[id] ?? []));
  const priority = (id: string) => isFamily(life, id) || partners.has(id) || coParents.has(id);
  const important = contacts.filter((person) => person.alive && (priority(person.id) ||
    ('friend' in person && person.friend) || ('stage' in person && person.stage === 'high') || 'employerId' in person));
  important.sort((a, b) => Number(priority(b.id)) - Number(priority(a.id)));
  let updates = 0;
  for (const person of important.slice(0, npcAnnualLimit)) {
    const profile = ensureNpc(life, person);
    const random = npcRandom(life, person.id, life.year);
    const family = isFamily(life, person.id);
    const close = family || partners.has(person.id) || ('friend' in person && person.friend);
    const graduation = 'stage' in person ? person.graduationAge ?? 18 : 18;
    if (person.age < 18 || ('stage' in person && person.role === 'Student' && person.age < graduation)) {
      profile.education = person.age < 6 ? 'Early childhood' : 'School';
      if ('friend' in person && (person.role === 'Child' || person.role === 'Sibling')) {
        person.occupation = person.age < 6 ? 'At home' : 'Student';
        if (person.age === 6 || person.age === 12 || person.age === 15) remember(life, person, 'Started a new school stage.');
      }
      continue;
    }
    if (profile.education === 'School' || profile.education === 'Early childhood') profile.education = 'High school';
    if ('stage' in person && person.age === graduation) {
      if (person.stage === 'undergraduate') profile.education = 'Undergraduate';
      if (person.stage === 'postgraduate') profile.education = 'Postgraduate';
      if (person.stage === 'vocational') profile.education = 'Vocational';
    }
    if (profile.status === 'student') profile.status = 'seeking';
    if (person.age === 18 && person.role === 'Sibling') recordNotice(life, 'family', 'Sibling Graduation', `${person.name} finished high school.`);
    const expenses = profile.status === 'retired' ? 22000 : 36000;
    profile.savings = Math.min(20000000, Math.max(0, profile.savings + profile.income -
      localExpense(elapsedWorld, person.city, expenses) - profile.commitments));
    const market = life.world.cities[person.city];
    const economy = national(life.world);
    if (person.age >= 65 && profile.status !== 'retired' && (person.age >= 70 || random.next() < .42)) {
      profile.status = 'retired';
      profile.job = null;
      profile.income = indexedCents(12000, Math.round(10000 + (economy.priceIndex - 10000) * .45));
      person.occupation = 'Retired';
    } else if (profile.status !== 'retired' && person.age >= graduation + 2 && (!('employerId' in person) || !life.career.current || person.employerId !== life.career.current.employerId)) {
      const current = profile.job ? jobById.get(profile.job) : undefined;
      const company = 'employerId' in person ? life.world.employers[person.employerId] : undefined;
      const demand = current ? life.world.industries[current.industry].demand : company?.demand ?? market.jobs;
      const downturn = economy.regime === 'crisis' || economy.regime === 'recession';
      const lostJob = profile.status === 'employed' && downturn && demand < 44 && random.next() < (45 - demand) / 210;
      if (lostJob) {
        profile.status = 'seeking';
        profile.job = null;
        profile.income = 0;
        person.occupation = 'Job seeker';
        if (close && updates < 2) {
          recordNotice(life, 'community', 'A Job Lost', `${person.name} lost their job during the downturn and is looking for work.`);
          updates++;
        }
      }
      const fits = (job: typeof jobs[number]) => person.age >= job.age && job.experience <= profile.experience &&
        (!job.qualification || levels[job.qualification] <= educationLevel[profile.education]) && !job.tags.length;
      const promoted = profile.status === 'employed' && current && random.next() < (profile.traits.ambition + profile.traits.discipline) / 900 * (demand / 55)
        ? current.promotions.map((id) => jobById.get(id)!).find(fits) : undefined;
      const canChange = profile.status === 'seeking' ? !lostJob && random.next() < Math.max(.18, Math.min(.82, .65 + (market.jobs - 53) / 105)) :
        (!current && (person.occupation === 'Employed' || person.occupation === 'Library member')) || random.next() < profile.traits.riskTolerance / 1800;
      const options = promoted || !canChange ? [] : jobs.filter((job) => fits(job) && life.world.industries[job.industry].demand >= 27 &&
        employers.some((employer) => employer.city === person.city && employer.industries.includes(job.industry)));
      const next = promoted ?? options[random.integer(0, Math.max(0, options.length - 1))];
      if (next && next.id !== profile.job) {
        profile.job = next.id;
        profile.status = 'employed';
        const companyId = employers.find((employer) => employer.city === person.city && employer.industries.includes(next.industry))?.id;
        profile.income = indexedCents((next.salary[0] + next.salary[1]) / 2, marketSalaryFactor(life.world, next, companyId ?? ''));
        person.occupation = next.title;
        if (close && promoted && updates < 2) {
          recordNotice(life, 'community', 'A Promotion', `${person.name} was promoted to ${next.title}.`);
          updates++;
        }
      } else if (profile.status === 'seeking' && person.age > graduation + 2) person.occupation = 'Job seeker';
    }
    if (profile.status === 'employed') profile.experience++;
    profile.expenses = localExpense(life.world, person.city, profile.status === 'retired' ? 22000 : 36000);
    const linked = profile.localPartner && byId.get(profile.localPartner);
    if (linked && !linked.alive) profile.localPartner = null;
    if (!family && !partners.has(person.id) && person.age >= 20) {
      const previous = person.city;
      if (!('employerId' in person) && random.next() < .012) person.city = random.pick(cities);
      if (previous !== person.city) {
        profile.movedFrom = previous;
        if (close && updates < 2) {
          recordNotice(life, 'community', 'A Friend Relocates', `${person.name} moved to ${person.city}.`);
          updates++;
        }
      }
      if (profile.localPartner && random.next() < .08) {
        const other = life.social.profiles[profile.localPartner];
        if (other) other.localPartner = null;
        profile.localPartner = null;
      } else if (!profile.localPartner && random.next() < profile.traits.sociability / 2200) {
        const other = important.find((candidate) => candidate.id !== person.id && candidate.age >= 21 && candidate.city === person.city && !isFamily(life, candidate.id) &&
          !partners.has(candidate.id) && !ensureNpc(life, candidate).localPartner &&
          profile.preferences.includes(candidate.gender) && ensureNpc(life, candidate).preferences.includes(person.gender));
        if (other) {
          profile.localPartner = other.id;
          ensureNpc(life, other).localPartner = person.id;
        }
      }
    }
    if ('friend' in person && person.friend && !family && !partners.has(person.id) && life.year - profile.lastInteraction > 5) {
      person.bond.affection = clamp(person.bond.affection - (profile.traits.loyalty > 65 ? 1 : 2));
      if (person.bond.affection < 24) profile.formerFriend = true;
    }
  }
  for (const entry of life.social.romances) {
    if (entry.ended !== null || byId.get(entry.person)?.alive) continue;
    entry.status = entry.status === 'interest' ? 'broken-up' : 'widowed';
    entry.ended = life.year;
    entry.history = [...entry.history.slice(-29), { year: life.year, text: 'The relationship ended after their death.' }];
  }
}
