import type { Industry } from './careerTypes.ts';
import type { City } from './types.ts';

export const economicRegimes = ['expansion', 'boom', 'stagnation', 'recession', 'crisis', 'recovery'] as const;
export type EconomicRegime = typeof economicRegimes[number];
export const indexBase = 10000;
export const worldBounds = {
  growth: [-900, 850], inflation: [-240, 680], priceIndex: [7200, 25000], output: [5000, 45000],
  unemployment: [220, 2550], interest: [100, 1550], population: [50000, 5000000], localIndex: [7500, 16500],
} as const;

export type NationalSnapshot = {
  year: number;
  regime: EconomicRegime;
  population: number;
  output: number;
  growth: number;
  inflation: number;
  priceIndex: number;
  unemployment: number;
  labor: number;
  interest: number;
  stability: number;
  qualityOfLife: number;
  education: number;
  healthcare: number;
};

export type IndustryEconomy = { growth: number; demand: number; employment: number; wages: number; confidence: number };
export type CityEconomy = { population: number; cost: number; housing: number; jobs: number; education: number; healthcare: number; qualityOfLife: number };
export type EmployerEconomy = { health: number; demand: number; stability: number; flexibility: number };
export type WorldNews = { id: string; year: number; endYear: number };
export type WorldState = {
  country: 'Veyra';
  random: number;
  history: NationalSnapshot[];
  industries: Record<Industry, IndustryEconomy>;
  cities: Record<City, CityEconomy>;
  employers: Record<string, EmployerEconomy>;
  news: WorldNews[];
};
