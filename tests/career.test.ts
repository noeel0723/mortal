import assert from 'node:assert/strict';
import { test } from 'node:test';
import { careerSummary } from '../src/careerView.ts';
import { decodeLife } from '../src/database/codec.ts';
import { employerById } from '../src/data/employers.ts';
import { eventById } from '../src/data/events.ts';
import { jobById } from '../src/data/jobs.ts';
import { academicActionIssue } from '../src/engine/academics.ts';
import { careerActionIssue, employmentStatus, jobRequirementsIssue, vacancies } from '../src/engine/career.ts';
import { createLife } from '../src/engine/create.ts';
import { annualFinance, incomeTax, outstanding } from '../src/engine/finance.ts';
import { seededRandom } from '../src/engine/random.ts';
import { findContact } from '../src/engine/school.ts';
import { advance, talkIssue } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { activeCoworkers } from '../src/engine/workplace.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function resolve(life: Life) {
  if (!life.pending) return life;
  return act(life, { type: 'choose', event: life.pending, choice: eventById.get(life.pending)!.choices![0]!.id });
}

function ageTo(life: Life, age: number) {
  while (life.character.age < age) life = act(resolve(life), { type: 'age' });
  return resolve(life);
}

function adult() {
  const life = ageTo(createLife(4), 18);
  Object.assign(life.character.attributes, { smarts: 95, discipline: 95, charisma: 95, health: 95, creativity: 92 });
  return life;
}

function hire(life: Life, id = 'cashier') {
  const vacancy = vacancies(life).find(({ job }) => job.id === id);
  assert.ok(vacancy, id);
  const applicant = act(life, { type: 'apply-job', vacancy: vacancy.id });
  assert.equal(applicant.career.applications.at(-1)?.result, 'offered', id);
  return act(applicant, { type: 'accept-job', vacancy: vacancy.id });
}

function expectError(life: Life, action: Action, message: RegExp) {
  assert.match(advance(life, action).error ?? '', message);
}

test('version 3 migrates an adult neutrally and preserves portraits, ledger, diploma, contacts and seed', () => {
  const life = adult();
  life.character.appearance = { ...life.character.appearance, hair: 'Bob' };
  const snapshot = { ...life, version: 3, career: undefined, finance: undefined, illnesses: undefined, notices: undefined };
  const migrated = decodeLife(JSON.stringify(snapshot));
  assert.deepEqual(migrated, { ...life, illnesses: [], notices: [] });
  assert.equal(employmentStatus(migrated), 'Unemployed');
  assert.equal(migrated.career.history.length, 0);
  assert.equal(migrated.finance.lastSettledYear, null);
  assert.throws(() => decodeLife(JSON.stringify({ ...migrated, finance: { ...migrated.finance, arrears: {} } })), /invalid career or finance/);
});

test('job listings are deterministic and gate professional roles by academic level, tags and experience', () => {
  let life = adult();
  assert.deepEqual(vacancies(life), vacancies(decodeLife(JSON.stringify(life))));
  const tech = jobById.get('junior-developer')!;
  const support = jobById.get('it-support')!;
  const advanced = jobById.get('software-engineer')!;
  assert.match(jobRequirementsIssue(life, tech) ?? '', /undergraduate.*software/);
  assert.equal(jobRequirementsIssue(life, jobById.get('cashier')!), null);
  life.academic.qualifications.push({ level: 'vocational', title: 'IT Support', year: life.year, programId: 'it-support',
    institutionId: 'veyra-technical', performance: 78, careerEligibility: ['it-support'] });
  assert.equal(jobRequirementsIssue(life, support), null);
  assert.match(jobRequirementsIssue(life, tech) ?? '', /undergraduate/);
  life.academic.qualifications.push({ level: 'undergraduate', title: 'Computer Science', year: life.year,
    programId: 'computer-science', institutionId: 'alder-university', performance: 95, careerEligibility: ['software', 'data'] });
  assert.equal(jobRequirementsIssue(life, tech), null);
  life = ageTo(life, 20);
  assert.match(jobRequirementsIssue(life, jobById.get('teacher')!) ?? '', /teaching/);
  assert.match(jobRequirementsIssue(life, advanced) ?? '', /2 years/);
  assert.notDeepEqual(vacancies(life), vacancies(adult()));
  assert.equal(employmentStatus(createLife(4)), 'Not eligible');
});

