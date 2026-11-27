import { assetById, starterHome } from '../data/shops.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { seededRandom } from './random.ts';
import { ensureNpc, isParent, npcProfile } from './npcs.ts';
import type { Life } from './types.ts';

export type OwnedAsset = { id: string; year: number; source: 'purchase' | 'gift' };
export type PropertyState = { residence: string; owned: OwnedAsset[] };
export type PropertyAction = { type: 'buy-asset'; id: string } | { type: 'rent-home' } |
  { type: 'ask-for-home'; parent: string } | { type: 'move-into-home'; id: string };

export const movingAge = 18;
export const movingFee = 3500;
export const initialProperty = (): PropertyState => ({ residence: 'family', owned: [] });

export function propertyIssue(life: Life, action: PropertyAction) {
  if (life.character.causeOfDeath) return 'This life has already ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  if (life.character.age < movingAge) return `Available from age ${movingAge}.`;
  switch (action.type) {
    case 'buy-asset': {
      const listing = assetById.get(action.id);
      if (!listing) return 'This listing is unavailable.';
      if (life.property.owned.some(({ id }) => id === listing.id)) return 'You already own this item.';
      return life.character.bank < listing.price ? 'Your balance does not cover this purchase.' : null;
    }
    case 'rent-home':
      if (life.property.residence === 'rent') return 'You are already renting.';
      return life.character.bank < movingFee ? 'Your balance does not cover moving costs.' : null;
    case 'move-into-home':
      if (assetById.get(action.id)?.kind !== 'houses' || !life.property.owned.some(({ id }) => id === action.id)) return 'You do not own this house.';
      return life.property.residence === action.id ? 'You already live here.' : null;
    case 'ask-for-home': {
      const parent = life.family.find(({ id, alive }) => id === action.parent && alive);
      if (!parent || !isParent(life, parent.id)) return 'This parent is unavailable.';
      if (life.property.owned.some(({ id }) => assetById.get(id)?.kind === 'houses')) return 'You already own a home.';
      if (npcProfile(life, parent).savings < starterHome.price) return 'They cannot afford to buy a home right now.';
      return life.usedActions.includes('ask-for-home') ? 'You already asked your family this year.' : null;
    }
  }
}

export function applyPropertyAction(life: Life, action: PropertyAction) {
  const issue = propertyIssue(life, action);
  if (issue) return issue;
  switch (action.type) {
    case 'buy-asset': {
      const listing = assetById.get(action.id)!;
      life.property.owned.push({ id: listing.id, year: life.year, source: 'purchase' });
      recordNotice(life, 'finance', 'Purchase Complete', `I bought ${listing.name}.`, { bank: -listing.price }, 'shopping');
      break;
    }
    case 'rent-home':
      life.property.residence = 'rent';
      recordNotice(life, 'life', 'A Place of My Own', 'I moved into a rented place.', { bank: -movingFee, happiness: 3 }, 'housing');
      break;
    case 'move-into-home':
      life.property.residence = action.id;
      recordNotice(life, 'life', 'New Home', `I moved into ${assetById.get(action.id)!.name}.`, { happiness: 3 });
      break;
    case 'ask-for-home': {
      const parent = life.family.find(({ id }) => id === action.parent)!;
      const { affection, trust, resentment } = parent.bond;
      const random = seededRandom(life.random);
      const approved = random.next() * 100 < clamp(affection * .4 + trust * .55 - resentment * .7 - 8);
      life.random = random.state;
      life.usedActions.push('ask-for-home');
      if (approved) {
        ensureNpc(life, parent).savings -= starterHome.price;
        life.property.owned.push({ id: starterHome.id, year: life.year, source: 'gift' });
        life.property.residence = starterHome.id;
      }
      recordNotice(life, 'family', approved ? 'A Home from Family' : 'Housing Request Declined', approved ?
        `${parent.name} agreed to buy me ${starterHome.name}, and I moved in.` : `${parent.name} was able to afford a home but decided against buying me one.`,
      { happiness: approved ? 6 : -2 });
      break;
    }
  }
  return null;
}
