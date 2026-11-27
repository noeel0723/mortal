import assert from 'node:assert/strict';
import { decodeLife } from '../src/database/codec.ts';
import { programById, programs } from '../src/data/academics.ts';
import { eventById } from '../src/data/events.ts';
import { jobById } from '../src/data/jobs.ts';
import { starterHome } from '../src/data/shops.ts';
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
import { propertyIssue } from '../src/engine/property.ts';
import { isSchoolStage } from '../src/engine/school.ts';
import { activityIssue, advance, maxAge } from '../src/engine/simulation.ts';
import { activeCoworkers } from '../src/engine/workplace.ts';
import type { AcademicAction, ProgramLevel } from '../src/engine/academicTypes.ts';
import type { CareerAction } from '../src/engine/careerTypes.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { datingCandidates } from '../src/socialView.ts';

const count = Number(process.argv[2] ?? 1000);
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
const plans: Record<string, number> = {};
const qualifications: Record<string, number> = {};
const schoolwork = ['study', 'exams', 'socialize'] as const;

function apply(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
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
  }
  return life;
}

for (let seed = 1; seed <= count; seed++) {
  let life = createLife(seed);
  let turns = 0;
  while (!life.character.causeOfDeath) {
    assert.ok(++turns <= maxAge, `Turn limit exceeded for seed ${seed}.`);
    life = apply(life, { type: 'age' });
    if (life.pending) {
      const pending = life.pending;
      const choices = eventById.get(pending)?.choices;
      const choice = choices?.[seed % choices.length];
      assert.ok(choice);
      life = apply(life, { type: 'choose', event: pending, choice: choice.id });
      if (pending === 'graduation-plan') plans[choice.id] = (plans[choice.id] ?? 0) + 1;
      decisions++;
    }
    if (!life.character.causeOfDeath) life = employmentChoice(educationChoice(life, seed), seed);
    life = socialChoice(life, seed);
    if (!life.character.causeOfDeath && life.character.age >= 5 && life.character.age <= 25 && (seed + life.year) % 6 === 0) {
      life = apply(life, { type: 'activity', activity: 'go-to-library' });
      if (life.pending) {
        const choice = eventById.get(life.pending)?.choices?.[0];
        assert.ok(choice);
        life = apply(life, { type: 'choose', event: life.pending, choice: choice.id });
        decisions++;
      }
    }
    if (life.character.age >= 18 && seed % 5 === 1) {
      const buy = { type: 'buy-asset', id: starterHome.id } as const;
      if (!propertyIssue(life, buy)) {
        life = apply(life, buy);
        life = apply(life, { type: 'move-into-home', id: starterHome.id });
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
      assert.ok(current.salary >= definition.salary[0] && current.salary <= definition.salary[1]);
      assert.equal(jobRequirementsIssue(life, definition), null);
      assert.equal(life.career.retiredYear, null);
      assert.ok(Object.values(life.finance.arrears).every((amount) => Number.isSafeInteger(amount) && amount >= 0));
    }
    if (seed % 47 === 0 && life.character.age === 17) {
      const legacy = { ...life, version: 3, career: undefined, finance: undefined, illnesses: undefined, notices: undefined,
        property: undefined, communityFriends: undefined };
      assert.deepEqual({ ...decodeLife(JSON.stringify(legacy)), social: undefined },
        { ...life, illnesses: [], notices: [], communityFriends: [], social: undefined });
    }
    const enrollment = life.academic.enrollment;
    if (enrollment) {
      assert.ok([enrollment.performance, enrollment.attendance, enrollment.stress].every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
      assert.ok(enrollment.yearsCompleted < enrollment.duration);
      assert.ok(enrollment.yearsFunded >= enrollment.yearsCompleted && enrollment.yearsFunded <= enrollment.yearsCompleted + 1);
    }
  }
  if (seed % 47 === 0) assert.deepEqual(decodeLife(JSON.stringify(life)), life);
  assert.equal(life.career.current, null);
  const salaries = life.transactions.filter(({ category }) => category === 'salary');
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
}, null, 2));
