import type { City } from '../engine/types.ts';
import type { Industry } from '../engine/careerTypes.ts';
import type { NationalSnapshot, WorldState } from '../engine/worldTypes.ts';

type Conditions = Pick<WorldState, 'cities' | 'industries'> & { national: NationalSnapshot };
type WorldEvent = { title: string; story: string; chance: number; duration: number;
  eligible: (conditions: Conditions) => boolean; industry?: Industry; city?: City;
  effects?: { growth?: number; inflation?: number; labor?: number; education?: number; healthcare?: number; sector?: number; housing?: number; localJobs?: number } };

export const worldEvents: Readonly<Record<string, WorldEvent>> = {
  'technology-boom': { title: 'Technology Orders Rise', story: 'Veyra’s technology firms are taking on more work, lifting their hiring demand.',
    chance: .31, duration: 2, industry: 'Technology', effects: { sector: 12 },
    eligible: ({ national, industries }) => national.growth > 100 && industries.Technology.demand >= 53 },
  'labor-shortage': { title: 'Employers Compete for Workers', story: 'A tight labor market has prompted employers to expand recruitment.',
    chance: .33, duration: 2, effects: { labor: 5, inflation: 30 }, eligible: ({ national }) => national.unemployment <= 435 && national.labor >= 60 },
  'housing-expansion': { title: 'Bellmere Adds Housing', story: 'New housing in Bellmere eases pressure on local prices and supports local work.',
    chance: .28, duration: 3, city: 'Bellmere', effects: { housing: -320, localJobs: 5 },
    eligible: ({ national, cities }) => national.growth >= 0 && cities.Bellmere.housing >= 10000 },
  'housing-pressure': { title: 'Alder Bay Housing Tightens', story: 'Strong demand puts more pressure on housing prices in Alder Bay.',
    chance: .25, duration: 2, city: 'Alder Bay', effects: { housing: 450 },
    eligible: ({ national, cities }) => national.growth > 60 && cities['Alder Bay'].jobs >= 57 },
  'living-costs': { title: 'Households Face Higher Prices', story: 'A supply disruption has added to inflation in Veyra.',
    chance: .28, duration: 2, effects: { inflation: 90 }, eligible: ({ national }) => national.inflation >= 215 },
  'rail-investment': { title: 'Northwick Rail Investment', story: 'Rail improvements support engineering demand and local hiring in Northwick.',
    chance: .22, duration: 3, city: 'Northwick', industry: 'Engineering', effects: { sector: 8, localJobs: 8 },
    eligible: ({ national, cities }) => national.stability >= 55 && cities.Northwick.jobs <= 59 },
  'education-reform': { title: 'Education Funding Widens Access', story: 'New funding supports Veyra’s schools, training programs, and education-sector employment.',
    chance: .16, duration: 2, industry: 'Education', effects: { education: 2, sector: 5 },
    eligible: ({ national }) => national.stability >= 58 && national.education < 84 && national.growth >= 0 },
  'healthcare-investment': { title: 'Healthcare Access Improves', story: 'New clinic funding supports care access and healthcare hiring.',
    chance: .17, duration: 2, industry: 'Healthcare', effects: { healthcare: 2, sector: 6 },
    eligible: ({ national }) => national.stability >= 55 && national.healthcare < 86 },
  'hospitality-contraction': { title: 'Hospitality Cuts Back', story: 'Weak demand is putting pressure on hospitality hiring and wages.',
    chance: .35, duration: 2, industry: 'Hospitality', effects: { sector: -12 },
    eligible: ({ national, industries }) => national.growth < 0 && industries.Hospitality.demand < 49 },
  recession: { title: 'Veyra Enters a Recession', story: 'Output is contracting and employers face weaker recruitment conditions.',
    chance: 0, duration: 1, eligible: () => false },
  crisis: { title: 'The Downturn Deepens', story: 'Falling output and weak labor demand put employers under additional pressure.',
    chance: 0, duration: 1, eligible: () => false },
  recovery: { title: 'Recovery Starts in Veyra', story: 'Economic output is growing again, with hiring gradually improving.',
    chance: 0, duration: 1, eligible: () => false },
};