test('applications persist rejection and ineligibility, offers expire and the same vacancy allows one attempt', () => {
  const life = adult();
  const cashier = vacancies(life).find(({ job }) => job.id === 'cashier')!;
  const role = vacancies(life).find(({ job }) => job.id === 'junior-developer')!;
  const rejected = structuredClone(life);
  Object.assign(rejected.character.attributes, { smarts: 5, charisma: 4, discipline: 7, health: 25 });
  const low = act(rejected, { type: 'apply-job', vacancy: cashier.id });
  assert.equal(low.career.applications.at(-1)?.result, 'rejected');
  expectError(low, { type: 'apply-job', vacancy: cashier.id }, /already applied/);
  assert.equal(act(life, { type: 'apply-job', vacancy: role.id }).career.applications.at(-1)?.result, 'ineligible');
  const offered = act(life, { type: 'apply-job', vacancy: cashier.id });
  assert.deepEqual(offered, act(life, { type: 'apply-job', vacancy: cashier.id }));
  assert.equal(employmentStatus(offered), 'Job seeker');
  assert.equal(act(offered, { type: 'decline-job', vacancy: cashier.id }).career.applications.at(-1)?.result, 'declined');
  const expired = ageTo(offered, 19);
  assert.equal(expired.career.applications.at(-1)?.result, 'expired');
  expectError(expired, { type: 'accept-job', vacancy: cashier.id }, /no longer available/);
});

test('part-time work can coexist with study, and neither enrollment nor hiring permits incompatible work', () => {
  const life = adult();
  const id = 'education';
  const offered = act(life, { type: 'apply-program', programId: id });
  const funded = act(offered, { type: 'apply-scholarship', programId: id });
  assert.match(academicActionIssue(hire(funded), { type: 'enroll-program', programId: id }) ?? '', /part-time/);
  const enrollment = act(funded, { type: 'enroll-program', programId: id });
  const student = hire(enrollment, 'retail-assistant');
  assert.equal(employmentStatus(student), 'Part-time employee');
  assert.match(jobRequirementsIssue(student, jobById.get('cashier')!) ?? '', /part-time/);
  expectError(student, { type: 'work-hours', hours: 45 }, /supported work week/);
  assert.equal(act(student, { type: 'work-hours', hours: 24 }).career.current?.hours, 24);
  assert.deepEqual(decodeLife(JSON.stringify(student)), student);
});

test('the elapsed work year pays once, tax and unpaid living bills reconcile, and older bills are paid first', () => {
  const life = adult();
  assert.equal(incomeTax(24000), 0);
  assert.equal(incomeTax(70000), 3680);
  assert.equal(incomeTax(140000), 15380);
  const newJob = hire(life);
  assert.equal(newJob.character.bank, life.character.bank);
  const salary = newJob.career.current!.salary;
  const paid = ageTo(newJob, 19);
  assert.equal(paid.transactions.filter(({ category }) => category === 'salary').at(-1)?.amount, salary);
  assert.equal(paid.transactions.filter(({ category }) => category === 'tax').at(-1)?.amount, -incomeTax(salary));
  assert.equal(paid.finance.lastSettledYear, paid.year);
  assert.equal(paid.character.bank, paid.transactions.reduce((sum, entry) => sum + entry.amount, 0));
  const copy = structuredClone(paid);
  annualFinance(copy, 18);
  assert.deepEqual(copy, paid);
  const hardship = ageTo(life, 19);
  assert.equal(hardship.character.bank, 0);
  assert.ok(outstanding(hardship) > 0);
  const recovering = ageTo(hire(hardship), 20);
  assert.ok(recovering.transactions.some((entry) => entry.year === recovering.year && entry.label.endsWith('arrears')));
  assert.ok(outstanding(recovering) < outstanding(hardship));
});

test('work actions consume energy, raises are bounded, promotions use a career path, and bad reviews can dismiss', () => {
  const hired = hire(adult());
  const improved = act(hired, { type: 'work-harder' });
  assert.equal(improved.career.current?.performance, 59);
  assert.equal(improved.character.attributes.energy, hired.character.attributes.energy - 16);
  expectError(improved, { type: 'work-harder' }, /already done/i);
  const early = act(improved, { type: 'request-raise' });
  assert.match(early.journal.at(-1)?.text ?? '', /declined/);
  expectError(early, { type: 'request-raise' }, /already done/i);
  let employee = ageTo(improved, 19);
  Object.assign(employee.career.current!, { performance: 99, security: 100, stress: 0 });
  employee.random = Array.from({ length: 50 }, (_, i) => i).find((seed) => seededRandom(seed).next() < .1)!;
  const raised = act(employee, { type: 'request-raise' });
  assert.ok(raised.career.current!.salary > employee.career.current!.salary);
  employee = raised;
  employee.career.reputation = 70;
  for (let year = 20; year <= 30 && employee.career.current?.jobId === 'cashier'; year++) employee = ageTo(employee, year);
  assert.equal(employee.career.current?.jobId, 'retail-supervisor');
  assert.equal(employee.career.current?.promotions[0]?.from, 'cashier');
  assert.ok(employee.career.current!.salary <= jobById.get('retail-supervisor')!.salary[1]);
  assert.deepEqual(decodeLife(JSON.stringify(employee)), employee);
  const poor = structuredClone(hired);
  Object.assign(poor.career.current!, { performance: 0, security: 0 });
  const warned = ageTo(poor, 19);
  assert.equal(warned.career.current?.review, 'warning');
  const dismissed = ageTo(warned, 20);
  assert.equal(dismissed.career.history.at(-1)?.reason, 'dismissed');
  assert.equal(employmentStatus(dismissed), 'Job seeker');
});

