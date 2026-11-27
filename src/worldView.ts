import { cityEconomies } from './data/cityEconomies.ts';
import { cities, cityDescriptions } from './data/veyra.ts';
import { worldEvents } from './data/worldEvents.ts';
import { industries } from './engine/careerTypes.ts';
import { relocationIssue, relocationQuote } from './engine/relocation.ts';
import { national } from './engine/world.ts';
import { indexBase } from './engine/worldTypes.ts';
import type { EconomicRegime } from './engine/worldTypes.ts';
import type { City, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export const regimeLabels: Record<EconomicRegime, string> = {
  expansion: 'Expansion', boom: 'Boom', stagnation: 'Stagnation', recession: 'Recession', crisis: 'Crisis', recovery: 'Recovery',
};

export const ratioLabel = (points: number) => `${(points / 100).toFixed(1)}%`;
const indexLabel = (points: number) => (points / 100).toFixed(1);
const populationLabel = (people: number) => new Intl.NumberFormat('en').format(Math.round(people / 1000) * 1000);
const scoreLabel = (score: number) => `${score} / 100`;

export const worldReports: { id: 'industries' | 'cities' | 'news' | 'history'; label: string; icon: Emoji }[] = [
  { id: 'industries', label: 'Industry Report', icon: 'career' }, { id: 'cities', label: 'Compare Cities', icon: 'location' },
  { id: 'news', label: 'World News', icon: 'news' }, { id: 'history', label: 'World History', icon: 'history' },
];

export function worldOverview(life: Life) {
  const info = national(life.world);
  return {
    countryRows: [{ label: 'Simulation year', value: info.year }, { label: 'Your city', value: life.character.city },
      { label: 'Population estimate', value: populationLabel(info.population) }, { label: 'Economic regime', value: regimeLabels[info.regime] }],
    economyRows: [{ label: 'Economic output index', value: indexLabel(info.output) }, { label: 'Annual growth', value: ratioLabel(info.growth) },
      { label: 'Inflation', value: ratioLabel(info.inflation) }, { label: 'Consumer price index', value: indexLabel(info.priceIndex) },
      { label: 'Unemployment', value: ratioLabel(info.unemployment) }, { label: 'Hiring demand', value: scoreLabel(info.labor) },
      { label: 'Interest rate', value: ratioLabel(info.interest) }],
    communityRows: [{ label: 'Political stability', value: scoreLabel(info.stability) }, { label: 'Quality of life', value: scoreLabel(info.qualityOfLife) },
      { label: 'Education quality', value: scoreLabel(info.education) }, { label: 'Healthcare quality', value: scoreLabel(info.healthcare) }],
  };
}

export function industryReport(life: Life) {
  return industries.map((industry) => {
    const market = life.world.industries[industry];
    return { industry, rows: [{ label: 'Growth', value: ratioLabel(market.growth) }, { label: 'Hiring demand', value: scoreLabel(market.demand) },
      { label: 'Employment conditions', value: scoreLabel(market.employment) }, { label: 'Wage pressure index', value: indexLabel(market.wages) },
      { label: 'Business confidence', value: scoreLabel(market.confidence) }] };
  });
}

export const citySlug = (city: City) => city.toLowerCase().replaceAll(' ', '-');
export const cityFromSlug = (slug?: string) => cities.find((city) => citySlug(city) === slug);

export function compareCities(life: Life) {
  return cities.map((city) => ({ city, id: citySlug(city), detail: `${life.character.city === city ? 'Current city · ' : ''}` +
      `Jobs ${life.world.cities[city].jobs}/100 · Cost index ${indexLabel(life.world.cities[city].cost)}` }));
}

export function cityReport(life: Life, city: City) {
  const report = life.world.cities[city];
  return { description: cityDescriptions[city], rows: [{ label: 'Population estimate', value: populationLabel(report.population) },
    { label: 'Local cost index', value: indexLabel(report.cost) }, { label: 'Housing market index', value: indexLabel(report.housing) },
    { label: 'Job opportunities', value: scoreLabel(report.jobs) }, { label: 'Industry specialization', value: cityEconomies[city].specializations.join(', ') },
    { label: 'Education access', value: scoreLabel(report.education) }, { label: 'Healthcare access', value: scoreLabel(report.healthcare) },
    { label: 'Quality of life', value: scoreLabel(report.qualityOfLife) }],
  current: life.character.city === city, fee: money(relocationQuote(life, city)), issue: relocationIssue(life, city) };
}

export function currentNews(life: Life) {
  return [...life.world.news].reverse().map((item) => {
    const article = worldEvents[item.id]!;
    return { key: `${item.year}-${item.id}`, year: item.year, active: item.endYear >= life.year, title: article.title, story: article.story,
      area: article.city ?? article.industry ?? life.world.country };
  });
}

export function worldHistory(life: Life) {
  const snapshots = life.world.history;
  const recent = snapshots.slice(-12);
  const low = Math.min(indexBase, recent[0]!.priceIndex, ...recent.map(({ priceIndex }) => priceIndex));
  const high = Math.max(low + 300, ...recent.map(({ priceIndex }) => priceIndex));
  return { chart: recent.map(({ year, priceIndex }) => ({ year, value: indexLabel(priceIndex), height: 14 + Math.round(86 * (priceIndex - low) / (high - low)) })),
    rows: [...snapshots].reverse().map(({ year, regime, priceIndex, growth, unemployment }) => ({ label: `${year} · ${regimeLabels[regime]}`,
      value: `GDP ${ratioLabel(growth)} · Jobless ${ratioLabel(unemployment)} · Prices ${indexLabel(priceIndex)}` })) };
}

export const relocationDescription = 'You will rent in the destination city. Your spouse, dependent children, and local vehicles move with you. Houses stay in their original city.';
