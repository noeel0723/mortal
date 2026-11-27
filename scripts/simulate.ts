import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { decodeLife } from '../src/database/codec.ts';
import { programById, programs } from '../src/data/academics.ts';
import { eventById } from '../src/data/events.ts';
import { cities } from '../src/data/veyra.ts';
import { jobById } from '../src/data/jobs.ts';
import { starterHome } from '../src/data/shops.ts';
import { jobCompetencies } from '../src/data/skillLinks.ts';
import { skills } from '../src/data/skills.ts';
import type { SkillId, TrainingMethod } from '../src/data/skills.ts';
import { academicActionIssue, isTuitionDue, latestApplication } from '../src/engine/academics.ts';
import { careerActionIssue, jobRequirementsIssue, vacancies } from '../src/engine/career.ts';
import { createLife } from '../src/engine/create.ts';
import { incomeTax, outstanding } from '../src/engine/finance.ts';
import { familyIssue } from '../src/engine/familyLife.ts';
import { activeRomance, datingCompatibility, loveIssue } from '../src/engine/love.ts';
import { allContacts, newPeopleLimit } from '../src/engine/npcs.ts';
import { doctors } from '../src/data/doctors.ts';
import { healthcareQuote } from '../src/engine/health.ts';
import { relationshipIssue } from '../src/engine/interactions.ts';
import { isHouse, ownedAssets, propertyIssue } from '../src/engine/property.ts';
import { loanApplicationIssue, loanBalance, repaymentIssue, savingsIssue } from '../src/engine/banking.ts';
import { investmentIssue, investmentPrice } from '../src/engine/investments.ts';
import { estate } from '../src/engine/wealth.ts';
import type { InstrumentId } from '../src/engine/wealthTypes.ts';
import { salaryBand } from '../src/engine/pricing.ts';
import { relocationIssue } from '../src/engine/relocation.ts';
import { isSchoolStage } from '../src/engine/school.ts';
import { activityIssue, advance, maxAge } from '../src/engine/simulation.ts';
import { hobbyIssue, skillRandom, skillTier, trainingIssue, trainingUsed } from '../src/engine/skills.ts';
import { showcaseIssue } from '../src/engine/skillShowcases.ts';
import { skillLimits } from '../src/engine/skillTypes.ts';
import { activeCoworkers } from '../src/engine/workplace.ts';
import { national } from '../src/engine/world.ts';
import { worldBounds } from '../src/engine/worldTypes.ts';
import type { EconomicRegime } from '../src/engine/worldTypes.ts';
import type { AcademicAction, ProgramLevel } from '../src/engine/academicTypes.ts';
import type { CareerAction } from '../src/engine/careerTypes.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { datingCandidates } from '../src/socialView.ts';

const count = Number(process.argv[2] ?? 1000);
const started = performance.now();
assert.ok(Number.isInteger(count) && count >= 1 && count <= 100000, 'Choose between 1 and 100000 lives.');
const ages: number[] = [];
const templates = new Set<string>();
let decisions = 0;
let contextualEvents = 0;
let tuitionHolds = 0;
let paidScholarships = 0;
let admissionsAccepted = 0;
let admissionsDeclined = 0;
let withdrawals = 0;
let salariedYears = 0;
let hardshipLives = 0;
let retiredLives = 0;
let partTimeLives = 0;
let fullTimeLives = 0;
let neverWorked = 0;
let professionalHires = 0;
let vocationalHires = 0;
let promotions = 0;
let dismissals = 0;
let treatedCases = 0;
let noticesReviewed = 0;
let weddings = 0;
let children = 0;
let adoptions = 0;
let divorces = 0;
let loanApplications = 0;
let loanApprovals = 0;
let loanDefaults = 0;
let loanDeclines = 0;
let householdsWithHomes = 0;
let householdsWithVehicles = 0;
let everHomeowners = 0;
const netWorth: number[] = [];
const deposits: number[] = [];
const liabilities: number[] = [];
const portfolioResults: number[] = [];
const pensions: number[] = [];
const lateTurnTimings: number[] = [];
const saveBytes: number[] = [];
const serializeTimings: number[] = [];
type WealthOutcomes = { wealth: number[]; home: number; debt: number; pension: number; arrears: number };
const byFinanceStrategy = new Map<string, WealthOutcomes>();
const financeStrategies = ['cash-only', 'long-term-renter', 'homeowner', 'property-investor', 'borrower', 'saver', 'fund-investor', 'mixed-household'] as const;
type FinanceStrategy = typeof financeStrategies[number];
let redundant = 0;
let relocations = 0;
const householdIncome: number[] = [];
const finalBalances: number[] = [];
const finalArrears: number[] = [];
const jobChanges: number[] = [];
const worklessSpells: number[] = [];
const indicators = { inflation: [] as number[], unemployment: [] as number[], priceIndex: [] as number[], growth: [] as number[] };
type EconomyOutcome = { years: number; adultYears: number; withoutWork: number; salaries: number[]; arrears: number[];
  growth: number[]; inflation: number[]; unemployment: number[]; reviews: number[]; promotions: number; redundancies: number };
