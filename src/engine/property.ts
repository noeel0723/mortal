import { assetById, starterHome } from '../data/shops.ts';
import type { AssetListing } from '../data/shops.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp, postTransaction } from './journal.ts';
import { seededRandom } from './random.ts';
import { ensureNpc, isParent, npcProfile } from './npcs.ts';
import { indexedCents, localExpense } from './pricing.ts';
import { national } from './world.ts';
import { skillRandom } from './skills.ts';
import type { City, Life } from './types.ts';

export type OwnedAsset = { id: string; year: number; source: 'purchase' | 'gift'; city: City;
  acquisition: { price: number; priceIndex: number; marketIndex: number } | null; ownershipId: string;
  condition: number; reliability: number | null; improvements: number;
  history: { year: number; action: AssetOperation | 'wear'; amount: number; condition: number }[];
  sale: { year: number; proceeds: number; fee: number } | null;
  rental: { offered: boolean; occupied: boolean; income: number; expenses: number; vacancies: number; lastYear: number | null; lastRent: number } | null };
export type PropertyState = { residence: string; owned: OwnedAsset[] };
export const assetOperations = ['maintain', 'renovate', 'service', 'repair', 'sell', 'offer-rental', 'end-rental'] as const;
export type AssetOperation = typeof assetOperations[number];
export type PropertyAction = { type: 'buy-asset'; id: string } | { type: 'rent-home' } |
  { type: 'ask-for-home'; parent: string } | { type: 'move-into-home'; id: string } |
  { type: 'manage-asset'; id: string; operation: AssetOperation };

export const movingAge = 18;
export const movingFee = 3500;
export const initialProperty = (): PropertyState => ({ residence: 'family', owned: [] });

export const ownedAssets = (life: Life) => life.property.owned.filter((asset) => asset.sale === null);
export const isHouse = (asset: OwnedAsset) => assetById.get(asset.id)?.kind === 'houses';

export function makeOwnership(asset: Pick<OwnedAsset, 'id' | 'year' | 'source' | 'city' | 'acquisition'>, sequence: number): OwnedAsset {
  const home = assetById.get(asset.id)?.kind === 'houses';
  return { ...asset, ownershipId: `owned-${asset.year}-${sequence}-${asset.id}`, condition: 100, reliability: home ? null : 95, improvements: 0,
    history: [], sale: null, rental: home ? { offered: false, occupied: false, income: 0, expenses: 0, vacancies: 0, lastYear: null, lastRent: 0 } : null };
}

export function propertyQuote(life: Life, listing: AssetListing, city = life.character.city) {
  const market = life.world.cities[city];
  const marketIndex = listing.kind === 'houses' ? market.housing : Math.round(7000 + market.cost * .3);
  const priceIndex = national(life.world).priceIndex;
  return { price: indexedCents(listing.price, priceIndex, marketIndex), marketIndex, priceIndex };
}

export function currentAssetValue(life: Life, asset: OwnedAsset) {
  const listing = assetById.get(asset.id)!;
  const local = propertyQuote(life, listing, asset.city).price;
  if (isHouse(asset)) return indexedCents(local, 6400 + 36 * asset.condition, 10000 + 425 * asset.improvements);
  const depreciation = Math.max(.16, .89 ** Math.max(1, life.year - asset.year + 1));
  return indexedCents(local, Math.round(depreciation * 10000), 4100 + 38 * asset.condition + 21 * (asset.reliability ?? 0));
}

export function assetSaleQuote(life: Life, asset: OwnedAsset) {
  const value = currentAssetValue(life, asset);
  const fee = indexedCents(value, isHouse(asset) ? 500 : 650);
  return { value, fee, proceeds: value - fee };
}

export function rentalQuote(life: Life, asset: OwnedAsset) {
  const city = life.world.cities[asset.city];
  return { rent: indexedCents(currentAssetValue(life, asset), 1020 + (city.jobs - 50) * 7),
    demand: clamp(Math.round(53 + (city.housing - 9500) / 65 + (city.jobs - 50) * .6 + (asset.condition - 70) / 3)) };
}

export function upkeepQuote(life: Life, asset: OwnedAsset, operation: AssetOperation) {
  const price = propertyQuote(life, assetById.get(asset.id)!, asset.city).price;
  const rate = operation === 'maintain' ? 280 : operation === 'renovate' ? 1390 : operation === 'service' ? 390 : operation === 'repair' ? 820 : 0;
  return rate ? Math.max(150, indexedCents(price, rate)) : 0;
}

function activeAsset(life: Life, id: string) {
  const active = ownedAssets(life);
  return active.find((asset) => asset.ownershipId === id) ?? active.find((asset) => asset.id === id);
}

