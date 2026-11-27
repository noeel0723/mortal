import assert from 'node:assert/strict';
import { decodeLife } from '../src/database/codec.ts';
import { programById, programs } from '../src/data/academics.ts';
import { eventById } from '../src/data/events.ts';
import { academicActionIssue, isTuitionDue, latestApplication } from '../src/engine/academics.ts';
import { createLife } from '../src/engine/create.ts';
import { isSchoolStage } from '../src/engine/school.ts';
import { activityIssue, advance, maxAge } from '../src/engine/simulation.ts';
import type { AcademicAction, ProgramLevel } from '../src/engine/academicTypes.ts';
import type { Action, Life } from '../src/engine/types.ts';

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
    if (!life.character.causeOfDeath) life = educationChoice(life, seed);
    assert.equal(life.year, life.character.birthYear + life.character.age);
    assert.ok(Object.values(life.character.attributes).every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
    assert.ok(life.family.every((person) => person.age <= maxAge && Object.values(person.bond).every((value) => value >= 0 && value <= 100)));
    assert.equal(life.character.bank, life.transactions.reduce((balance, item) => balance + item.amount, 0));
    const enrollment = life.academic.enrollment;
    if (enrollment) {
      assert.ok([enrollment.performance, enrollment.attendance, enrollment.stress].every((value) => Number.isInteger(value) && value >= 0 && value <= 100));
      assert.ok(enrollment.yearsCompleted < enrollment.duration);
      assert.ok(enrollment.yearsFunded >= enrollment.yearsCompleted && enrollment.yearsFunded <= enrollment.yearsCompleted + 1);
    }
  }
  if (seed % 47 === 0) assert.deepEqual(decodeLife(JSON.stringify(life)), life);
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
}, null, 2));
