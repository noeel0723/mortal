import type { Industry } from '../engine/careerTypes.ts';
import type { CityEconomy } from '../engine/worldTypes.ts';
import type { City } from '../engine/types.ts';

type Profile = CityEconomy & { rent: number; specializations: readonly Industry[] };

export const cityEconomies: Record<City, Profile> = {
  'Alder Bay': { population: 362000, cost: 10500, housing: 10600, jobs: 57, education: 79, healthcare: 68, qualityOfLife: 76,
    rent: 16400, specializations: ['Technology', 'Finance', 'Creative & Media'] },
  Bellmere: { population: 216000, cost: 9800, housing: 10000, jobs: 51, education: 75, healthcare: 76, qualityOfLife: 75,
    rent: 14500, specializations: ['Hospitality', 'Education', 'Retail'] },
  Northwick: { population: 272000, cost: 9400, housing: 9500, jobs: 53, education: 78, healthcare: 83, qualityOfLife: 73,
    rent: 12900, specializations: ['Engineering', 'Healthcare', 'Administration'] },
};
