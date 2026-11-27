import { cityEconomies } from '../data/cityEconomies.ts';
import { employers } from '../data/employers.ts';
import { cities } from '../data/veyra.ts';
import { worldEvents } from '../data/worldEvents.ts';
import { industries } from './careerTypes.ts';
import type { Industry } from './careerTypes.ts';
import { seededRandom } from './random.ts';
import { indexBase, worldBounds } from './worldTypes.ts';
import type { CityEconomy, EconomicRegime, EmployerEconomy, IndustryEconomy, NationalSnapshot, WorldNews, WorldState } from './worldTypes.ts';

const normal = { growth: 145, inflation: 165, unemployment: 560, labor: 55 };
const targets: Record<EconomicRegime, typeof normal> = {
  expansion: normal, boom: { growth: 390, inflation: 280, unemployment: 325, labor: 78 },
  stagnation: { growth: 30, inflation: 150, unemployment: 730, labor: 47 },
  recession: { growth: -235, inflation: 70, unemployment: 1010, labor: 32 },
  crisis: { growth: -475, inflation: 240, unemployment: 1580, labor: 22 },
  recovery: { growth: 210, inflation: 115, unemployment: 660, labor: 59 },
};

const transitions: Record<EconomicRegime, readonly (readonly [EconomicRegime, number])[]> = {
  expansion: [['expansion', 58], ['boom', 16], ['stagnation', 17], ['recession', 8], ['crisis', 1]],
  boom: [['boom', 48], ['expansion', 26], ['stagnation', 12], ['recession', 12], ['crisis', 2]],
  stagnation: [['stagnation', 48], ['expansion', 22], ['recession', 23], ['crisis', 5], ['recovery', 2]],
  recession: [['recession', 46], ['crisis', 12], ['stagnation', 11], ['recovery', 31]],
  crisis: [['crisis', 26], ['recession', 32], ['recovery', 42]],
  recovery: [['recovery', 31], ['expansion', 52], ['boom', 8], ['stagnation', 6], ['recession', 3]],
};

const sectorTraits: Record<Industry, { cycle: number; trend: number; baseDemand: number }> = {
  Technology: { cycle: 1.25, trend: 95, baseDemand: 57 }, Healthcare: { cycle: .25, trend: 75, baseDemand: 59 },
  Finance: { cycle: 1.22, trend: 20, baseDemand: 52 }, Education: { cycle: .35, trend: 35, baseDemand: 54 },
  Engineering: { cycle: 1.05, trend: 55, baseDemand: 56 }, Administration: { cycle: .45, trend: 5, baseDemand: 53 },
  Hospitality: { cycle: 1.35, trend: 0, baseDemand: 53 }, Retail: { cycle: 1.07, trend: 3, baseDemand: 55 },
  Legal: { cycle: .64, trend: 8, baseDemand: 51 }, 'Creative & Media': { cycle: 1.14, trend: 47, baseDemand: 52 },
};

export const national = (world: WorldState) => world.history.at(-1)!;
const bounded = (value: number, [low, high]: readonly [number, number]) => Math.round(Math.min(high, Math.max(low, value))) || 0;
const score = (value: number) => bounded(value, [0, 100]);
const move = (value: number, target: number, speed: number) => value + (target - value) * speed;

function companyMarkets(world: Pick<WorldState, 'industries' | 'cities'>, previous?: WorldState, random?: ReturnType<typeof seededRandom>) {
  return Object.fromEntries(employers.map((employer): [string, EmployerEconomy] => {
    const sectors = employer.industries.map((industry) => world.industries[industry]);
    const average = (key: keyof IndustryEconomy) => sectors.reduce((sum, sector) => sum + sector[key], 0) / sectors.length;
    const city = world.cities[employer.city];
    const old = previous?.employers[employer.id];
    const volatility = random?.integer(-7, 7) ?? 0;
    const health = score(move(old?.health ?? employer.stability, employer.stability * .46 + average('confidence') * .43 + city.jobs * .11, .62) + volatility);
    return [employer.id, { health,
      demand: score(move(old?.demand ?? 55, average('demand') * .65 + city.jobs * .23 + health * .12, .64) + volatility),
      stability: score(employer.stability * .59 + health * .41),
      flexibility: score(employer.payFlex * .61 + average('confidence') * .25 + health * .14),
    }];
  }));
}

