import type { Job } from './jobs.ts';
import type { Industry } from '../engine/careerTypes.ts';
import type { SkillId } from './skills.ts';

export const academicSkillLabels: Readonly<Record<string, readonly SkillId[]>> = {
  Literacy: ['writing'], Numeracy: ['mathematics'], Troubleshooting: ['programming'], Networks: ['programming'],
  'Food preparation': ['cooking'], 'Kitchen operations': ['cooking', 'business-management'], Programming: ['programming'],
  Algorithms: ['programming', 'mathematics'], Finance: ['mathematics', 'business-management'], Operations: ['business-management', 'communication'],
  Design: ['drawing'], 'Applied mathematics': ['mathematics'], 'Clinical reasoning': ['mathematics'], 'Patient care': ['communication'],
  Argumentation: ['public-speaking'], 'Legal research': ['writing'], Teaching: ['communication', 'public-speaking'],
  'Curriculum design': ['writing'], 'Behavioral research': ['mathematics'], Interviewing: ['communication'],
  Composition: ['writing', 'painting'], 'Visual communication': ['drawing', 'photography'], Statistics: ['mathematics'],
  'Economic analysis': ['business-management', 'mathematics'], 'Systems research': ['programming'],
  'Scientific computing': ['programming', 'mathematics'], Leadership: ['leadership'], 'Education policy': ['leadership', 'writing'],
  Econometrics: ['mathematics'], 'Policy research': ['writing', 'communication'],
};

const tagCompetencies: Readonly<Record<string, readonly SkillId[]>> = {
  software: ['programming'], 'advanced-software': ['programming'], 'it-support': ['programming', 'communication'],
  data: ['programming', 'mathematics'], 'computing-research': ['programming', 'mathematics'],
  healthcare: ['communication'], hospitality: ['communication', 'cooking'], 'food-service': ['cooking'],
  finance: ['mathematics', 'business-management'], 'economic-research': ['mathematics'],
  engineering: ['mathematics'], legal: ['writing', 'public-speaking'], teaching: ['communication', 'public-speaking'],
  'education-leadership': ['leadership'], design: ['drawing', 'photography'], administration: ['communication', 'business-management'],
  management: ['leadership', 'business-management'],
};

const industryCompetencies: Partial<Record<Industry, readonly SkillId[]>> = {
  Retail: ['communication'], Hospitality: ['cooking', 'communication'], Administration: ['communication', 'writing'],
  Technology: ['programming'], Finance: ['mathematics'], 'Creative & Media': ['photography', 'writing'],
};

export function jobCompetencies(job: Job): SkillId[] {
  const tagged = [...new Set(job.tags.flatMap((tag) => tagCompetencies[tag] ?? []))];
  return tagged.length ? tagged : [...(industryCompetencies[job.industry] ?? ['communication'])];
}
