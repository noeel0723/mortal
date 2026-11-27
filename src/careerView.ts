import { employerById } from './data/employers.ts';
import { jobById } from './data/jobs.ts';
import type { Job } from './data/jobs.ts';
import { jobCompetencies } from './data/skillLinks.ts';
import { skills } from './data/skills.ts';
import { careerActionIssue, employmentStatus, jobRequirementsIssue, retirementAge, vacancies } from './engine/career.ts';
import type { CareerAction, EmploymentType, Industry, JobApplication } from './engine/careerTypes.ts';
import { financeLabels, outstanding, transactionCategory } from './engine/finance.ts';
import { livingCategories } from './engine/financeTypes.ts';
import type { Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export const employmentLabels: Record<EmploymentType, string> = { 'part-time': 'Part-time', 'full-time': 'Full-time' };
export const outcomeLabels: Record<JobApplication['result'], string> = {
  offered: 'Offer available', rejected: 'Application declined', ineligible: 'Ineligible', accepted: 'Accepted',
  declined: 'Offer declined', expired: 'Offer expired',
};

export type CareerControl = { label: string; icon: Emoji; action: CareerAction; issue: string | null; detail?: string };
export type JobFilters = { query: string; industry: Industry | ''; type: EmploymentType | '' };
export const defaultJobFilters: JobFilters = { query: '', industry: '', type: '' };

const industryIcons: Record<Industry, Emoji> = {
  Technology: 'laptop', Healthcare: 'medical', Finance: 'harder', Education: 'school', Engineering: 'settings',
  Administration: 'files', Hospitality: 'restaurant', Retail: 'cart', Legal: 'court', 'Creative & Media': 'art',
};
const roleIcons: Partial<Record<string, Emoji>> = {
  cashier: 'bank', 'retail-supervisor': 'work', barista: 'coffee', cook: 'cooking', 'restaurant-supervisor': 'work',
  'office-assistant': 'work', 'office-coordinator': 'work', 'operations-manager': 'career', 'it-support': 'computer',
  'support-lead': 'vocational', 'engineering-manager': 'work', 'data-assistant': 'stats', 'accounts-assistant': 'calculator',
  'teaching-assistant': 'study', 'department-head': 'university', 'junior-engineer': 'blueprint', 'media-assistant': 'camera',
};

export function jobIcon(job: Job): Emoji {
  return roleIcons[job.id] ?? industryIcons[job.industry];
}

export function careerCard(life: Life): { title: string; detail?: string; icon: Emoji } {
  const current = life.career.current;
  if (current) {
    const job = jobById.get(current.jobId)!;
    return { title: job.title, detail: employerById.get(current.employerId)!.name, icon: jobIcon(job) };
  }
  return { title: employmentStatus(life), icon: life.career.retiredYear !== null ? 'retire' : life.career.seeking ? 'search' : 'career' };
}

export function careerControl(life: Life, action: CareerAction, label: string, icon: Emoji, detail?: string): CareerControl {
  return { action, label, icon, detail, issue: careerActionIssue(life, action) };
}

export function careerRows(life: Life) {
  const job = life.career.current;
  const rows: { label: string; value: string | number }[] = [];
  if (job) {
    const definition = jobById.get(job.jobId)!;
    rows.push(
      { label: 'Employment', value: employmentStatus(life) },
      { label: 'Industry', value: definition.industry },
      { label: 'Annual gross salary', value: money(job.salary) },
      { label: 'Years in this job', value: life.year - job.startedYear },
      { label: 'Industry experience', value: `${life.career.industryExperience[definition.industry] ?? 0} years` },
      { label: 'Working week', value: `${job.hours} hrs` },
      { label: 'Professional reputation', value: `${life.career.reputation}%` },
    );
  } else if (life.career.experience > 0) rows.push({ label: 'Professional experience', value: `${life.career.experience} years` });
  if (life.career.retiredYear !== null) rows.push({ label: 'Retired in', value: life.career.retiredYear });
  return rows;
}

export function jobRatings(life: Life) {
  const job = life.career.current;
  return job ? [
    { label: 'Performance', value: job.performance }, { label: 'Satisfaction', value: job.satisfaction },
    { label: 'Job security', value: job.security }, { label: 'Work stress', value: job.stress },
  ] : [];
}

export function jobListings(life: Life, filters: JobFilters = defaultJobFilters) {
  const { industry, type, query } = filters;
  const applications = new Map(life.career.applications.filter(({ year }) => year === life.year).map((item) => [item.id, item]));
  const search = query.trim().toLowerCase();
  return vacancies(life).filter(({ job }) => (!industry || job.industry === industry) && (!type || job.type === type) &&
      (!search || job.title.toLowerCase().includes(search)))
    .map((vacancy) => {
      const { job, employer } = vacancy;
      const application = applications.get(vacancy.id);
      const issue = life.career.current?.jobId === job.id && life.career.current.employerId === employer.id ? 'You already hold this job.' :
        jobRequirementsIssue(life, job);
      return { ...vacancy, application, issue, status: application ? outcomeLabels[application.result] : issue ? 'Ineligible' : 'Eligible' };
    })
    .sort((a, b) => Number(b.application?.result === 'offered') - Number(a.application?.result === 'offered') ||
      Number(!!a.issue) - Number(!!b.issue) || a.job.title.localeCompare(b.job.title));
}

export type Listing = ReturnType<typeof jobListings>[number];

export function vacancyRows(listing: Listing) {
  const { job, employer, salary, status, issue, application } = listing;
  return [
    { label: 'Employer', value: employer.name }, { label: 'City', value: employer.city },
    { label: 'Industry', value: job.industry }, { label: 'Employment type', value: employmentLabels[job.type] },
    { label: 'Annual gross salary', value: money(salary) }, { label: 'Working week', value: `${job.hours} hrs` },
    { label: 'Minimum age', value: job.age }, { label: 'Qualification', value: job.qualification ?? 'None required' },
    ...(job.tags.length ? [{ label: 'Relevant fields', value: job.tags.join(', ') }] : []),
      { label: 'Preferred skills', value: jobCompetencies(job).map((id) => skills[id].name).join(', ') },
    { label: 'Industry experience', value: job.experience ? `${job.experience} years` : 'None required' },
    { label: 'Application status', value: status },
    ...((application?.reason ?? issue) ? [{ label: 'Eligibility', value: (application?.reason ?? issue)! }] : []),
  ];
}

export function vacancyActions(life: Life, listing: Listing) {
  const { id, application } = listing;
  if (application?.result === 'offered') return [
    careerControl(life, { type: 'accept-job', vacancy: id }, 'Accept Offer', 'accept', life.career.current ? 'Ends your current job and starts this contract.' : 'Starts the contract. Salary is paid at the next Age Up.'),
    careerControl(life, { type: 'decline-job', vacancy: id }, 'Decline Offer', 'decline'),
  ];
  if (application) return [];
  return [careerControl(life, { type: 'apply-job', vacancy: id }, 'Apply for Job', jobIcon(listing.job),
    listing.issue ? 'Submit an application and see the eligibility decision.' : undefined)];
}

export function lifetimeEarnings(life: Life) {
  return life.transactions.filter((item) => transactionCategory(item) === 'salary').reduce((total, item) => total + item.amount, 0);
}

export function careerTimeline(life: Life) {
  const jobsHeld = [
    ...(life.career.current ? [{ ...life.career.current, endedYear: null, reason: 'Current position' }] : []),
    ...[...life.career.history].reverse(),
  ];
  return jobsHeld.map((item) => ({
    title: jobById.get(item.jobId)!.title,
    rows: [
      { label: 'Employer', value: employerById.get(item.employerId)!.name },
      { label: 'Employment dates', value: `${item.startedYear}–${item.endedYear ?? 'present'}` },
      { label: 'Reason', value: item.reason },
      { label: 'Starting salary', value: money(item.startingSalary) }, { label: 'Final salary', value: money(item.salary) },
      ...item.promotions.map((promotion) => ({ label: `Promotion · ${promotion.year}`, value: jobById.get(promotion.to)!.title })),
      ...item.salaryHistory.map((change) => ({ label: `Salary after ${change.reason} · ${change.year}`, value: money(change.salary) })),
    ],
  }));
}

export function careerSummary(life: Life) {
  const last = life.career.current ?? life.career.history.at(-1);
  if (!last && life.career.retiredYear === null) return [];
  return [
    ...(last ? [{ label: 'Last position', value: jobById.get(last.jobId)!.title }] : []),
    { label: 'Career earnings', value: money(lifetimeEarnings(life)) },
    { label: 'Professional experience', value: `${life.career.experience} years` },
    { label: 'Promotions earned', value: life.career.history.reduce((total, item) => total + item.promotions.length, life.career.current?.promotions.length ?? 0) },
    ...(life.career.retiredYear !== null ? [{ label: 'Retired in', value: life.career.retiredYear }] : []),
  ];
}

export function canShowRetirement(life: Life) {
  return life.character.age >= retirementAge && life.career.retiredYear === null && !life.character.causeOfDeath;
}

export function financeYears(life: Life) {
  return [...new Set([life.year, ...life.transactions.map(({ year }) => year)])].sort((a, b) => b - a);
}

export function financeOverview(life: Life, year: number) {
  const totals = new Map<string, number>();
  let net = 0;
  for (const entry of life.transactions) {
    if (entry.year !== year) continue;
    const category = transactionCategory(entry);
    totals.set(category, (totals.get(category) ?? 0) + entry.amount);
    net += entry.amount;
  }
  return [
    { label: 'Balance', value: money(life.character.bank) },
    { label: 'Gross salary', value: money(totals.get('salary') ?? 0) },
    { label: 'Income tax', value: money(Math.abs(totals.get('tax') ?? 0)) },
    { label: 'Living expenses paid', value: money(Math.abs(livingCategories.reduce((sum, category) => sum + (totals.get(category) ?? 0), 0))) },
    { label: 'Tuition paid', value: money(Math.abs(totals.get('tuition') ?? 0)) },
    ...(totals.has('medical') ? [{ label: 'Doctor visits', value: money(Math.abs(totals.get('medical')!)) }] : []),
    ...(totals.has('shopping') ? [{ label: 'Asset purchases', value: money(Math.abs(totals.get('shopping')!)) }] : []),
    { label: 'Scholarships', value: money(totals.get('scholarship') ?? 0) },
    { label: 'Net savings', value: money(net) },
    { label: 'Outstanding living bills', value: money(outstanding(life)) },
  ];
}

export function financeEntries(life: Life, year: number | null) {
  return [...life.transactions].reverse().filter((entry) => year === null || entry.year === year)
    .map((entry) => ({ ...entry, group: financeLabels[transactionCategory(entry)] }));
}
