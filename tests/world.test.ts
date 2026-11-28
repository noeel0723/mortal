import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeLife } from '../src/database/codec.ts';
import { validWorld } from '../src/database/worldCodec.ts';
import { jobById } from '../src/data/jobs.ts';
import { eventById } from '../src/data/events.ts';
import { assetById, starterHome } from '../src/data/shops.ts';
import { worldEvents } from '../src/data/worldEvents.ts';
import { advanceCareer, vacancies } from '../src/engine/career.ts';
import { createLife } from '../src/engine/create.ts';
import { incomeTax, livingBudget } from '../src/engine/finance.ts';
import { postTransaction } from '../src/engine/journal.ts';
import { advanceNpcLives, ensureNpc, makeNpc } from '../src/engine/npcs.ts';
import { indexedCents, localExpense, salaryBand } from '../src/engine/pricing.ts';
import { propertyIssue, propertyQuote } from '../src/engine/property.ts';
import { seededRandom } from '../src/engine/random.ts';
import { relocationIssue, relocationQuote } from '../src/engine/relocation.ts';
import { findContact } from '../src/engine/school.ts';
import { advance } from '../src/engine/simulation.ts';
import type { Action, Life } from '../src/engine/types.ts';
import { advanceWorld, national, newWorld } from '../src/engine/world.ts';
import { economicRegimes, indexBase, worldBounds } from '../src/engine/worldTypes.ts';
import type { EconomicRegime } from '../src/engine/worldTypes.ts';
import { eventPopup } from '../src/eventView.ts';

function act(life: Life, action: Action) {
  const result = advance(life, action);
  assert.ok(result.life, result.error);
  return result.life;
}

function adult(age = 26) {
  const life = createLife(42);
  life.character.age = age;
  life.year += age;
  life.world = newWorld(life.seed, life.year, true);
  return life;
}

function setMarket(life: Life, regime: EconomicRegime, demand: number) {
  Object.assign(national(life.world), { regime, labor: demand, unemployment: regime === 'crisis' ? 1650 : 320 });
  for (const sector of Object.values(life.world.industries)) Object.assign(sector, { demand, wages: demand > 60 ? 11500 : 8700 });
  for (const company of Object.values(life.world.employers)) Object.assign(company, { demand, health: demand, flexibility: demand });
  for (const city of Object.values(life.world.cities)) city.jobs = demand;
  return life;
}

function legacyCashierOffer(life: Life) {
  const jobId = 'cashier';
  const employerId = 'orchard';
  const salary = jobById.get(jobId)!.salary[0];
  const id = `${life.year}-${jobId}-${employerId}`;
  life.career.applications.push({ id, jobId, employerId, salary, year: life.year, result: 'offered' });
  return { id, salary };
}

test('the world seed and starting year are deterministic and nonannual actions leave the world stream untouched', () => {
  const initial = adult();
  assert.deepEqual(newWorld(12, 2010), newWorld(12, 2010));
  assert.notDeepEqual(newWorld(12, 2010), newWorld(12, 2011));
  const walked = act(initial, { type: 'activity', activity: 'walk' });
  assert.equal(walked.world, initial.world);
  const other = { ...walked, random: 123456 };
  assert.deepEqual(act(initial, { type: 'age' }).world, act(other, { type: 'age' }).world);
  const later = act(initial, { type: 'age' });
  assert.equal(later.world.history.length, 2);
  assert.equal(advanceWorld(later.world, later.year), later.world);
  assert.throws(() => advanceWorld(later.world, later.year + 2), /exactly one year/);
  assert.deepEqual(decodeLife(JSON.stringify(later)).world, later.world);
});

test('regimes recover, sectors diverge, and history and indices stay bounded over a long life', () => {
  const observed = new Set<string>();
  const reports = new Set<string>();
  for (let seed = 1; seed <= 10; seed++) {
    let world = newWorld(seed, 1950);
    let crises = 0;
    for (let year = 1951; year <= 2065; year++) {
      const previous = national(world);
      world = advanceWorld(world, year);
      const current = national(world);
      observed.add(current.regime);
      crises = current.regime === 'crisis' ? crises + 1 : 0;
      assert.ok(crises <= 3);
      assert.equal(current.priceIndex, Math.max(worldBounds.priceIndex[0], Math.min(worldBounds.priceIndex[1],
        indexedCents(previous.priceIndex, indexBase + current.inflation))));
      assert.ok(new Set(Object.values(world.industries).map(({ demand }) => demand)).size > 1);
      for (const news of world.news.filter((item) => item.year === year)) {
        reports.add(news.id);
        assert.ok(Object.hasOwn(worldEvents, news.id));
        if (news.id === 'recession' || news.id === 'crisis') assert.ok(current.growth < 0);
        if (news.id === 'recovery') assert.ok(current.growth > 0);
      }
    }
    assert.equal(world.history.length, 116);
    assert.ok(validWorld(world, 2065, 1950));
  }
  assert.deepEqual([...observed].sort(), [...economicRegimes].sort());
  assert.ok(reports.size >= 7);
});