function managementIssue(life: Life, id: string, operation: AssetOperation) {
  const asset = activeAsset(life, id);
  if (!asset || !assetOperations.includes(operation)) return 'This asset or action is unavailable.';
  const home = isHouse(asset);
  if (operation === 'sell') {
    if (life.property.residence === asset.ownershipId) return 'Move into another home or rent a place before selling this residence.';
    return asset.rental?.offered ? 'End the rental listing before selling this property.' : null;
  }
  if (operation === 'offer-rental' || operation === 'end-rental') {
    if (!asset.rental) return 'Only a house can be rented out.';
    if (life.property.residence === asset.ownershipId) return 'Move out before offering this home for rent.';
    if (asset.rental.offered === (operation === 'offer-rental')) return 'The rental status is already set.';
    return asset.history.some(({ year, action }) => year === life.year && (action === 'offer-rental' || action === 'end-rental')) ?
      'The rental status can change again next year.' : null;
  }
  if (home !== (operation === 'maintain' || operation === 'renovate')) return 'This upkeep is for a different asset type.';
  if (operation === 'renovate' && asset.improvements >= 3) return 'This home already has three major improvements.';
  if (operation !== 'renovate' && asset.condition >= 100 && (asset.reliability ?? 100) >= 100) return 'This asset is already in excellent condition.';
  if (asset.history.some(({ year, action }) => action === operation && year === life.year)) return 'Already done this year.';
  return life.character.bank < upkeepQuote(life, asset, operation) ? 'Your balance does not cover this work.' : null;
}

export const assetActionLabels: Record<AssetOperation, string> = { maintain: 'Maintain Property', renovate: 'Renovate Property', service: 'Service Vehicle',
  repair: 'Repair Vehicle', sell: 'Sell Asset', 'offer-rental': 'Offer for Rent', 'end-rental': 'Stop Renting Out' };

function manageAsset(life: Life, id: string, operation: AssetOperation) {
  const original = activeAsset(life, id)!;
  const asset = { ...original, rental: original.rental ? { ...original.rental } : null, history: [...original.history] };
  const listing = assetById.get(asset.id)!;
  const detail = { kind: 'asset', ref: asset.ownershipId } as const;
  let amount = 0;
  let story: string;
  switch (operation) {
    case 'sell': {
      const { fee, proceeds } = assetSaleQuote(life, asset);
      asset.sale = { year: life.year, fee, proceeds };
      amount = proceeds;
      postTransaction(life, `Sold ${listing.name} after transaction costs`, proceeds, 'asset-sale', detail);
      story = `I sold ${listing.name} and received the proceeds after fees.`;
      break;
    }
    case 'offer-rental': case 'end-rental': {
      asset.rental!.offered = operation === 'offer-rental';
      if (!asset.rental!.offered) asset.rental!.occupied = false;
      story = asset.rental!.offered ? `I listed ${listing.name} for rent.` : `I took ${listing.name} off the rental market.`;
      break;
    }
    default: {
      amount = -upkeepQuote(life, asset, operation);
      postTransaction(life, `${assetActionLabels[operation]} · ${listing.name}`, amount, operation === 'renovate' ? 'renovation' : 'maintenance', detail);
      const conditionGain = { maintain: 15, renovate: 26, service: 14, repair: 30 }[operation];
      asset.condition = clamp(asset.condition + conditionGain);
      if (asset.reliability !== null) asset.reliability = clamp(asset.reliability + (operation === 'repair' ? 34 : 19));
      if (operation === 'renovate') asset.improvements++;
      story = `I paid for ${operation === 'renovate' ? 'renovations' : 'upkeep'} on ${listing.name}.`;
    }
  }
  asset.history = [...asset.history, { year: life.year, action: operation, amount, condition: asset.condition }].slice(-40);
  life.property.owned = life.property.owned.map((entry) => entry.ownershipId === asset.ownershipId ? asset : entry);
  recordNotice(life, 'finance', operation === 'sell' ? 'Asset Sold' : assetActionLabels[operation], story);
}

export function settleAssets(life: Life, elapsedYear: number) {
  life.property.owned = life.property.owned.map((asset) => {
    if (asset.sale) return asset;
    const home = isHouse(asset);
    const age = elapsedYear - asset.year;
    const random = skillRandom(life.seed, `asset:${asset.ownershipId}:${elapsedYear}`);
    const local = life.world.cities[asset.city];
    const accident = random.next() < (home ? .045 : .075) ? random.integer(4, 12) : 0;
    const rental = asset.rental ? { ...asset.rental } : null;
    if (rental?.offered && rental.lastYear !== elapsedYear) {
      const quote = rentalQuote(life, asset);
      rental.lastYear = elapsedYear;
      rental.occupied = random.next() * 100 < Math.max(18, Math.min(92, quote.demand + (rental.occupied ? 10 : 0)));
      rental.lastRent = rental.occupied ? quote.rent : 0;
      if (rental.occupied) {
        const cost = indexedCents(quote.rent, 1400 + (100 - asset.condition) * 13);
        const detail = { kind: 'asset', ref: asset.ownershipId } as const;
        rental.income += postTransaction(life, `Rent from ${assetById.get(asset.id)!.name}`, quote.rent, 'rental-income', detail);
        rental.expenses += -postTransaction(life, `Rental turnover at ${assetById.get(asset.id)!.name}`, -cost, 'maintenance', detail);
      } else rental.vacancies++;
    }
    const condition = clamp(asset.condition - (home ? 2 + Number(age > 18) + Number(!!rental?.occupied) : 4 + Number(age > 10)) - accident);
    const history = accident ? [...asset.history, { year: life.year, action: 'wear' as const, amount: 0, condition }].slice(-40) : asset.history;
    const reliability = asset.reliability === null ? null : clamp(asset.reliability - 3 - Number(local.cost > 11000) - Math.ceil(accident / 2));
    return { ...asset, condition, reliability, history, rental };
  });
}

