import { employerById, employers } from '../data/employers.ts';
import { jobById, jobs } from '../data/jobs.ts';
import type { Job } from '../data/jobs.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp, record } from './journal.ts';
import { marketSalaryFactor, salaryBand } from './pricing.ts';
import { seededRandom } from './random.ts';
import { developJobSkills, jobSkillStrength } from './skillIntegration.ts';
import { ensureWorkplace } from './workplace.ts';
import { national } from './world.ts';
import { indexBase } from './worldTypes.ts';
import type { QualificationLevel } from './academicTypes.ts';
import type { CareerAction, CareerEffect, CareerState, CurrentJob, EndReason } from './careerTypes.ts';
import type { Life } from './types.ts';

export const workAge = 18;
export const retirementAge = 65;
const rank: Record<QualificationLevel, number> = { 'high-school': 0, vocational: 1, undergraduate: 2, postgraduate: 3 };
const yearRound = new Set(['retail-assistant', 'cashier', 'barista', 'office-assistant', 'records-clerk', 'junior-developer', 'it-support', 'teacher']);

export function initialCareer(): CareerState {
  return { current: null, seeking: false, retiredYear: null, experience: 0, industryExperience: {}, reputation: 0, history: [], applications: [], contacts: [] };
}

export function employmentStatus(life: Life) {
  const career = life.career;
  if (life.character.age < workAge) return 'Not eligible';
  if (career.retiredYear !== null) return 'Retired';
  if (career.current) return jobById.get(career.current.jobId)?.type === 'part-time' ? 'Part-time employee' : 'Full-time employee';
  if (career.seeking) return 'Job seeker';
  return 'Unemployed';
}

export function vacancies(life: Life) {
  const random = seededRandom(life.seed ^ Math.imul(life.year, 0x9e3779b9));
  const world = life.world;
  const economy = national(world);
  const localMarket = world.cities[life.character.city];
  const availableJobs = jobs.flatMap((job) => {
    const open = random.next();
    const pool = employers.filter((company) => company.industries.includes(job.industry));
    const local = pool.filter(({ city }) => city === life.character.city);
    const available = local.length && random.next() < Math.min(.92, .69 + (localMarket.jobs - 53) / 140) ? local : pool;
    const employer = available[random.integer(0, available.length - 1)]!;
    const company = world.employers[employer.id]!;
    const sector = world.industries[job.industry];
    const factor = marketSalaryFactor(world, job, employer.id);
    const [minimum, maximum] = salaryBand(job, factor);
    const salary = random.integer(minimum, minimum + Math.floor((maximum - minimum) * .62));
    const pressure = (economy.unemployment - 560) / 135 + (53 - sector.demand) / 14;
    const competition = random.integer(34, 66) + Math.min(9, job.experience * 2) + Math.round(Math.max(-8, Math.min(13, pressure)));
    const hiring = .68 + (economy.labor - 55) / 110 + (sector.demand - 54) / 140 + (company.demand - 55) / 160 +
      (world.cities[employer.city].jobs - 53) / 180;
    return open < Math.min(.97, Math.max(.12, hiring)) || yearRound.has(job.id) ?
      [{ id: `${life.year}-${job.id}-${employer.id}`, job, employer, salary, factor, competition }] : [];
  });
  const offers = new Map(availableJobs.map((vacancy) => [vacancy.id, vacancy]));
  for (const application of life.career.applications) {
    if (application.year !== life.year) continue;
    const job = jobById.get(application.jobId)!;
    const employer = employerById.get(application.employerId)!;
    const listing = offers.get(application.id);
    offers.set(application.id, { id: application.id, job, employer, salary: application.salary,
      factor: application.factor ?? indexBase, competition: listing?.competition ?? 50 });
  }
  return [...offers.values()];
}
export type Vacancy = ReturnType<typeof vacancies>[number];

export function matchingQualifications(life: Life, job: Job) {
  return life.academic.qualifications.filter((credential) =>
    (!job.qualification || rank[credential.level] >= rank[job.qualification]) &&
    (!job.tags.length || job.tags.some((tag) => credential.careerEligibility.includes(tag))));
}

export function jobRequirementsIssue(life: Life, job: Job) {
  if (life.character.age < job.age) return `Available from age ${job.age}.`;
  if (life.career.retiredYear !== null) return 'You have retired.';
  if (job.type === 'full-time' && life.academic.enrollment) return 'Only part-time work fits your current enrollment.';
  if ((job.qualification || job.tags.length) && !matchingQualifications(life, job).length) {
    return `Requires ${job.qualification ? `a ${job.qualification} qualification` : 'a relevant qualification'}${job.tags.length ? ` in ${job.tags.join(' or ')}` : ''}.`;
  }
  if ((life.career.industryExperience[job.industry] ?? 0) < job.experience) return `Requires ${job.experience} years of ${job.industry} experience.`;
  return null;
}