export function newWorld(seed: number, year: number, neutral = false): WorldState {
  const random = seededRandom((seed ^ Math.imul(year, 0x87dcb49b)) >>> 0);
  const jitter = (radius: number) => neutral ? 0 : random.integer(-radius, radius);
  const cityStates = Object.fromEntries(cities.map((city) => {
    const profile = cityEconomies[city];
    return [city, { population: profile.population + jitter(15000), jobs: profile.jobs + jitter(5),
      cost: profile.cost + jitter(220), housing: profile.housing + jitter(310), education: profile.education,
      healthcare: profile.healthcare, qualityOfLife: profile.qualityOfLife }];
  })) as WorldState['cities'];
  const sectors = Object.fromEntries(industries.map((industry) => {
    const demand = sectorTraits[industry].baseDemand + jitter(6);
    return [industry, { growth: 110 + jitter(95), demand, employment: demand, wages: indexBase, confidence: demand }];
  })) as WorldState['industries'];
  const snapshot: NationalSnapshot = { year, regime: 'expansion', population: Object.values(cityStates).reduce((sum, city) => sum + city.population, 0),
    output: indexBase, growth: normal.growth + jitter(55), inflation: neutral ? 0 : normal.inflation + jitter(65), priceIndex: indexBase,
    unemployment: normal.unemployment + jitter(105), labor: normal.labor + jitter(6), interest: 320 + jitter(55),
    stability: 69 + jitter(5), qualityOfLife: 74 + jitter(3), education: 74 + jitter(4), healthcare: 73 + jitter(4) };
  const markets = { cities: cityStates, industries: sectors };
  return { country: 'Veyra', random: random.state, history: [snapshot], ...markets, employers: companyMarkets(markets), news: [] };
}

function nextRegime(world: WorldState, random: ReturnType<typeof seededRandom>): EconomicRegime {
  const previous = national(world).regime;
  if (previous === 'crisis' && world.history.slice(-3).length === 3 && world.history.slice(-3).every(({ regime }) => regime === 'crisis')) return 'recovery';
  let roll = random.integer(1, 100);
  for (const [regime, weight] of transitions[previous]) {
    roll -= weight;
    if (roll <= 0) return regime;
  }
  return previous;
}