const byRegime = new Map<EconomicRegime, EconomyOutcome>();

function outcomes(regime: EconomicRegime) {
  const result = byRegime.get(regime) ?? { years: 0, adultYears: 0, withoutWork: 0, salaries: [], arrears: [],
    growth: [], inflation: [], unemployment: [], reviews: [], promotions: 0, redundancies: 0 };
  byRegime.set(regime, result);
  return result;
}
const plans: Record<string, number> = {};
const qualifications: Record<string, number> = {};
const schoolwork = ['study', 'exams', 'socialize'] as const;
const developmentStrategies = ['incidental', 'recreational', 'sports', 'paidLearning', 'careerFocused', 'creative'] as const;
type SkillStrategy = typeof developmentStrategies[number];
type Development = { peaks: number[]; spending: number[]; firstEliteAges: number[]; elite: number; employed: number; promoted: number;
  professional: number; awarded: number; tiers: Record<string, number> };
const development = new Map<SkillStrategy, Development>();
const byAptitude = new Map<string, Development>();

function trackDevelopment<K>(groups: Map<K, Development>, key: K, life: Life, peak: number, firstEliteAge: number | undefined) {
  const result = groups.get(key) ?? { peaks: [], spending: [], firstEliteAges: [], elite: 0, employed: 0, promoted: 0, professional: 0, awarded: 0, tiers: {} };
  groups.set(key, result);
  result.peaks.push(peak);
  result.spending.push(life.transactions.filter(({ category }) => category === 'training').reduce((total, { amount }) => total - amount, 0));
  result.elite += Number(peak >= 90);
  if (firstEliteAge !== undefined) result.firstEliteAges.push(firstEliteAge);
  result.awarded += Number(Object.values(life.skills.entries).some(({ awards }) => awards > 0));
  result.employed += Number(life.career.history.length > 0);
  result.promoted += Number(life.career.history.some(({ promotions }) => promotions.length > 0));
  result.professional += Number(life.career.history.some(({ initialJobId }) =>
    ['undergraduate', 'postgraduate'].includes(jobById.get(initialJobId)?.qualification ?? '')));
  const tier = skillTier(peak);
  result.tiers[tier] = (result.tiers[tier] ?? 0) + 1;
}