export const rentMovingFee = (life: Life) => localExpense(life.world, life.character.city, movingFee, true);

export function propertyIssue(life: Life, action: PropertyAction) {
  if (life.character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (life.character.age < movingAge) return `Available from age ${movingAge}.`;
  switch (action.type) {
    case 'buy-asset': {
      const listing = assetById.get(action.id);
      if (!listing) return 'This listing is unavailable.';
      if (ownedAssets(life).some(({ id }) => id === listing.id)) return 'You already own this item.';
      return life.character.bank < propertyQuote(life, listing).price ? 'Your balance does not cover this purchase.' : null;
    }
    case 'rent-home':
      if (life.property.residence === 'rent') return 'You are already renting.';
      return life.character.bank < rentMovingFee(life) ? 'Your balance does not cover moving costs.' : null;
    case 'move-into-home': {
      const owned = activeAsset(life, action.id);
      if (!owned || !isHouse(owned)) return 'You do not own this house.';
      if (owned.city !== life.character.city) return `Relocate to ${owned.city} before moving into this house.`;
      if (owned.rental?.offered) return 'Stop renting this home out before moving in.';
      return life.property.residence === owned.ownershipId ? 'You already live here.' : null;
    }
    case 'ask-for-home': {
      const parent = life.family.find(({ id, alive }) => id === action.parent && alive);
      if (!parent || !isParent(life, parent.id)) return 'This parent is unavailable.';
      if (ownedAssets(life).some(isHouse)) return 'You already own a home.';
      if (npcProfile(life, parent).savings < propertyQuote(life, starterHome).price) return 'They cannot afford to buy a home right now.';
      return life.usedActions.includes('ask-for-home') ? 'You already asked your family this year.' : null;
    }
    case 'manage-asset': return managementIssue(life, action.id, action.operation);
  }
}

export function applyPropertyAction(life: Life, action: PropertyAction) {
  const issue = propertyIssue(life, action);
  if (issue) return issue;
  switch (action.type) {
    case 'buy-asset': {
      const listing = assetById.get(action.id)!;
      const acquisition = propertyQuote(life, listing);
      life.property.owned.push(makeOwnership({ id: listing.id, year: life.year, source: 'purchase', city: life.character.city, acquisition }, life.property.owned.length));
      recordNotice(life, 'finance', 'Purchase Complete', `I bought ${listing.name}.`, { bank: -acquisition.price }, 'shopping');
      break;
    }
    case 'rent-home':
      life.property.residence = 'rent';
      recordNotice(life, 'life', 'A Place of My Own', 'I moved into a rented place.', { bank: -rentMovingFee(life), happiness: 3 }, 'housing');
      break;
    case 'move-into-home': {
      const asset = activeAsset(life, action.id)!;
      life.property.residence = asset.ownershipId;
      recordNotice(life, 'life', 'New Home', `I moved into ${assetById.get(asset.id)!.name}.`, { happiness: 3 });
      break;
    }
    case 'ask-for-home': {
      const parent = life.family.find(({ id }) => id === action.parent)!;
      const { affection, trust, resentment } = parent.bond;
      const random = seededRandom(life.random);
      const approved = random.next() * 100 < clamp(affection * .4 + trust * .55 - resentment * .7 - 8);
      life.random = random.state;
      life.usedActions.push('ask-for-home');
      if (approved) {
        const acquisition = propertyQuote(life, starterHome);
        ensureNpc(life, parent).savings -= acquisition.price;
        const asset = makeOwnership({ id: starterHome.id, year: life.year, source: 'gift', city: life.character.city, acquisition }, life.property.owned.length);
        life.property.owned.push(asset);
        life.property.residence = asset.ownershipId;
      }
      recordNotice(life, 'family', approved ? 'A Home from Family' : 'Housing Request Declined', approved ?
        `${parent.name} agreed to buy me ${starterHome.name}, and I moved in.` : `${parent.name} was able to afford a home but decided against buying me one.`,
      { happiness: approved ? 6 : -2 });
      break;
    }
    case 'manage-asset': manageAsset(life, action.id, action.operation); break;
  }
  return null;
}