export function advanceWorld(world: WorldState, year: number): WorldState {
  const before = national(world);
  if (before.year === year) return world;
  if (year !== before.year + 1) throw new Error('World data must advance by exactly one year.');
  const random = seededRandom(world.random);
  const regime = nextRegime(world, random);
  const target = targets[regime];
  const change: NationalSnapshot = { ...before, year, regime,
    growth: bounded(move(before.growth, target.growth, .74) + random.integer(-95, 95), worldBounds.growth),
    inflation: bounded(move(before.inflation, target.inflation, .53) + random.integer(-95, 100), worldBounds.inflation),
    unemployment: bounded(move(before.unemployment, target.unemployment, .54) + random.integer(-90, 95), worldBounds.unemployment),
    labor: score(move(before.labor, target.labor, .62) + random.integer(-7, 7)),
    interest: before.interest,
    stability: score(move(before.stability, regime === 'crisis' ? 50 : regime === 'recession' ? 62 : 74, .3) + random.integer(-3, 3)),
  };
  const headline = regime !== before.regime && (regime === 'recession' || regime === 'crisis' || regime === 'recovery') ? regime : undefined;
  const eligible = Object.entries(worldEvents).filter(([id, event]) => event.chance &&
    !world.news.slice(-12).some((item) => item.id === id && year - item.endYear <= 4) &&
    event.eligible({ national: change, industries: world.industries, cities: world.cities }));
  const offset = eligible.length ? random.integer(0, eligible.length - 1) : 0;
  const ordered = eligible.slice(offset).concat(eligible.slice(0, offset));
  const eventId = ordered.find(([, event]) => random.next() < event.chance)?.[0];
  const reports: WorldNews[] = [headline, eventId].flatMap((id) => id ? [{ id, year, endYear: year + worldEvents[id]!.duration - 1 }] : []);
  const effects = [...world.news.slice(-8), ...reports].filter((item) => item.endYear >= year).map(({ id }) => worldEvents[id]!);
  const sum = (key: keyof NonNullable<typeof worldEvents[string]['effects']>) => effects.reduce((total, event) => total + (event.effects?.[key] ?? 0), 0);
  change.growth = bounded(change.growth + sum('growth'), regime === 'recession' || regime === 'crisis' ? [-900, -10] :
    regime === 'recovery' ? [50, 850] : worldBounds.growth);
  change.inflation = bounded(change.inflation + sum('inflation'), worldBounds.inflation);
  change.labor = score(change.labor + sum('labor'));
  change.education = score(move(before.education, 75, .09) + sum('education') + random.integer(-1, 1));
  change.healthcare = score(move(before.healthcare, 76, .09) + sum('healthcare') + random.integer(-1, 1));
  change.interest = bounded(move(before.interest, 215 + change.inflation * .75 - (change.unemployment - 550) * .12, .44) + random.integer(-28, 28), worldBounds.interest);
  change.qualityOfLife = score(move(before.qualityOfLife, 73 + (change.education - 74) * .2 + (change.healthcare - 74) * .2 + (550 - change.unemployment) / 105, .35));
  change.priceIndex = bounded(before.priceIndex * (1 + change.inflation / indexBase), worldBounds.priceIndex);
  change.output = bounded(before.output * (1 + change.growth / indexBase), worldBounds.output);

  const sectors = Object.fromEntries(industries.map((industry): [Industry, IndustryEconomy] => {
    const { cycle, trend, baseDemand } = sectorTraits[industry];
    const old = world.industries[industry];
    const impulse = effects.filter((item) => item.industry === industry).reduce((total, event) => total + (event.effects?.sector ?? 0), 0);
    const growth = bounded(move(old.growth, change.growth * cycle + trend + impulse * 9, .63) + random.integer(-135, 135), worldBounds.growth);
    const demand = score(move(old.demand, baseDemand + (change.labor - 55) * cycle * .63 + growth / 48 + impulse, .63) + random.integer(-6, 6));
    return [industry, { growth, demand, employment: score(move(old.employment, demand, .52)),
      wages: bounded(move(old.wages, indexBase + (demand - 55) * 28 + trend, .48), [8500, 11700]),
      confidence: score(move(old.confidence, demand + growth / 65, .64)) }];
  })) as WorldState['industries'];

  const local = Object.fromEntries(cities.map((city): [typeof city, CityEconomy] => {
    const old = world.cities[city];
    const base = cityEconomies[city];
    const demand = base.specializations.reduce((total, industry) => total + sectors[industry].demand, 0) / base.specializations.length;
    const localEffects = effects.filter((event) => event.city === city);
    const jobs = score(move(old.jobs, base.jobs + (demand - 55) * .52 + (change.labor - 55) * .25, .62) +
      localEffects.reduce((total, event) => total + (event.effects?.localJobs ?? 0), 0) + random.integer(-5, 5));
    const housing = bounded(move(old.housing, base.housing + (jobs - base.jobs) * 42, .35) +
      localEffects.reduce((total, event) => total + (event.effects?.housing ?? 0), 0) + random.integer(-130, 130), worldBounds.localIndex);
    return [city, { jobs, housing, population: bounded(old.population * (1 + (.18 + (jobs - 50) / 125 + random.integer(-13, 13) / 100) / 100), worldBounds.population),
      cost: bounded(move(old.cost, base.cost + (housing - base.housing) * .27, .42) + random.integer(-70, 70), worldBounds.localIndex),
      education: score(base.education + (change.education - 74) * .62), healthcare: score(base.healthcare + (change.healthcare - 73) * .62),
      qualityOfLife: score(base.qualityOfLife + (change.qualityOfLife - 74) + (jobs - base.jobs) * .16),
    }];
  })) as WorldState['cities'];
  change.population = Object.values(local).reduce((sum, city) => sum + city.population, 0);
  const markets = { industries: sectors, cities: local };
  const employerState = companyMarkets(markets, world, random);
  return { country: world.country, random: random.state, history: [...world.history, change], ...markets, employers: employerState, news: [...world.news, ...reports] };
}
