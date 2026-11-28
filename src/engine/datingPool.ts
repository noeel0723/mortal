import { jobs } from '../data/jobs.ts';
import { programs } from '../data/academics.ts';
import { npcGivenNames, npcSurnames } from '../data/npcNames.ts';
import { cities, genders } from '../data/veyra.ts';
import { datingAgeOptions, datingWorthOptions } from './dating.ts';
import type { DatingGoal, DatingProfile } from './dating.ts';
import { initialNpcProfile, makeNpc, npcRandom } from './npcs.ts';
import { programYears, qualifiedNpc } from './npcQualifications.ts';
import type { DatingSource, NpcProfile, SocialPerson } from './socialTypes.ts';
import type { Life } from './types.ts';

const ageBands = Object.values(datingAgeOptions).flatMap((option) => 'range' in option ? [option.range] : []);
const peoplePerBand = 6;
export const datingPoolSize = cities.length * ageBands.length * peoplePerBand;
const goals = ['not-looking', 'casual', 'casual', 'long-term', 'long-term', 'marriage', 'companionship', 'undecided'] as const;
const educationLevels = ['Early childhood', 'School', 'High school', 'Vocational', 'Undergraduate', 'Postgraduate'] as const;
const qualifications = ['none', 'school', 'high-school', 'vocational', 'undergraduate', 'postgraduate'];

type Lifestyle = Exclude<DatingProfile['lifestyle'], 'any'>;
export type DatingCandidate = {
  index: number;
  person: SocialPerson;
  profile: NpcProfile & { datingGoal: DatingGoal };
  available: boolean;
  lifestyle: Lifestyle;
};

export function datingCandidate(life: Life, index: number): DatingCandidate {
  const id = `npc-pool-${life.year}-${index}`;
  const random = npcRandom(life, `${id}:dating-details`);
  const city = cities[index % cities.length]!;
  const [min, max] = ageBands[Math.floor(index / (cities.length * peoplePerBand))]!;
  const age = random.integer(min, Math.min(max, 92));
  const gender = random.pick(genders);
  const surnameIndex = (index + Math.floor(npcRandom(life, 'dating-pool-names', life.year).next() * npcSurnames.length)) % npcSurnames.length;
  const lastName = npcSurnames[surnameIndex]!;
  const name = `${random.pick(npcGivenNames[gender])} ${lastName}`;
  const person = { ...makeNpc(life, id, age, 'Acquaintance', name), city, gender, lastName };
  const profile = { ...initialNpcProfile(life, person), datingGoal: random.pick(goals) };
  const credential = random.integer(2, age < 21 ? 3 : age < 25 ? 4 : 5);
  profile.education = educationLevels[credential]!;
  profile.experience = Math.max(0, age - 18 - Math.max(0, credential - 2) * 2);
  const status = random.next();
  if (age >= 65 && status < .75) {
    profile.status = 'retired';
    person.occupation = 'Retired';
  } else if (age <= 25 && status < .25) {
    profile.status = 'student';
    person.occupation = 'Student';
  } else if (status > .16) {
    const eligible = jobs.filter((job) => job.age <= age && job.experience <= profile.experience &&
      qualifications.indexOf(job.qualification ?? 'none') <= credential);
    const job = eligible.length ? eligible[random.integer(0, eligible.length - 1)] : undefined;
    if (job) {
      profile.job = job.id;
      profile.status = 'employed';
      profile.income = random.integer(job.salary[0], job.salary[1]);
      person.occupation = job.title;
    }
  }

  const financialTier = random.next();
  profile.savings = financialTier < .43 ? random.integer(0, 42000) :
    financialTier < .87 ? random.integer(42001, 350000) : random.integer(350001, 1100000);
  profile.commitments = random.integer(0, Math.floor(profile.savings / 4));
  const hobby = profile.interests[0];
  const lifestyle: Lifestyle = hobby === 'hiking' || hobby === 'gardening' ? 'active' :
    hobby === 'music' || hobby === 'sketching' || hobby === 'photography' ? 'creative' :
      profile.traits.sociability >= 58 ? 'social' : 'quiet';
  const available = random.next() >= .14;
  if (!life.social.datingCycle || life.social.datingCycle.background === 2) {
    setCandidateBackground(life, person, profile, status, credential);
  }
  return { index, person, profile, lifestyle, available };
}

