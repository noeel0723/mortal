import { assetById, assetCatalog, assetKinds, starterHome } from './data/shops.ts';
import type { AssetKind } from './data/shops.ts';
import { propertyIssue, propertyQuote, rentMovingFee } from './engine/property.ts';
import type { PropertyAction } from './engine/property.ts';
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

export function ownedListings(life: Life) {
  return life.property.owned.map((item) => ({ ...item, listing: assetById.get(item.id)! }));
}

export function ownershipDetail(item: ReturnType<typeof ownedListings>[number], residence: string) {
  const origin = item.listing.kind === 'houses' ? item.city : `Acquired in ${item.city}`;
  const price = item.acquisition ? money(item.acquisition.price) : 'Price unknown';
  return `${item.source === 'gift' ? 'Gifted' : 'Purchased'} in ${item.year} · ${origin} · ${price}${residence === item.id ? ' · Current home' : ''}`;
}

export function residenceLabel(life: Life) {
  const { residence } = life.property;
  if (residence === 'family') return 'Family home';
  if (residence === 'rent') return 'Rented home';
  return assetById.get(residence)?.name ?? 'Home';
}

export function housingControls(life: Life) {
  const control = (action: PropertyAction, label: string, icon: Emoji, detail?: string) =>
    ({ action, label, icon, detail, issue: propertyIssue(life, action) });
  const homes = ownedListings(life).filter(({ listing }) => listing.kind === 'houses');
  return [
    control({ type: 'rent-home' }, 'Rent My Own Place', 'exit', `${money(rentMovingFee(life))} in moving costs. Annual rent follows.`),
    ...life.family.filter(({ alive }) => alive).map((person) => control({ type: 'ask-for-home', parent: person.id },
      `Ask ${person.name} to Buy a Home`, 'gift', `${starterHome.name} · ${money(propertyQuote(life, starterHome).price)}`)),
    ...homes.map(({ listing, city }) => control({ type: 'move-into-home', id: listing.id }, `Move Into ${listing.name}`, 'home', city)),
  ];
}