test('former co-worker friends stay after a job change and negative interactions affect real stats', () => {
  const hired = hire(adult());
  const colleagues = activeCoworkers(hired);
  assert.equal(colleagues.length, 5);
  assert.equal(new Set(colleagues.map(({ id }) => id)).size, 5);
  assert.ok(colleagues.every(({ appearance, employerId }) => appearance && employerById.has(employerId)));
  const target = colleagues.find(({ role }) => role === 'Co-worker')!;
  let life = act(hired, { type: 'befriend', person: target.id });
  const atWork = act(life, { type: 'talk', person: target.id });
  assert.match(atWork.journal.at(-1)?.text ?? '', /at work|from work|a task|workplace gets busy/);
  assert.ok(atWork.journal.at(-1)?.text.includes(target.name));
  life = act(life, { type: 'interact', person: target.id, activity: 'discuss-work' });
  assert.equal(life.career.current?.performance, 54);
  life = act(life, { type: 'interact', person: target.id, activity: 'insult' });
  assert.equal(life.career.current?.security, hired.career.current!.security - 9);
  assert.ok(findContact(life, target.id)!.bond.resentment > target.bond.resentment);
  life = act(life, { type: 'interact', person: target.id, activity: 'mess-with' });
  expectError(life, { type: 'interact', person: target.id, activity: 'mess-with' }, /already done/i);
  const changed = hire(life, 'office-assistant');
  assert.equal(changed.career.history.at(-1)?.reason, 'changed jobs');
  const restored = decodeLife(JSON.stringify(changed));
  assert.deepEqual(findContact(restored, target.id), findContact(changed, target.id));
  assert.equal(talkIssue(restored, target.id), null);
  expectError(restored, { type: 'interact', person: target.id, activity: 'discuss-work' }, /current workplace/);
  const conversation = act(restored, { type: 'talk', person: target.id });
  assert.match(conversation.journal.at(-1)?.text ?? '', /former workplace|worked together|used to work|old break room/);
  const together = act(conversation, { type: 'interact', person: target.id, activity: 'work-break' });
  assert.match(together.journal.at(-1)?.text ?? '', /old job|days as co-workers|outside work now/);
});

test('resignation and retirement stop future payroll, while death closes an accrued year and preserves the life summary', () => {
  const hired = hire(adult());
  const resigning = act(hired, { type: 'resign' });
  assert.equal(resigning.career.history.at(-1)?.reason, 'resigned');
  assert.equal(ageTo(resigning, 19).transactions.some(({ category }) => category === 'salary'), false);
  expectError(hired, { type: 'retire' }, /65/);
  const senior = structuredClone(hired);
  senior.character.age = 65;
  senior.year = senior.character.birthYear + 65;
  const retired = act(senior, { type: 'retire' });
  assert.equal(employmentStatus(retired), 'Retired');
  assert.equal(retired.career.history.at(-1)?.reason, 'retired');
  assert.match(careerActionIssue(retired, { type: 'seek-work' }) ?? '', /retired/);
  assert.equal(ageTo(retired, 66).transactions.some(({ category }) => category === 'salary'), false);
  senior.character.age = 114;
  senior.year = senior.character.birthYear + 114;
  const ended = act(senior, { type: 'age' });
  assert.ok(ended.character.causeOfDeath);
  assert.equal(ended.career.history.at(-1)?.reason, 'died');
  assert.equal(ended.transactions.filter(({ category }) => category === 'salary').length, 1);
  assert.ok(careerSummary(ended).some(({ label }) => label === 'Career earnings'));
  assert.deepEqual(decodeLife(JSON.stringify(ended)), ended);
});