function setCandidateBackground(life: Life, person: SocialPerson, profile: NpcProfile, status: number, credential: number) {
  const random = npcRandom(life, `${person.id}:work-and-finances`);
  const age = person.age;
  const attending = age <= 25 && status < .25;
  const retired = age >= 70 || (age >= 65 && status < .75);
  const completed = programs.filter((program) => program.level !== 'equivalency' && age >= 18 + programYears(program) &&
    qualifications.indexOf(program.level) <= credential);
  const highest = completed.at(-1)?.level;
  const level = completed.filter((program) => program.level === highest);
  const program = !attending && level.length ? level[random.integer(0, level.length - 1)] : undefined;
  profile.education = educationLevels[program ? qualifications.indexOf(program.level) : 2]!;
  if (program) profile.educationProgram = program.id;
  const workingYears = Math.max(0, Math.min(age, retired ? 67 : age) - 18 - (program ? programYears(program) : 0));
  profile.experience = attending ? 0 : Math.round(workingYears * (retired || status > .16 ? random.integer(65, 100) : random.integer(30, 80)) / 100);
  const eligible = jobs.filter((job) => qualifiedNpc(age, profile, job));
  const specialty = eligible.filter((job) => job.tags.length > 0);
  const options = specialty.length && random.next() < .72 ? specialty : eligible;
  const job = options.length ? options[random.integer(0, options.length - 1)] : undefined;
  const employed = !attending && !retired && status > .16 && !!job;
  profile.status = retired ? 'retired' : attending ? 'student' : employed ? 'employed' : 'seeking';
  profile.job = employed ? job!.id : null;
  profile.income = retired ? 12000 + profile.experience * 120 : employed ? random.integer(job!.salary[0], job!.salary[1]) : 0;
  person.occupation = retired ? 'Retired' : attending ? 'Student' : employed ? job!.title : 'Job seeker';

  // The background represents abstract support and obligations without inventing contacts or dependents.
  const familyResources = random.integer(0, 100);
  const familyObligations = age >= 24 ? random.integer(0, 18000) : random.integer(0, 2000);
  const earlierIncome = job ? (job.salary[0] + job.salary[1]) / 2 : 39000;
  const yearlySavings = Math.max(0, earlierIncome - 35000 - familyObligations) * random.integer(12, 55) / 100;
  const startingSupport = familyResources < 65 ? familyResources * 220 : 15000 + (familyResources - 65) * 3500;
  const drawdown = retired ? Math.max(0, age - 67) * (22000 - Math.min(22000, profile.income)) : 0;
  profile.expenses = retired ? 22000 : attending ? 18500 : 36000;
  profile.savings = Math.max(0, Math.round(startingSupport + profile.experience * yearlySavings - drawdown));
  profile.commitments = Math.min(profile.savings, familyObligations);
}

export function datingPool(life: Life) {
  return Array.from({ length: datingPoolSize }, (_, index) => datingCandidate(life, index));
}

export const candidateNetWorth = ({ profile }: DatingCandidate) => profile.savings - profile.commitments;

export function matchesSearch(life: Life, candidate: DatingCandidate, source: DatingSource, preferences: DatingProfile) {
  const { person, profile, available, lifestyle } = candidate;
  const age = datingAgeOptions[preferences.age];
  const worth = datingWorthOptions[preferences.netWorth];
  const local = person.city === life.character.city;
  return available && profile.preferences.includes(life.character.gender) &&
    (source !== 'lgbtq' || person.gender === 'nonbinary' || profile.preferences.includes(person.gender)) &&
    (preferences.gender === 'any' || preferences.gender === person.gender) &&
    (!('range' in age) || (person.age >= age.range[0] && person.age <= age.range[1])) &&
    (!('range' in worth) || (candidateNetWorth(candidate) >= worth.range[0] && (preferences.netWorth === '5000+' || candidateNetWorth(candidate) <= worth.range[1]))) &&
    (source !== 'date' || local) && (preferences.distance === 'any' || (preferences.distance === 'local' ? local : !local)) &&
    (preferences.lifestyle === 'any' || preferences.lifestyle === lifestyle) &&
    (preferences.education === 'any' || (preferences.education === 'vocational' ? profile.education === 'Vocational' :
      profile.education === 'Undergraduate' || profile.education === 'Postgraduate'));
}