function vacancyIssue(life: Life, vacancy: Vacancy) {
  if (life.career.current?.jobId === vacancy.job.id && life.career.current.employerId === vacancy.employer.id) return 'You already hold this job.';
  return jobRequirementsIssue(life, vacancy.job);
}

export function workHours(job: Job) {
  return job.type === 'part-time' ? [14, job.hours, 24] : [Math.max(35, job.hours - 5), job.hours, Math.min(50, job.hours + 6)];
}

export function careerActionIssue(life: Life, action: CareerAction) {
  const { career, character } = life;
  const current = career.current;
  if (character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (character.age < workAge) return `Work becomes available at age ${workAge}.`;
  if (career.retiredYear !== null) return 'You have retired.';
  if (action.type === 'retire') return character.age < retirementAge ? `Retirement opens at age ${retirementAge}.` : null;
  if (action.type === 'seek-work') return career.seeking || current ? 'You can already browse listings.' : null;
  if ('vacancy' in action) {
    const previous = career.applications.find(({ id }) => id === action.vacancy);
    if (action.type === 'apply-job' && previous) return 'You already applied to this vacancy.';
    if (action.type !== 'apply-job' && (previous?.result !== 'offered' || previous.year !== life.year)) return 'This offer is no longer available.';
    const vacancy = vacancies(life).find(({ id }) => id === action.vacancy);
    if (!vacancy) return 'This vacancy is no longer available.';
    return action.type === 'accept-job' ? vacancyIssue(life, vacancy) : null;
  }
  if (!current) return 'You are not currently employed.';
  if (action.type === 'resign') return null;
  if (action.type === 'work-hours') {
    if (!workHours(jobById.get(current.jobId)!).includes(action.hours)) return 'Choose a supported work week.';
    return current.hours === action.hours ? 'These are already your hours.' : null;
  }
  if (life.usedActions.includes(action.type)) return 'Already done this year.';
  return null;
}

function applicationScore(life: Life, vacancy: Vacancy) {
  const { attributes } = life.character;
  const { job } = vacancy;
  const matched = matchingQualifications(life, job);
  const grade = matched.reduce((best, item) => Math.max(best, item.performance ?? 0), 0);
  const attributesForRole = (attributes[job.attributes[0]] + attributes[job.attributes[1]]) / 2;
  const relevant = life.career.industryExperience[job.industry] ?? 0;
  return attributes.smarts * .13 + attributes.discipline * .17 + attributes.charisma * .13 + attributes.health * .09 +
    attributesForRole * .32 + grade * .07 + life.career.reputation * .12 + Math.min(12, relevant * 3) +
    (matched.length ? 5 : 0) + (!job.qualification ? 5 : 0) + jobSkillStrength(life, job) * .13;
}

export function endEmployment(life: Life, reason: EndReason) {
  const job = life.career.current;
  if (!job) return;
  const { jobId, initialJobId, employerId, startedYear, startingSalary, startingFactor, salary, salaryHistory, promotions } = job;
  life.career.history.push({ jobId, initialJobId, employerId, startedYear, startingSalary, salary, salaryHistory, promotions,
    ...(startingFactor !== undefined ? { startingFactor } : {}), endedYear: life.year, reason });
  life.career.current = null;
  life.career.seeking = reason === 'dismissed' || reason === 'redundant';
}

function startEmployment(life: Life, vacancy: Vacancy) {
  const { job, employer, salary, factor } = vacancy;
  if (life.career.current) endEmployment(life, 'changed jobs');
  life.career.current = {
    jobId: job.id, initialJobId: job.id, employerId: employer.id, startedYear: life.year, startingSalary: salary, startingFactor: factor, salary,
    salaryHistory: [], promotions: [], hours: job.hours, performance: 50, satisfaction: employer.culture,
    security: employer.stability, stress: job.stress, warnings: 0, review: 'new',
  };
  life.career.seeking = false;
  ensureWorkplace(life, employer.id);
  record(life, 'career', `I accepted a job as ${job.title} at ${employer.name}.`);
}

function salaryChange(current: CurrentJob, year: number, salary: number, reason: 'raise' | 'promotion', factor: number) {
  current.salary = salary;
  current.salaryHistory.push({ year, salary, reason, factor });
}

function requestRaise(life: Life, current: CurrentJob) {
  const job = jobById.get(current.jobId)!;
  const employer = employerById.get(current.employerId)!;
  const random = seededRandom(life.random);
  const last = current.salaryHistory.at(-1);
  const factor = marketSalaryFactor(life.world, job, employer.id);
  const [minimum, maximum] = salaryBand(job, factor);
  const room = current.salary < maximum;
  const company = life.world.employers[employer.id]!;
  const chance = clamp(current.performance * .65 + company.flexibility * .21 + Math.min(14, (life.year - current.startedYear) * 4) - 23 +
    (national(life.world).labor - 55) * .27);
  const approved = room && life.year > current.startedYear && (!last || last.year < life.year - 1) &&
    current.performance >= 55 && random.next() * 100 < chance;
  life.random = random.state;
  if (approved) salaryChange(current, life.year, Math.min(maximum, Math.max(minimum, current.salary + Math.max(100, Math.round(current.salary * .055)))), 'raise', factor);
  recordNotice(life, 'career', 'Raise Request', approved ? `My raise request at ${employer.name} was approved.` : `My raise request at ${employer.name} was declined.`,
    { happiness: approved ? 3 : -2 });
}

export function performCareerAction(life: Life, action: CareerAction) {
  const issue = careerActionIssue(life, action);
  if (issue) return issue;
  const career = life.career;
  if (action.type === 'seek-work') { career.seeking = true; return null; }
  if (action.type === 'resign') {
    const title = jobById.get(career.current!.jobId)!.title;
    endEmployment(life, 'resigned');
    record(life, 'career', `I resigned from my job as ${title}.`);
  } else if (action.type === 'retire') {
    endEmployment(life, 'retired');
    career.retiredYear = life.year;
    career.seeking = false;
    for (const application of career.applications) if (application.result === 'offered') application.result = 'expired';
    record(life, 'career', 'I retired from the workforce.');
  } else if ('vacancy' in action) {
    const vacancy = vacancies(life).find(({ id }) => id === action.vacancy)!;
    if (action.type === 'apply-job') {
      const reason = vacancyIssue(life, vacancy);
      const random = seededRandom(life.random);
      const accepted = !reason && applicationScore(life, vacancy) + random.integer(-12, 14) >= vacancy.competition;
      life.random = random.state;
      if (!career.current) career.seeking = true;
      career.applications.push({ id: vacancy.id, jobId: vacancy.job.id, employerId: vacancy.employer.id,
        salary: vacancy.salary, factor: vacancy.factor, year: life.year, result: reason ? 'ineligible' : accepted ? 'offered' : 'rejected', ...(reason ? { reason } : {}) });
      recordNotice(life, 'career', accepted ? 'Job Offer' : 'Job Application', reason ? `I was ineligible for ${vacancy.job.title}. ${reason}` :
        accepted ? `I received an offer for ${vacancy.job.title} at ${vacancy.employer.name}.` :
          `My application for ${vacancy.job.title} at ${vacancy.employer.name} was declined.`);
    } else {
      const offer = career.applications.find(({ id }) => id === vacancy.id)!;
      if (action.type === 'decline-job') {
        offer.result = 'declined';
        record(life, 'career', `I declined the ${vacancy.job.title} offer from ${vacancy.employer.name}.`);
      } else {
        offer.result = 'accepted';
        startEmployment(life, vacancy);
      }
    }
  } else if (action.type === 'work-hours') {
    career.current!.hours = action.hours;
    record(life, 'career', `I switched to working ${action.hours} hours a week.`);
  } else if (action.type === 'work-harder' || action.type === 'request-raise') {
    life.usedActions.push(action.type);
    if (action.type === 'request-raise') requestRaise(life, career.current!);
    else {
      const job = jobById.get(career.current!.jobId)!;
      applyCareerEffect(life, { performance: 9 + Math.floor(jobSkillStrength(life, job) / 25), stress: 6 });
      developJobSkills(life, job, 1);
      record(life, 'career', 'I put in extra effort at work.', { stress: 4 });
    }
  }
  return null;
}

export function applyCareerEffect(life: Life, effect: CareerEffect) {
  life.career.reputation = clamp(life.career.reputation + (effect.reputation ?? 0));
  const current = life.career.current;
  if (!current) return;
  for (const key of ['performance', 'satisfaction', 'security', 'stress'] as const) current[key] = clamp(current[key] + (effect[key] ?? 0));
}

export function advanceCareer(life: Life, random: ReturnType<typeof seededRandom>) {
  const career = life.career;
  const current = career.current;
  if (!current) return;
  const job = jobById.get(current.jobId)!;
  const employer = employerById.get(current.employerId)!;
  const company = life.world.employers[employer.id]!;
  const economy = national(life.world);
  const economicPressure = economy.regime === 'recession' || economy.regime === 'crisis';
  const redundancyRisk = economicPressure ? Math.max(0, (45 - company.demand) / 215 + (66 - company.health) / 330) : 0;
  if (current.startedYear < life.year && redundancyRisk > 0 &&
    seededRandom(life.seed ^ life.world.random ^ Math.imul(life.year, 0x82f27c03)).next() < Math.min(.36, redundancyRisk)) {
    endEmployment(life, 'redundant');
    recordNotice(life, 'career', 'Role Made Redundant', `${employer.name} cut jobs during the downturn. My role was made redundant.`, { happiness: -6, stress: 7 });
    return;
  }
  const attributes = life.character.attributes;
  const overtime = current.hours - job.hours;
  const capacity = (attributes[job.attributes[0]] + attributes[job.attributes[1]]) / 2;
  const skillStrength = jobSkillStrength(life, job);
  const workloadStress = Math.round((job.stress - current.stress) * .18 + overtime * 1.1);
  const performance = Math.round((capacity - current.performance) * .12 + (attributes.discipline - 45) / 13 +
    Math.min(4, overtime / 2) - current.stress / 23 + random.integer(-3, 3) + skillStrength * .04);
  applyCareerEffect(life, {
    performance, stress: workloadStress,
    security: (current.performance >= 60 ? 3 : current.performance < 38 ? -12 : 0) - (economicPressure ? Math.max(0, Math.round((47 - company.demand) / 5)) : 0),
    satisfaction: Math.round((employer.culture - current.satisfaction) * .12 - overtime * .55 - current.stress / 25),
    reputation: current.performance >= 65 ? 3 : current.performance < 38 ? -2 : 0,
  });
  attributes.health = clamp(attributes.health - (overtime > 2 && current.stress >= 65 ? 2 : 0));
  attributes.stress = clamp(attributes.stress + Math.round(current.stress / 18));
  current.review = current.performance >= 70 ? 'strong' : 'steady';

  if (current.performance < 36 || current.security < 24) {
    current.warnings += 1;
    current.review = 'warning';
    if (current.warnings >= 2) {
      endEmployment(life, 'dismissed');
      recordNotice(life, 'career', 'Dismissal', `I was dismissed from ${employer.name} after poor performance reviews.`, { happiness: -8, stress: 8 });
    } else recordNotice(life, 'career', 'Performance Warning', `I received a performance warning at ${employer.name}.`, { stress: 4 });
    return;
  }
  current.warnings = 0;
  if (current.performance >= 45) developJobSkills(life, job, current.performance >= 70 ? 2 : 1);
  const promotion = job.promotions.map((id) => jobById.get(id)!).find((next) => !jobRequirementsIssue(life, next));
  const factor = promotion ? marketSalaryFactor(life.world, promotion, employer.id) : indexBase;
  const [minimum, maximum] = promotion ? salaryBand(promotion, factor) : [0, 0];
  if (promotion && maximum > current.salary && current.performance >= 72 && career.reputation >= 12 && current.security >= 55 &&
    random.next() < .13 + company.stability / 500 + (current.performance - 72) / 95 + jobSkillStrength(life, promotion) * .0015 + (economy.labor - 55) / 210) {
    current.promotions.push({ year: life.year, from: job.id, to: promotion.id });
    current.jobId = promotion.id;
    current.hours = promotion.hours;
    current.review = 'promoted';
    salaryChange(current, life.year, Math.min(maximum, Math.max(minimum, Math.round(current.salary * 1.10))), 'promotion', factor);
    recordNotice(life, 'career', 'Promotion', `I was promoted to ${promotion.title} at ${employer.name}.`, { happiness: 6 });
  } else record(life, 'career', `My performance review at ${employer.name} was ${current.review === 'strong' ? 'strong' : 'steady'}.`);
}

export function closeCareerYear(life: Life) {
  const career = life.career;
  for (const application of career.applications) if (application.year < life.year && application.result === 'offered') application.result = 'expired';
  if (career.current && career.current.startedYear < life.year) {
    const industry = jobById.get(career.current.jobId)!.industry;
    career.experience += 1;
    career.industryExperience[industry] = (career.industryExperience[industry] ?? 0) + 1;
  }
}

export function studyWorkload(life: Life) {
  const current = life.career.current;
  const enrollment = life.academic.enrollment;
  if (!current || !enrollment) return;
  const hoursOver = Math.max(0, current.hours - 16);
  enrollment.attendance = clamp(enrollment.attendance - Math.ceil(hoursOver / 3));
  enrollment.stress = clamp(enrollment.stress + Math.ceil(hoursOver / 2));
}