function skillChoice(life: Life, seed: number, strategy: SkillStrategy) {
  const age = life.character.age;
  if (strategy === 'incidental' || age < 6 || (strategy === 'recreational' && (seed + age) % 3 === 0)) return life;
  const job = life.career.current && jobById.get(life.career.current.jobId);
  const focal: Record<Exclude<SkillStrategy, 'incidental'>, SkillId> = {
    recreational: seed % 2 ? 'cooking' : 'chess', sports: seed % 2 ? 'running' : 'football',
    paidLearning: seed % 2 ? 'foreign-languages' : 'programming', careerFocused: (job && jobCompetencies(job)[0]) || 'communication',
    creative: seed % 2 ? 'writing' : 'piano',
  };
  const id = focal[strategy];
  if (age < skills[id].age || age > ({ sports: 49, paidLearning: 51, careerFocused: 68, creative: 67, recreational: 75 })[strategy]) return life;
  const sessions = ({ sports: 5, paidLearning: 4, careerFocused: 3, creative: 4, recreational: 1 })[strategy];
  for (let session = 0; session < sessions; session++) {
    const preferred: TrainingMethod = strategy === 'paidLearning' ? 'course' : strategy === 'creative' && session === 0 ? 'class' : 'practice';
    const method = trainingIssue(life, id, preferred) ? 'practice' : preferred;
    if (trainingIssue(life, id, method)) break;
    life = apply(life, { type: 'train-skill', skill: id, method });
  }
  if (age % 2 === 0 && !hobbyIssue(life, id, true)) life = apply(life, { type: 'set-hobby', skill: id, enabled: true });
  if (age % 3 === 0 && !showcaseIssue(life, id)) life = apply(life, { type: 'skill-showcase', skill: id });
  return life;
}

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function financialChoice(life: Life, seed: number, strategy: FinanceStrategy) {
  const age = life.character.age;
  if (age < 18 || life.pending || life.character.causeOfDeath) return life;
  const reserve = life.character.age > 65 ? 32000 : 46000;
  const saver = strategy === 'saver' || strategy === 'mixed-household' || strategy === 'fund-investor';
  if (saver && life.wealth.savings > 0 && life.character.bank < 18000) {
    const amount = Math.min(reserve - life.character.bank, life.wealth.savings);
    if (!savingsIssue(life, 'withdraw', amount)) life = apply(life, { type: 'savings-transfer', direction: 'withdraw', amount });
  } else if (saver && life.character.bank >= reserve + 15000) {
    const amount = Math.floor((life.character.bank - reserve) * (strategy === 'saver' ? .42 : .18));
    if (!savingsIssue(life, 'deposit', amount)) life = apply(life, { type: 'savings-transfer', direction: 'deposit', amount });
  }
  if (strategy === 'long-term-renter' && life.property.residence === 'family' && !propertyIssue(life, { type: 'rent-home' })) {
    life = apply(life, { type: 'rent-home' });
  }
  if (strategy === 'borrower' && age >= 19 && age <= 55 && age % 5 === seed % 5) {
    const principal = seed % 2 ? 15000 : 40000;
    const term = principal === 15000 ? 3 : 5;
    if (!loanApplicationIssue(life, principal, term)) {
      loanApplications++;
      life = apply(life, { type: 'request-loan', principal, term });
      if (life.wealth.loanOffer) {
        loanApprovals++;
        life = apply(life, { type: 'respond-loan', accept: true });
        if (seed % 7 === 0 && life.career.current && age < 48) life = apply(life, { type: 'resign' });
      } else loanDeclines++;
    }
  }
  for (const loan of life.wealth.loans) {
    const amount = loanBalance(loan);
    if (amount > 0 && life.character.bank > amount + reserve * 2 && !repaymentIssue(life, loan.id, amount)) {
      life = apply(life, { type: 'repay-loan', id: loan.id, amount });
    }
  }
  if (['homeowner', 'property-investor', 'mixed-household'].some((choice) => choice === strategy) && life.character.bank > 120000) {
    const buy = { type: 'buy-asset', id: starterHome.id } as const;
    if (!propertyIssue(life, buy)) {
      life = apply(life, buy);
      if (strategy !== 'property-investor') life = apply(life, { type: 'move-into-home', id: starterHome.id });
    }
    if (strategy === 'property-investor' && age < 68 && life.character.bank > 205000) {
      const other = { type: 'buy-asset', id: 'maple-cottage' } as const;
      if (!propertyIssue(life, other)) life = apply(life, other);
    }
  }
  if (life.character.bank > 99500 && age < 58 && (strategy === 'homeowner' || strategy === 'mixed-household' || strategy === 'borrower')) {
    const vehicle = { type: 'buy-asset', id: seed % 2 ? 'toyota-yaris' : 'honda-super-cub' } as const;
    if (!propertyIssue(life, vehicle)) life = apply(life, vehicle);
  }
  for (const asset of ownedAssets(life)) {
    if (strategy === 'property-investor' && asset.rental && !asset.rental.offered && life.property.residence !== asset.ownershipId && age < 76) {
      const rent = { type: 'manage-asset', id: asset.ownershipId, operation: 'offer-rental' } as const;
      if (!propertyIssue(life, rent)) life = apply(life, rent);
    }
    if (life.character.bank > reserve && asset.condition < 68) {
      const operation = isHouse(asset) ? (strategy === 'property-investor' && asset.improvements === 0 && age < 50 ? 'renovate' : 'maintain') : 'service';
      const upkeep = { type: 'manage-asset', id: asset.ownershipId, operation } as const;
      if (!propertyIssue(life, upkeep)) life = apply(life, upkeep);
    }
    if (age === 70 && strategy === 'mixed-household' && !isHouse(asset)) {
      const sell = { type: 'manage-asset', id: asset.ownershipId, operation: 'sell' } as const;
      if (!propertyIssue(life, sell)) life = apply(life, sell);
    }
  }
  if (strategy === 'fund-investor' || strategy === 'mixed-household') {
    const choices: InstrumentId[] = ['veyra-index', 'technology-fund', 'healthcare-fund', 'government-bonds'];
    const instrument = choices[(seed + age) % choices.length]!;
    const units = life.wealth.portfolio[instrument]?.units ?? 0;
    const buy = life.character.bank > reserve + 26000 && age < 65;
    const selling = units > 0 && (life.character.bank < 26000 || age >= 70);
    if (buy || selling) {
      const trade = { type: 'trade-fund', instrument, side: selling ? 'sell' : 'buy', units: selling ? Math.min(units, 20) : 10 } as const;
      if (!investmentIssue(life, trade)) life = apply(life, trade);
    }
  }
  return life;
}

function tryAcademic(life: Life, action: AcademicAction) {
  return academicActionIssue(life, action) ? life : apply(life, action);
}

function tryCareer(life: Life, action: CareerAction) {
  return careerActionIssue(life, action) ? life : apply(life, action);
}

