import { assetById, assetCatalog, assetKinds, starterHome } from './data/shops.ts';
import type { AssetKind } from './data/shops.ts';
import { assetActionLabels, assetSaleQuote, currentAssetValue, isHouse, ownedAssets, propertyIssue, propertyQuote, rentalQuote, rentMovingFee, upkeepQuote } from './engine/property.ts';
import type { AssetOperation, OwnedAsset, PropertyAction } from './engine/property.ts';
import type { Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export const propertyCategories: Record<AssetKind, { label: string; icon: Emoji }> = {
  houses: { label: 'Houses', icon: 'home' }, cars: { label: 'Cars', icon: 'car' },
  motorcycles: { label: 'Motorcycles', icon: 'motorcycle' },
};

export function shoppingCategory(value?: string) {
  return assetKinds.find((kind) => kind === value);
}

export function listingsFor(kind: AssetKind) {
  return assetCatalog.filter((listing) => listing.kind === kind);
}

export function ownedListings(life: Life, includeSold = false) {
  return (includeSold ? life.property.owned : ownedAssets(life)).map((item) => ({ ...item, listing: assetById.get(item.id)! }));
}

export function ownershipDetail(item: ReturnType<typeof ownedListings>[number], residence: string) {
  const origin = item.listing.kind === 'houses' ? item.city : `Acquired in ${item.city}`;
  const price = item.acquisition ? money(item.acquisition.price) : 'Price unknown';
  return `${item.source === 'gift' ? 'Gifted' : 'Purchased'} in ${item.year} · ${origin} · ${price}` +
    (item.sale ? ` · Sold in ${item.sale.year}` : residence === item.ownershipId ? ' · Current home' : '');
}

export function residenceLabel(life: Life) {
  const { residence } = life.property;
  if (residence === 'family') return 'Family home';
  if (residence === 'rent') return 'Rented home';
  const asset = life.property.owned.find(({ ownershipId }) => ownershipId === residence);
  return (asset && assetById.get(asset.id)?.name) ?? 'Home';
}

export function housingControls(life: Life) {
  const control = (action: PropertyAction, label: string, icon: Emoji, detail?: string) =>
    ({ action, label, icon, detail, issue: propertyIssue(life, action) });
  const homes = ownedListings(life).filter(({ listing }) => listing.kind === 'houses');
  return [
    control({ type: 'rent-home' }, 'Rent My Own Place', 'exit', `${money(rentMovingFee(life))} in moving costs. Annual rent follows.`),
    ...life.family.filter(({ alive }) => alive).map((person) => control({ type: 'ask-for-home', parent: person.id },
      `Ask ${person.name} to Buy a Home`, 'gift', `${starterHome.name} · ${money(propertyQuote(life, starterHome).price)}`)),
    ...homes.map(({ listing, city, ownershipId }) => control({ type: 'move-into-home', id: ownershipId }, `Move Into ${listing.name}`, 'home', city)),
  ];
}

const operationIcons: Record<AssetOperation, Emoji> = { maintain: 'vocational', renovate: 'build', service: 'vocational', repair: 'repair',
  sell: 'bank', 'offer-rental': 'key', 'end-rental': 'exit' };

export function assetDetails(life: Life, asset: OwnedAsset) {
  const house = isHouse(asset);
  const rental = asset.rental;
  const ownership = life.property.residence === asset.ownershipId ? 'Current home' : asset.sale ? `Sold in ${asset.sale.year}` : 'Owned';
  const displayRows = [
    { label: 'Ownership', value: ownership }, { label: 'Location', value: asset.city }, { label: 'Acquisition year', value: asset.year },
    { label: 'Acquisition price', value: asset.acquisition ? money(asset.acquisition.price) : 'Unknown' },
    ...(asset.sale ? [{ label: 'Sale proceeds', value: money(asset.sale.proceeds) }, { label: 'Transaction fee', value: money(asset.sale.fee) }] :
      [{ label: 'Current market value', value: money(currentAssetValue(life, asset)) }]),
    { label: 'Condition', value: `${asset.condition}%` },
    ...(house ? [{ label: 'Major improvements', value: asset.improvements }] : [{ label: 'Reliability', value: `${asset.reliability}%` }]),
  ];
  const rentalRows = rental ? [
    { label: 'Rental status', value: !rental.offered ? 'Off market' : rental.occupied ? 'Tenant occupied last year' : 'Listed for rent' },
    ...(!asset.sale ? [{ label: 'Estimated annual rent', value: money(rentalQuote(life, asset).rent) },
      { label: 'Local rental demand', value: `${rentalQuote(life, asset).demand}/100` }] : []),
    { label: 'Lifetime rent received', value: money(rental.income) }, { label: 'Turnover expenses', value: money(rental.expenses) },
    { label: 'Vacant years listed', value: rental.vacancies },
  ] : [];
  const sale = assetSaleQuote(life, asset);
  const operations: AssetOperation[] = house ? ['maintain', 'renovate', rental?.offered ? 'end-rental' : 'offer-rental', 'sell'] : ['service', 'repair', 'sell'];
  const controls = asset.sale ? [] : operations.map((operation) => {
    const action = { type: 'manage-asset', id: asset.ownershipId, operation } as const;
    const label = operation === 'sell' ? house ? 'Sell Property' : 'Sell Vehicle' : assetActionLabels[operation];
    const upkeep = upkeepQuote(life, asset, operation);
    const detail = operation === 'sell' ? `${money(sale.proceeds)} proceeds · ${money(sale.fee)} fee` : upkeep ? money(upkeep) :
      operation === 'offer-rental' ? `${money(rentalQuote(life, asset).rent)}/occupied year` : undefined;
    return { action: action as PropertyAction, label, icon: operationIcons[operation], detail, issue: propertyIssue(life, action) };
  });
  if (!asset.sale && house) {
    const action = { type: 'move-into-home', id: asset.ownershipId } as const;
    controls.unshift({ action, label: 'Move Into Property', icon: 'key', detail: asset.city, issue: propertyIssue(life, action) });
  }
  const history = [...asset.history].reverse().map(({ year, action, amount, condition }, index) => ({
    key: `${year}-${action}-${index}`, label: `${year} · ${action === 'wear' ? 'Unexpected wear' : assetActionLabels[action]}`,
    value: `${amount ? `${money(amount)} · ` : ''}${condition}% condition`,
  }));
  return { displayRows, rentalRows, controls, history };
}