test('downturns cut vacancies and increase competition while entry-level options remain', () => {
  const favorable = setMarket(adult(), 'boom', 85);
  const downturn = setMarket(adult(), 'crisis', 24);
  const good = vacancies(favorable);
  const bad = vacancies(downturn);
  assert.deepEqual(good, vacancies(favorable));
  assert.ok(good.length > bad.length);
  assert.ok(bad.some(({ job }) => job.id === 'cashier'));
  const common = bad.find(({ job }) => job.id === 'cashier')!;
  const normal = good.find(({ job }) => job.id === 'cashier')!;
  assert.ok(common.competition > normal.competition);
  assert.ok(common.salary < normal.salary);
});

test('world headlines survive reload alongside an unresolved personal decision and its notices', () => {
  let life = adult(5);
  const nextYear = life.year + 1;
  const interesting = Array.from({ length: 80 }, (_, seed) => newWorld(seed, life.year, true))
    .find((world) => advanceWorld(world, nextYear).news.length > 0)!;
  assert.ok(interesting);
  life.world = interesting;
  life = act(life, { type: 'activity', activity: 'walk' });
  life = act(life, { type: 'age' });
  const restored = decodeLife(JSON.stringify(life));
  assert.equal(restored.pending, 'first-classroom');
  assert.equal(eventPopup(restored)?.key, 'decision-first-classroom');
  assert.deepEqual(restored.world.news, life.world.news);
  assert.ok(restored.world.news.some(({ year }) => year === nextYear));
  const choice = eventById.get(restored.pending)!.choices![0]!;
  const resolved = act(restored, { type: 'choose', event: restored.pending, choice: choice.id });
  assert.equal(eventPopup(resolved)?.title, 'A Walk Outside');
});

test('V8 migration starts neutral and preserves a live offer, progression, records, and owned assets', () => {
  let before = adult();
  postTransaction(before, 'Savings', 90000, 'other');
  const offer = legacyCashierOffer(before);
  before = act(before, { type: 'train-skill', skill: 'cooking', method: 'practice' });
  before = act(before, { type: 'buy-asset', id: starterHome.id });
  const snapshot = { ...before, version: 8, world: undefined, character: { ...before.character, birthCity: undefined },
    property: { ...before.property, owned: before.property.owned.map(({ id, year, source }) => ({ id, year, source })) } };
  const restored = decodeLife(JSON.stringify(snapshot));
  assert.equal(restored.version, 11);
  assert.equal(restored.world.history.length, 1);
  assert.equal(national(restored.world).priceIndex, indexBase);
  assert.equal(national(restored.world).inflation, 0);
  assert.deepEqual(restored.world.news, []);
  assert.equal(restored.property.owned[0]?.acquisition, null);
  assert.equal(restored.property.owned[0]?.city, before.character.city);
  for (const field of ['character', 'skills', 'social', 'finance', 'journal', 'transactions', 'notices', 'random'] as const) {
    assert.deepEqual(restored[field], before[field]);
  }
  assert.equal(vacancies(restored).find(({ id }) => id === offer.id)?.salary, offer.salary);
  const employed = act(restored, { type: 'accept-job', vacancy: offer.id });
  assert.equal(employed.career.current?.salary, offer.salary);
  const expired = act(restored, { type: 'age' });
  assert.equal(expired.career.applications.find(({ id }) => id === offer.id)?.result, 'expired');
});

test('market contracts validate using the original band and pay elapsed salary and expenses once', () => {
  const fixture = setMarket(adult(), 'boom', 90);
  fixture.character.attributes.smarts = 100;
  fixture.character.attributes.discipline = 100;
  fixture.character.attributes.charisma = 100;
  postTransaction(fixture, 'Savings', 100000, 'other');
  const quote = vacancies(fixture).find(({ job }) => job.id === 'cashier')!;
  const applied = act(fixture, { type: 'apply-job', vacancy: quote.id });
  assert.equal(applied.career.applications.at(-1)?.result, 'offered');
  const hired = act(applied, { type: 'accept-job', vacancy: quote.id });
  assert.equal(hired.career.current!.startingFactor, quote.factor);
  assert.deepEqual(decodeLife(JSON.stringify(hired)), hired);
  const damaged = structuredClone(hired);
  damaged.career.current!.startingFactor = 20000;
  assert.throws(() => decodeLife(JSON.stringify(damaged)), /career or finance/);
  setMarket(hired, 'crisis', 26);
  assert.equal(hired.career.current!.salary, quote.salary);
  const budget = livingBudget(hired);
  const paid = act(hired, { type: 'age' });
  assert.equal(paid.transactions.filter(({ category }) => category === 'salary').at(-1)?.amount, quote.salary);
  assert.equal(paid.transactions.find(({ category }) => category === 'tax')?.amount, -incomeTax(quote.salary));
  assert.equal(paid.transactions.find(({ category }) => category === 'food-utilities')?.amount, -budget['food-utilities']);
  assert.equal(paid.character.bank, paid.transactions.reduce((sum, entry) => sum + entry.amount, 0));
  assert.ok(quote.salary >= salaryBand(quote.job, quote.factor)[0]);
});

