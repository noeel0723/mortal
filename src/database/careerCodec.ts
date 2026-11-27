import { employerById } from '../data/employers.ts';
import { jobById } from '../data/jobs.ts';
import { retirementAge, workHours } from '../engine/career.ts';
import { industries, workRoles } from '../engine/careerTypes.ts';
import { livingCategories } from '../engine/financeTypes.ts';
import { salaryBand, salaryFactorBounds } from '../engine/pricing.ts';
import type { Job } from '../data/jobs.ts';

const reasons = ['resigned', 'changed jobs', 'dismissed', 'redundant', 'retired', 'died'];
const reviews = ['new', 'steady', 'strong', 'warning', 'promoted'];
const outcomes = ['offered', 'rejected', 'ineligible', 'accepted', 'declined', 'expired'];
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const int = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
const stat = (value: unknown) => int(value, 0, 100);
const salaryWithin = (salary: unknown, job: Job, factor: unknown) =>
  (factor === undefined || int(factor, ...salaryFactorBounds)) && int(salary, ...salaryBand(job, factor));

export function validateCareer(value: unknown, year: number, birthYear: number, enrolled: boolean, dead: boolean, savedPerson: (person: unknown) => person is Record<string, unknown>) {
  const minYear = birthYear + 18;
  const dated = (date: unknown) => int(date, minYear, year);
  if (!object(value) || typeof value.seeking !== 'boolean' || !int(value.experience, 0, Math.max(0, year - minYear)) ||
    !stat(value.reputation) || !object(value.industryExperience) ||
    !Object.entries(value.industryExperience).every(([key, years]) => industries.some((industry) => industry === key) && int(years, 0, 115)) ||
    Object.values(value.industryExperience).reduce<number>((total, years) => total + Number(years), 0) !== value.experience ||
    (value.retiredYear !== null && (!int(value.retiredYear, birthYear + retirementAge, year) || value.seeking)) ||
    !Array.isArray(value.history) || !Array.isArray(value.contacts) || !Array.isArray(value.applications)) return false;

  function jobRecord(item: unknown): item is Record<string, unknown> {
    if (!object(item) || typeof item.jobId !== 'string' || typeof item.initialJobId !== 'string' || typeof item.employerId !== 'string') return false;
    const job = jobById.get(item.jobId);
    const first = jobById.get(item.initialJobId);
    const employer = employerById.get(item.employerId);
    if (!job || !first || first.industry !== job.industry || !employer?.industries.includes(job.industry) ||
      !int(item.startedYear, birthYear + first.age, year) || !salaryWithin(item.startingSalary, first, item.startingFactor) ||
      !Array.isArray(item.promotions) || !Array.isArray(item.salaryHistory)) return false;
    const start = item.startedYear;
    const end = typeof item.endedYear === 'number' ? item.endedYear : year;
    let previousJob = first;
    let previousYear = start;
    const changesOfRole: { year: number; job: Job }[] = [];
    for (const promotion of item.promotions) {
      if (!object(promotion) || promotion.from !== previousJob.id || typeof promotion.to !== 'string' ||
        !previousJob.promotions.includes(promotion.to) || !int(promotion.year, previousYear + 1, end)) return false;
      previousJob = jobById.get(promotion.to)!;
      previousYear = promotion.year;
      changesOfRole.push({ year: previousYear, job: previousJob });
    }
    if (previousJob.id !== job.id) return false;
    let lastSalary = Number(item.startingSalary);
    let lastYear = start;
    let paidRole = first;
    let promoted = 0;
    for (const change of item.salaryHistory) {
      if (!object(change) || !int(change.year, lastYear, end)) return false;
      const promotion = changesOfRole[promoted];
      if (change.reason === 'promotion') {
        if (promotion?.year !== change.year) return false;
        paidRole = promotion.job;
        promoted++;
      } else if (change.reason !== 'raise' || (promotion && promotion.year <= change.year)) return false;
      if (!salaryWithin(change.salary, paidRole, change.factor) || Number(change.salary) <= lastSalary) return false;
      lastSalary = Number(change.salary);
      lastYear = change.year;
    }
    return lastSalary === item.salary && promoted === changesOfRole.length;
  }

  let previousEnd = minYear;
  for (const job of value.history) {
    if (!jobRecord(job) || !int(job.endedYear, Number(job.startedYear), year) || Number(job.startedYear) < previousEnd ||
      !reasons.some((reason) => reason === job.reason)) return false;
    previousEnd = job.endedYear;
  }
  if (value.current !== null) {
    const current = value.current;
    if (dead || value.seeking || value.retiredYear !== null || !jobRecord(current) || Number(current.startedYear) < previousEnd ||
      ![current.performance, current.satisfaction, current.security, current.stress].every(stat) ||
      !int(current.warnings, 0, 1) || !reviews.some((review) => review === current.review)) return false;
    const job = jobById.get(String(current.jobId))!;
    if (!workHours(job).some((hours) => hours === current.hours) || (enrolled && job.type === 'full-time')) return false;
  }
  const ids = new Set<unknown>();
  for (const application of value.applications) {
    if (!object(application) || !dated(application.year) || typeof application.jobId !== 'string' || typeof application.employerId !== 'string' ||
      application.id !== `${application.year}-${application.jobId}-${application.employerId}` || ids.has(application.id) ||
      !outcomes.some((outcome) => outcome === application.result) || (application.result === 'offered' && (application.year !== year || value.retiredYear !== null)) ||
      (application.reason !== undefined && typeof application.reason !== 'string')) return false;
    const job = jobById.get(application.jobId);
    if (!job || !employerById.get(application.employerId)?.industries.includes(job.industry) || !salaryWithin(application.salary, job, application.factor)) return false;
    ids.add(application.id);
  }
  const contacts = new Set<unknown>();
  for (const person of value.contacts) {
    if (!savedPerson(person) || typeof person.id !== 'string' || typeof person.employerId !== 'string' ||
      !employerById.has(person.employerId) || !workRoles.some((role) => role === person.role) ||
      ![0, 1, 2, 3, 4].some((index) => person.id === `work-${person.employerId}-${index}`) ||
      contacts.has(person.id) || typeof person.friend !== 'boolean') return false;
    contacts.add(person.id);
  }
  return value.current === null || [0, 1, 2, 3, 4].every((index) => contacts.has(`work-${(value.current as Record<string, unknown>).employerId}-${index}`));
}

export function validateFinance(value: unknown, year: number, birthYear: number) {
  if (!object(value) || !object(value.arrears)) return false;
  const arrears = value.arrears;
  return (value.lastSettledYear === null || int(value.lastSettledYear, birthYear + 19, year)) &&
    livingCategories.every((key) => int(arrears[key], 0, Number.MAX_SAFE_INTEGER));
}