function employmentChoice(life: Life, seed: number) {
  const { age } = life.character;
  const { career, academic } = life;
  if (age < 18 || career.retiredYear !== null || seed % 12 === 0) return life;
  if (age >= 65 && seed % 4 !== 0) return tryCareer(life, { type: 'retire' });
  const job = career.current;
  if (job && (age === 32 && seed % 7 === 0)) return tryCareer(life, { type: 'resign' });

  const held = new Set(academic.qualifications.map(({ level }) => level));
  const stillStudying = !!academic.enrollment || ((academic.path === 'university' || academic.path === 'gap-year') && age < 25 && !held.has('postgraduate')) ||
    (academic.path === 'vocational' && age < 24 && !held.has('vocational'));
  const switchToFullTime = job && jobById.get(job.jobId)?.type === 'part-time' && !stillStudying && age < 40 && age % 2 === 0 && seed % 6 !== 0;
  if (!job || switchToFullTime) {
    const candidates = vacancies(life).filter(({ job }) => (stillStudying ? job.type === 'part-time' : !switchToFullTime || job.type === 'full-time') &&
      !jobRequirementsIssue(life, job)).sort((a, b) => Number(!!b.job.qualification) - Number(!!a.job.qualification) || b.salary - a.salary);
    for (const vacancy of candidates.slice(0, 4)) {
      const attempted = tryCareer(life, { type: 'apply-job', vacancy: vacancy.id });
      if (attempted !== life && attempted.career.applications.at(-1)?.result === 'offered') {
        life = apply(attempted, { type: 'accept-job', vacancy: vacancy.id });
        break;
      }
      life = attempted;
    }
  }
  if (!life.career.current) return life;
  if (seed % 17 === 0 && life.year - life.career.current.startedYear <= 2) {
    for (const coworker of activeCoworkers(life)) {
      for (const activity of ['insult', 'mess-with'] as const) {
        if (!relationshipIssue(life, coworker, activity)) life = apply(life, { type: 'interact', person: coworker.id, activity });
      }
    }
    return life;
  }
  if (seed % 5 !== 0) life = tryCareer(life, { type: 'work-harder' });
  if (age % 3 === 0) life = tryCareer(life, { type: 'request-raise' });
  return life;
}

function educationChoice(life: Life, seed: number) {
  const { age } = life.character;
  const { enrollment, history, qualifications, path } = life.academic;
  if (enrollment) {
    if (age === 15 && seed % 11 === 0) return apply(life, { type: 'drop-out' });
    if (isTuitionDue(enrollment)) {
      tuitionHolds++;
      if (seed % 10 === 0) return apply(life, { type: 'drop-out' });
      const awarded = tryAcademic(life, { type: 'apply-scholarship', programId: enrollment.programId });
      return tryAcademic(awarded, { type: 'pay-tuition' });
    }
    return seed % 3 === 0 || (seed % 3 === 1 && !isSchoolStage(enrollment.level)) ?
      schoolwork.reduce((next, activity) => activityIssue(next, activity) ? next : apply(next, { type: 'activity', activity }), life) : life;
  }
  if (age < 18 || age > 36 || (path === 'workforce' && (seed % 2 === 0 || age < 25)) ||
    (life.academic.leftSchool && age < 22)) return life;
  const hasDiploma = qualifications.some(({ level }) => level === 'high-school');
  const target: ProgramLevel = !hasDiploma ? 'equivalency' : path === 'vocational' ? 'vocational' :
    qualifications.some(({ level }) => level === 'undergraduate') ? 'postgraduate' : 'undergraduate';
  if (qualifications.some(({ level }) => level === target) || history.filter(({ outcome }) => outcome === 'withdrawn').length > 1) return life;
  const candidates = programs.filter(({ level }) => level === target);
  for (let offset = 0; offset < candidates.length; offset++) {
    const program = candidates[(seed + age + offset) % candidates.length]!;
    const programId = program.id;
    const applied = tryAcademic(life, { type: 'apply-program', programId });
    const offer = latestApplication(applied, programId);
    if (applied !== life) {
      if (offer?.result === 'accepted') admissionsAccepted++;
      else admissionsDeclined++;
    }
    life = applied;
    if (offer?.result !== 'accepted' || life.year > offer.year + 2) continue;
    if (seed % 4 !== 0 || life.character.bank < program.tuition) life = tryAcademic(life, { type: 'apply-scholarship', programId });
    const enrolled = tryAcademic(life, { type: 'enroll-program', programId });
    if (enrolled !== life) return enrolled;
  }
  return life;
}