test('relocation moves the household and local vehicles while preserving homes and acquisition prices', () => {
  let life = adult(32);
  postTransaction(life, 'Savings', 250000, 'other');
  const origin = life.character.city;
  const destination = origin === 'Northwick' ? 'Bellmere' : 'Northwick';
  const spouse = makeNpc(life, 'npc-spouse', 32, 'Acquaintance');
  const child = makeNpc(life, 'npc-child', 6, 'Child');
  life.social.people.push(spouse, child);
  spouse.bond.trust = 20;
  ensureNpc(life, spouse);
  ensureNpc(life, child);
  life.social.romances.push({ person: spouse.id, status: 'married', started: life.year, engagement: life.year, wedding: life.year, ended: null, history: [] });
  life.social.children[child.id] = { year: life.year - 6, adopted: false, wellbeing: 80, learning: 40, confidence: 50, supportEnded: false };
  life.social.parents[child.id] = ['self', spouse.id];
  life = act(life, { type: 'buy-asset', id: starterHome.id });
  life = act(life, { type: 'move-into-home', id: starterHome.id });
  life = act(life, { type: 'buy-asset', id: 'toyota-yaris' });
  assert.ok(propertyQuote(life, assetById.get(starterHome.id)!).price > 0);
  assert.match(relocationIssue(createLife(42), destination) ?? '', /age 18/);
  assert.equal(relocationIssue(life, destination), null);
  const relocated = act(life, { type: 'relocate', city: destination });
  assert.equal(relocated.character.city, destination);
  assert.equal(relocated.character.birthCity, origin);
  assert.equal(relocated.property.residence, 'rent');
  assert.deepEqual(relocated.property.owned[0], life.property.owned[0]);
  assert.deepEqual(relocated.property.owned[1], { ...life.property.owned[1], city: destination });
  assert.equal(life.property.owned[1]?.city, origin);
  assert.equal(findContact(relocated, spouse.id)?.city, origin);
  assert.equal(relocated.social.household?.living, 'separate');
  assert.equal(findContact(relocated, child.id)?.city, destination);
  assert.equal(relocated.family[0]?.city, origin);
  assert.equal(relocated.character.bank, life.character.bank - relocationQuote(life, destination));
  assert.match(propertyIssue(relocated, { type: 'move-into-home', id: starterHome.id }) ?? '', /Relocate/);
  assert.match(relocationIssue(relocated, origin) ?? '', /already relocated/);
  assert.deepEqual(decodeLife(JSON.stringify(relocated)), relocated);
});

test('poor employer conditions can cause redundancy and NPC bills use elapsed local prices', () => {
  const life = adult();
  const offer = legacyCashierOffer(life);
  const hired = act(life, { type: 'accept-job', vacancy: offer.id });
  assert.match(relocationIssue(hired, hired.character.city === 'Bellmere' ? 'Northwick' : 'Bellmere') ?? '', /Resign/);
  const old = hired.world;
  hired.year++;
  hired.character.age++;
  hired.world = advanceWorld(old, hired.year);
  setMarket(hired, 'crisis', 0);
  hired.seed = Array.from({ length: 100 }, (_, candidate) => candidate).find((candidate) =>
    seededRandom(candidate ^ hired.world.random ^ Math.imul(hired.year, 0x82f27c03)).next() < .36)!;
  advanceCareer(hired, seededRandom(17));
  assert.equal(hired.career.history.at(-1)?.reason, 'redundant');
  assert.equal(hired.notices.at(-1)?.title, 'Role Made Redundant');
  assert.equal(hired.career.seeking, true);
  const parent = hired.family[0]!;
  const profile = ensureNpc(hired, parent);
  profile.savings = 300000;
  const expected = profile.savings + profile.income - localExpense(old, parent.city, 36000) - profile.commitments;
  advanceNpcLives(hired, old);
  assert.equal(profile.savings, expected);
});
