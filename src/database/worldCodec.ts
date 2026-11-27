import { employers } from '../data/employers.ts';
import { cities } from '../data/veyra.ts';
import { worldEvents } from '../data/worldEvents.ts';
import { industries } from '../engine/careerTypes.ts';
import { economicRegimes, worldBounds, indexBase } from '../engine/worldTypes.ts';

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const int = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= low && value <= high;
const score = (value: unknown) => int(value, 0, 100);

export function validWorld(value: unknown, year: number, birthYear: number) {
  if (!object(value) || value.country !== 'Veyra' || !int(value.random, 0, 0xffffffff) ||
    !Array.isArray(value.history) || value.history.length === 0 || value.history.length > year - birthYear + 1 ||
    !object(value.industries) || !object(value.cities) || !object(value.employers) || !Array.isArray(value.news)) return false;
  const start = year - value.history.length + 1;
  let previousPrice: number = indexBase;
  let previousOutput: number = indexBase;
  for (const [offset, snapshot] of value.history.entries()) {
    if (!object(snapshot) || snapshot.year !== start + offset || !economicRegimes.some((regime) => regime === snapshot.regime) ||
      !int(snapshot.population, worldBounds.population[0] * cities.length, worldBounds.population[1] * cities.length) ||
      !int(snapshot.output, ...worldBounds.output) || !int(snapshot.growth, ...worldBounds.growth) ||
      !int(snapshot.inflation, ...worldBounds.inflation) || !int(snapshot.priceIndex, ...worldBounds.priceIndex) ||
      !int(snapshot.unemployment, ...worldBounds.unemployment) || !int(snapshot.interest, ...worldBounds.interest) ||
      ![snapshot.labor, snapshot.stability, snapshot.qualityOfLife, snapshot.education, snapshot.healthcare].every(score)) return false;
    const indexFor = (last: number, rate: number, [min, max]: readonly [number, number]) =>
      Math.round(Math.min(max, Math.max(min, last * (1 + rate / indexBase))));
    if (snapshot.priceIndex !== (offset ? indexFor(previousPrice, snapshot.inflation, worldBounds.priceIndex) : indexBase) ||
      snapshot.output !== (offset ? indexFor(previousOutput, snapshot.growth, worldBounds.output) : indexBase)) return false;
    previousPrice = snapshot.priceIndex;
    previousOutput = snapshot.output;
  }
  const sectorStates = value.industries;
  if (Object.keys(sectorStates).length !== industries.length || !industries.every((industry) => {
    const state = sectorStates[industry];
    return object(state) && int(state.growth, ...worldBounds.growth) && int(state.wages, 8500, 11700) &&
      [state.demand, state.employment, state.confidence].every(score);
  })) return false;
  const cityStates = value.cities;
  let population = 0;
  for (const city of cities) {
    const state = cityStates[city];
    if (!object(state) || !int(state.population, ...worldBounds.population) || !int(state.housing, ...worldBounds.localIndex) ||
      !int(state.cost, ...worldBounds.localIndex) || ![state.jobs, state.education, state.healthcare, state.qualityOfLife].every(score)) return false;
    population += state.population;
  }
  if (Object.keys(cityStates).length !== cities.length || value.history.at(-1).population !== population) return false;
  const employerStates = value.employers;
  if (Object.keys(employerStates).length !== employers.length || !employers.every(({ id }) => {
    const state = employerStates[id];
    return object(state) && [state.health, state.demand, state.stability, state.flexibility].every(score);
  })) return false;
  let previousYear = start;
  const unique = new Set<string>();
  return value.news.length <= 2 * value.history.length && value.news.every((notice) => {
    if (!object(notice) || typeof notice.id !== 'string' || !Object.hasOwn(worldEvents, notice.id) ||
      !int(notice.year, previousYear, year) || notice.endYear !== notice.year + worldEvents[notice.id]!.duration - 1) return false;
    const key = `${notice.id}:${notice.year}`;
    if (unique.has(key)) return false;
    unique.add(key);
    previousYear = notice.year;
    return true;
  });
}