function socialChoice(life: Life, seed: number) {
  const { age, causeOfDeath } = life.character;
  if (age < 18 || age > 52 || causeOfDeath || seed % 3 === 2) return life;
  const romance = activeRomance(life);
  if (!romance) {
    const candidates = datingCandidates(life).sort((a, b) => datingCompatibility(life, b) - datingCompatibility(life, a));
    const candidate = candidates.find((person) => (seed + life.year) % 4 !== 0 &&
      !loveIssue(life, { type: 'romance', person: person.id, action: 'ask' }));
    if (candidate) {
      if (candidate.bond.trust < 65) {
        const result = advance(life, { type: 'talk', person: candidate.id });
        if (result.life) life = result.life;
      }
      const ask = { type: 'romance', person: candidate.id, action: 'ask' } as const;
      if (!loveIssue(life, ask)) life = apply(life, ask);
    } else {
      const meet = { type: 'meet', source: seed % 2 ? 'date' : 'app' } as const;
      if (!loveIssue(life, meet)) life = apply(life, meet);
    }
  } else if (romance.status === 'dating') {
    const support = { type: 'romance', person: romance.person, action: 'support' } as const;
    if (!loveIssue(life, support)) life = apply(life, support);
    const proposal = { type: 'romance', person: romance.person, action: 'propose' } as const;
    if (life.year > romance.started && !loveIssue(life, proposal)) life = apply(life, proposal);
  } else if (romance.status === 'engaged') {
    const wedding = { type: 'wedding', person: romance.person, plan: 'civil' } as const;
    if (!loveIssue(life, wedding)) {
      life = apply(life, wedding);
      weddings++;
    }
  } else if (romance.status === 'married') {
    const divorce = { type: 'romance', person: romance.person, action: 'divorce' } as const;
    if (seed % 19 === 0 && age === 40 && !loveIssue(life, divorce)) {
      life = apply(life, divorce);
      divorces++;
      return life;
    }
    const family = { type: 'plan-child', person: romance.person, method: seed % 2 ? 'adoption' : 'family' } as const;
    if (age <= 43 && Object.keys(life.social.children).length < 2 && !familyIssue(life, family)) {
      const prior = Object.keys(life.social.children).length;
      life = apply(life, family);
      if (Object.keys(life.social.children).length > prior) {
        children++;
        if (family.method === 'adoption') adoptions++;
      }
    }
    const child = life.social.people.find((person) => person.alive && person.role === 'Child' && person.age < 18);
    const care = child && { type: 'parent-child', person: child.id, action: 'care' } as const;
    if (care && !familyIssue(life, care)) life = apply(life, care);
    const hobby = child && { type: 'parent-child', person: child.id, action: seed % 3 === 0 ? 'lesson' : 'hobby' } as const;
    if (hobby && !familyIssue(life, hobby)) life = apply(life, hobby);
  }
  return life;
}

