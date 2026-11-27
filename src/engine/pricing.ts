import { cityEconomies } from '../data/cityEconomies.ts';
import { employerById } from '../data/employers.ts';
import type { Job } from '../data/jobs.ts';
import type { City } from './types.ts';
import { national } from './world.ts';
import { indexBase } from './worldTypes.ts';
import type { WorldState } from './worldTypes.ts';

export const salaryFactorBounds = [8000, 18500] as const;

export function indexedCents(base: number, ...factors: number[]) {
  const nominal = factors.reduce((amount, factor) => amount * (factor / indexBase), base);
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.round(nominal)));
}

export function localExpense(world: WorldState, city: City, base: number, housing = false) {
  const local = world.cities[city];
  const adjustment = housing ? local.housing / cityEconomies[city].housing * indexBase : local.cost;
  return indexedCents(base, national(world).priceIndex, adjustment);
}

export function marketSalaryFactor(world: WorldState, job: Job, employerId: string) {
  const city = employerById.get(employerId)?.city;
  const sector = world.industries[job.industry];
  const employer = world.employers[employerId];
  const purchasingPower = (national(world).priceIndex - indexBase) * .54;
  const pressure = (sector.wages - indexBase) * .62 + ((city ? world.cities[city].jobs : 55) - 55) * 8 + ((employer?.flexibility ?? 55) - 55) * 7;
  return Math.round(Math.max(salaryFactorBounds[0], Math.min(salaryFactorBounds[1], indexBase + purchasingPower + pressure)));
}

export function salaryBand(job: Job, factor = indexBase): [number, number] {
  return [indexedCents(job.salary[0], factor), indexedCents(job.salary[1], factor)];
}