for (let seed = 1; seed <= count; seed++) {
  let life = createLife(seed);
  const block = Math.floor((seed - 1) / developmentStrategies.length);
  const rotation = skillRandom(0xd51c95b, `strategy:${block}`).integer(0, developmentStrategies.length - 1);
  const strategy = developmentStrategies[(seed - 1 + rotation) % developmentStrategies.length]!;
  const financialStrategy = financeStrategies[(seed + Math.floor(seed / 11)) % financeStrategies.length]!;
  let firstEliteAge: number | undefined;
  let turns = 0;
  let jobless = 0;
  while (!life.character.causeOfDeath) {
    assert.ok(++turns <= maxAge, `Turn limit exceeded for seed ${seed}.`);
    const elapsed = national(life.world);
    const previousJob = life.career.current;
    const previousAmount = life.character.bank;
    const previousEmployment = outcomes(elapsed.regime);
    if (life.character.age >= 18 && life.character.age < 65 && life.career.retiredYear === null) {
      previousEmployment.adultYears++;
      if (previousJob) {
        if (jobless) worklessSpells.push(jobless);
        jobless = 0;
      } else {
        previousEmployment.withoutWork++;
        jobless++;
      }
    }
    const ageStart = performance.now();
    life = apply(life, { type: 'age' });
    if (life.character.age >= 50) lateTurnTimings.push(performance.now() - ageStart);
    const currentEconomy = national(life.world);
    assert.equal(currentEconomy.year, elapsed.year + 1);
    for (const key of ['inflation', 'unemployment', 'priceIndex', 'growth'] as const) {
      assert.ok(currentEconomy[key] >= worldBounds[key][0] && currentEconomy[key] <= worldBounds[key][1]);
      indicators[key].push(currentEconomy[key]);
    }
    const conditions = outcomes(currentEconomy.regime);
    conditions.years++;
    conditions.growth.push(currentEconomy.growth);
    conditions.inflation.push(currentEconomy.inflation);
    conditions.unemployment.push(currentEconomy.unemployment);
    if (life.finance.lastSettledYear === life.year) previousEmployment.arrears.push(outstanding(life));
    if (previousJob) {
      previousEmployment.salaries.push(previousJob.salary);
      const job = life.career.current;
      if (job) {
        conditions.reviews.push(job.performance);
        conditions.promotions += Number(job.promotions.length > previousJob.promotions.length);
      } else if (life.career.history.at(-1)?.reason === 'redundant') conditions.redundancies++;
    }
    assert.equal(life.character.bank, previousAmount + life.transactions.filter((entry) => entry.year === life.year)
      .reduce((sum, entry) => sum + entry.amount, 0));
    if (life.pending) {
      const pending = life.pending;
      const choices = eventById.get(pending)?.choices;
      const choice = choices?.[seed % choices.length];
      assert.ok(choice);
      life = apply(life, { type: 'choose', event: pending, choice: choice.id });
      if (pending === 'graduation-plan') plans[choice.id] = (plans[choice.id] ?? 0) + 1;
      decisions++;
    }
    if (seed % 7 === 0 && life.character.age >= 20 && life.character.age <= 50 && life.character.age % 7 === 0) {
      const city = cities.filter((city) => city !== life.character.city).sort((a, b) => life.world.cities[b].jobs - life.world.cities[a].jobs)[0]!;
      if (!relocationIssue(life, city)) {
        life = apply(life, { type: 'relocate', city });
        relocations++;
      }
    }
    if (!life.character.causeOfDeath) life = employmentChoice(educationChoice(life, seed), seed);
    life = socialChoice(life, seed);
    if (!life.character.causeOfDeath) life = skillChoice(life, seed, strategy);
    life = financialChoice(life, seed, financialStrategy);
    if (!life.character.causeOfDeath && life.character.age >= 5 && life.character.age <= 25 && (seed + life.year) % 6 === 0) {
      life = apply(life, { type: 'activity', activity: 'go-to-library' });
      if (life.pending) {
        const choice = eventById.get(life.pending)?.choices?.[0];
        assert.ok(choice);
        life = apply(life, { type: 'choose', event: life.pending, choice: choice.id });
        decisions++;
      }
    }
    if (!life.character.causeOfDeath && seed % 2 === 0) {
      const provider = doctors[seed % doctors.length]!.id;
      const visit = life.illnesses.map(({ patient }) => ({ service: 'doctor', patient, provider }) as const)
        .find((offer) => !healthcareQuote(life, offer).issue);
      if (visit) {
        life = apply(life, { type: 'healthcare', visit });
        treatedCases++;
      }
    }
    for (const notice of life.notices) {
      life = apply(life, { type: 'acknowledge-event', entry: notice.entry });
      noticesReviewed++;
    }
    assert.equal(life.year, life.character.birthYear + life.character.age);
    assert.ok(Object.values(life.character.attributes).every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
    assert.ok(trainingUsed(life) <= skillLimits.yearlySessions);
    assert.ok(Object.values(life.skills.annual.gains).every((gain) => gain <= skillLimits.yearlyGain));
    assert.ok(Object.values(life.skills.entries).every(({ proficiency, best }) => proficiency >= 0 && proficiency <= best && best <= 100));
    if (firstEliteAge === undefined && Object.values(life.skills.entries).some(({ best }) => best >= 90)) firstEliteAge = life.character.age;
    const contacts = allContacts(life);
    assert.equal(new Set(contacts.map(({ id }) => id)).size, contacts.length);
    assert.ok(life.social.people.length <= newPeopleLimit);
    assert.ok(contacts.every((person) => person.age >= 0 && person.age <= maxAge &&
      Object.values(person.bond).every((value) => value >= 0 && value <= 100)));
    for (const [child, parents] of Object.entries(life.social.parents)) {
      const born = child === 'self' ? life.character.birthYear : life.social.profiles[child]!.born;
      assert.equal(new Set(parents).size, parents.length);
      assert.ok(parents.every((parent) => born - (parent === 'self' ? life.character.birthYear : life.social.profiles[parent]!.born) >= 18));
    }
    assert.equal(life.character.bank, life.transactions.reduce((balance, item) => balance + item.amount, 0));
    assert.ok(life.character.bank >= 0);
    const current = life.career.current;
    if (current) {
      const definition = jobById.get(current.jobId)!;
      const lastChange = current.salaryHistory.at(-1);
      const [minimum, maximum] = salaryBand(definition, lastChange?.factor ?? current.startingFactor);
      assert.ok(current.salary >= minimum && current.salary <= maximum);
      assert.equal(jobRequirementsIssue(life, definition), null);
      assert.equal(life.career.retiredYear, null);
      assert.ok(Object.values(life.finance.arrears).every((amount) => Number.isSafeInteger(amount) && amount >= 0));
    }
    if (seed % 47 === 0 && life.character.age === 17) {
      const legacy = { ...life, version: 3, career: undefined, finance: undefined, illnesses: undefined, notices: undefined,
        property: undefined, communityFriends: undefined };
      assert.deepEqual({ ...decodeLife(JSON.stringify(legacy)), social: undefined, skills: undefined, world: undefined, wealth: undefined },
        { ...life, illnesses: [], notices: [], communityFriends: [], social: undefined, skills: undefined, world: undefined, wealth: undefined });
    }
    const enrollment = life.academic.enrollment;
    if (enrollment) {
      assert.ok([enrollment.performance, enrollment.attendance, enrollment.stress].every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
      assert.ok(enrollment.yearsCompleted < enrollment.duration);
      assert.ok(enrollment.yearsFunded >= enrollment.yearsCompleted && enrollment.yearsFunded <= enrollment.yearsCompleted + 1);
    }
  }
  if (seed % 47 === 0) assert.deepEqual(decodeLife(JSON.stringify(life)), life);
  const final = estate(life);
  assert.equal(final.total, final.liquid + final.property + final.vehicles - final.liabilities);
  assert.deepEqual(life.wealth.snapshots.at(-1), { year: life.year, ...final });
  const holdings = ownedAssets(life);
  const home = holdings.some(isHouse);
  const pension = life.wealth.pension.benefitsPaid;
  const serializeStart = performance.now();
  const payload = JSON.stringify(life);
  serializeTimings.push(performance.now() - serializeStart);
  saveBytes.push(Buffer.byteLength(payload));
  netWorth.push(final.total);
  deposits.push(final.savings);
  liabilities.push(final.liabilities);
  if (pension) pensions.push(pension);
  householdsWithHomes += Number(home);
  householdsWithVehicles += Number(holdings.some((asset) => !isHouse(asset)));
  everHomeowners += Number(life.property.owned.some(isHouse));
  loanDefaults += life.journal.filter(({ text }) => text.startsWith('I missed two installments in a row.')).length;
  const portfolio = Object.entries(life.wealth.portfolio);
  if (portfolio.length) portfolioResults.push(portfolio.reduce((sum, [id, position]) =>
    sum + position.realized + investmentPrice(life, id as InstrumentId) * position.units - position.basis, 0) +
    life.transactions.filter(({ category }) => category === 'investment-income').reduce((sum, entry) => sum + entry.amount, 0));
  const strategyStats = byFinanceStrategy.get(financialStrategy) ?? { wealth: [], home: 0, debt: 0, pension: 0, arrears: 0 };
  byFinanceStrategy.set(financialStrategy, strategyStats);
  strategyStats.wealth.push(final.total);
  strategyStats.home += Number(home);
  strategyStats.debt += Number(final.loans > 0);
  strategyStats.pension += Number(pension > 0);
  strategyStats.arrears += Number(final.arrears > 0);
  if (jobless) worklessSpells.push(jobless);
  finalBalances.push(life.character.bank);
  finalArrears.push(outstanding(life));
  jobChanges.push(life.career.history.filter(({ reason }) => reason === 'changed jobs').length);
  const strongest = Object.entries(life.skills.entries).sort(([idA, a], [idB, b]) => b.best - a.best || b.sessions - a.sessions || idA.localeCompare(idB))[0]?.[1];
  const peak = strongest?.best ?? 0;
  const aptitude = strongest?.aptitude;
  const group = aptitude === undefined ? 'untrained' : aptitude < 45 ? 'under45' : aptitude < 73 ? '45to72' : '73plus';
  trackDevelopment(development, strategy, life, peak, firstEliteAge);
  trackDevelopment(byAptitude, group, life, peak, firstEliteAge);
  assert.equal(life.career.current, null);
  const salaries = life.transactions.filter(({ category }) => category === 'salary');
  householdIncome.push(salaries.reduce((sum, { amount }) => sum + amount, 0));
  const taxes = life.transactions.filter(({ category }) => category === 'tax');
  assert.equal(new Set(salaries.map(({ year }) => year)).size, salaries.length);
  assert.equal(taxes.reduce((sum, entry) => sum - entry.amount, 0), salaries.reduce((sum, entry) => sum + incomeTax(entry.amount), 0));
  assert.equal(salaries.length, life.career.experience);
  salariedYears += salaries.length;
  if (outstanding(life)) hardshipLives++;
  if (life.career.retiredYear !== null) retiredLives++;
  if (!life.career.history.length) neverWorked++;
  if (life.career.history.some((entry) => jobById.get(entry.initialJobId)?.type === 'part-time')) partTimeLives++;
  if (life.career.history.some((entry) => jobById.get(entry.initialJobId)?.type === 'full-time')) fullTimeLives++;
  for (const entry of life.career.history) {
    const initial = jobById.get(entry.initialJobId)!;
    if (initial.qualification === 'undergraduate' || initial.qualification === 'postgraduate') professionalHires++;
    if (initial.qualification === 'vocational') vocationalHires++;
    if (entry.reason === 'dismissed') dismissals++;
    if (entry.reason === 'redundant') redundant++;
    promotions += entry.promotions.length;
  }
  const academic = life.academic;
  assert.equal(new Set(academic.qualifications.map(({ programId }) => programId)).size, academic.qualifications.length);
  for (const qualification of academic.qualifications) {
    const record = academic.history.find(({ programId, outcome }) => programId === qualification.programId && outcome === 'graduated');
    const program = programById.get(qualification.programId);
    assert.ok(record);
    assert.ok(record.endedYear - record.startedYear >= (program?.duration ?? 3));
    assert.equal(qualification.year, record.endedYear);
    if (program?.requires) assert.ok(academic.qualifications.some((item) => item.level === program.requires && item.year <= record.startedYear));
    qualifications[qualification.level] = (qualifications[qualification.level] ?? 0) + 1;
  }
  for (const award of academic.scholarships) {
    const program = programById.get(award.programId)!;
    assert.ok(award.receivedTotal <= program.duration * award.annualAmount);
    if (award.receivedTotal) paidScholarships++;
  }
  withdrawals += academic.history.filter(({ outcome }) => outcome === 'withdrawn').length;
  const payments = life.transactions.filter(({ label }) => / (?:tuition|scholarship) for year /.test(label));
  assert.equal(new Set(payments.map(({ label, year }) => `${year} ${label}`)).size, payments.length);
  assert.equal(payments.filter(({ amount }) => amount > 0).reduce((sum, { amount }) => sum + amount, 0),
    academic.scholarships.reduce((sum, { receivedTotal }) => sum + receivedTotal, 0));
  assert.equal(life.seen.length, new Set(life.seen).size);
  for (const event of life.seen) templates.add(event);
  contextualEvents += life.seen.length;
  ages.push(life.character.age);
}

ages.sort((a, b) => a - b);
function percentiles(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  return { p10: ordered[Math.floor((ordered.length - 1) * .1)], p50: ordered[Math.floor((ordered.length - 1) * .5)],
    p90: ordered[Math.floor((ordered.length - 1) * .9)] };
}
function developmentReport<K extends string>(groups: Map<K, Development>) {
  return Object.fromEntries([...groups].map(([strategy, { peaks, spending, firstEliteAges, ...outcomes }]) => [strategy, {
    lives: peaks.length, bestProficiency: percentiles(peaks), firstEliteAge: percentiles(firstEliteAges), trainingExpenseCents: percentiles(spending), ...outcomes,
  }]));
}
console.log(JSON.stringify({
  lives: count,
  minimumAge: ages[0],
  medianAge: ages[Math.floor(count / 2)],
  maximumAge: ages.at(-1),
  meanAge: Number((ages.reduce((sum, age) => sum + age, 0) / count).toFixed(1)),
  distinctTemplatesObserved: templates.size,
  meanContextualEvents: Number((contextualEvents / count).toFixed(1)),
  decisionsResolved: decisions,
  graduationPlans: plans,
  qualificationsEarned: qualifications,
  admissionsAccepted,
  admissionsDeclined,
  paidScholarships,
  tuitionHoldTurns: tuitionHolds,
  withdrawals,
  employedLives: count - neverWorked,
  neverWorked,
  partTimeLives,
  fullTimeLives,
  retiredLives,
  hardshipLives,
  salariedYears,
  professionalHires,
  vocationalHires,
  promotions,
  dismissals,
  treatedCases,
  noticesReviewed,
  weddings,
  children,
  adoptions,
  divorces,
  wealth: {
    finalNetWorthCents: percentiles(netWorth), savingsCents: percentiles(deposits), finalLiabilitiesCents: percentiles(liabilities),
    everHomeowners, householdsWithHomes, householdsWithVehicles, loanApplications, loanApprovals, loanDeclines, loanDefaults,
    investors: portfolioResults.length, investmentResultCents: percentiles(portfolioResults), investorsWithLoss: portfolioResults.filter((value) => value < 0).length,
    pensionRecipients: pensions.length, lifetimePensionCents: percentiles(pensions),
    simulationTimeSeconds: Math.round((performance.now() - started) / 100) / 10, lateAgeUpMs: percentiles(lateTurnTimings),
    serializedBytes: percentiles(saveBytes), serializationMs: percentiles(serializeTimings),
    strategies: Object.fromEntries([...byFinanceStrategy].map(([key, { wealth, ...outcome }]) => [key, {
      lives: wealth.length, finalNetWorthCents: percentiles(wealth), ...outcome,
    }])),
  },
  economy: {
    indicatorBasisPoints: Object.fromEntries(Object.entries(indicators).map(([key, values]) => [key, percentiles(values)])),
    worklessSpellsInYears: percentiles(worklessSpells), lifetimeGrossSalaryCents: percentiles(householdIncome),
    finalBankCents: percentiles(finalBalances), finalArrearsCents: percentiles(finalArrears), jobChanges: percentiles(jobChanges), redundant, relocations,
    regimes: Object.fromEntries([...byRegime].map(([regime, data]) => [regime, {
      years: data.years, adultYears: data.adultYears, withoutWork: data.withoutWork, growth: percentiles(data.growth),
      inflation: percentiles(data.inflation), unemployment: percentiles(data.unemployment),
      annualSalaryCents: percentiles(data.salaries), yearEndArrearsCents: percentiles(data.arrears),
      reviewedPerformance: percentiles(data.reviews), promotions: data.promotions, redundancies: data.redundancies,
    }])),
  },
  skillDevelopment: developmentReport(development),
  skillDevelopmentByPeakSkillAptitude: developmentReport(byAptitude),
}, null, 2));
