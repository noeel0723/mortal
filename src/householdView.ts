import { assetById } from './data/shops.ts';
import { dependentChildren, householdIssue, jointTitle } from './engine/household.ts';
import type { HouseholdAction } from './engine/householdTypes.ts';
import { contributions, custodyArrangements } from './engine/householdTypes.ts';
import { assetSaleQuote, ownedAssets } from './engine/property.ts';
import type { Contact, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

const agreementLabels = { independent: 'Independent finances', equal: 'Equal contributions', proportional: 'Proportional contributions',
  primary: 'One primary provider', essentials: 'Share essentials only' } as const;
const residenceLabels = { player: 'Lives with you', other: 'Lives with the other parent', shared: 'Shared care' } as const;
type Control = { action: HouseholdAction; label: string; icon: Emoji; detail?: string; issue: string | null };

export function householdGroups(life: Life, person: Contact) {
  if (!person.alive || life.character.causeOfDeath) return [];
  const groups: { title: string; summary?: string; controls: Control[] }[] = [];
  const control = (action: HouseholdAction, label: string, icon: Emoji, detail?: string): Control =>
    ({ action, label, icon, detail, issue: householdIssue(life, person, action) });
  const target = { type: 'household', person: person.id } as const;
  if (life.social.romances.some(({ person: id, status }) => id === person.id && status === 'married')) {
    const household = life.social.household;
    const together = person.city === life.character.city && household?.living !== 'separate';
    const primary = together ? 'separate' : 'together';
    groups.push({ title: 'Household', summary: together ? 'Living together' : 'Living separately', controls: [
      control({ ...target, action: primary }, together ? 'Discuss Living Separately' : 'Discuss Living Together', 'home'),
      control({ ...target, action: 'responsibilities' }, 'Discuss Responsibilities', 'work', household?.duties === 'shared' ? 'Shared duties' :
        household?.duties === 'player' ? 'You handle most duties' : household?.duties === 'partner' ? 'Your spouse handles most duties' : undefined),
      control({ ...target, action: 'career' }, 'Discuss Career Plans', 'career'),
      control({ ...target, action: 'vacation' }, 'Plan a Family Vacation', 'train', money(2400)),
      control({ ...target, action: 'anniversary' }, 'Celebrate an Anniversary', 'calendar'),
      control({ ...target, action: 'planning' }, 'Discuss Family Planning', 'family', household?.familyPlan ?
        (household.familyPlan.answer === 'ready' ? 'Ready to keep planning' : 'Prefers to wait') : undefined),
    ] });
    const savings = household?.savings ?? { player: 0, partner: 0 };
    groups.push({ title: 'Household Finances', summary: `${agreementLabels[household?.contribution ?? 'independent']} · Joint savings ${money(savings.player + savings.partner)}`, controls: [
      ...contributions.filter((arrangement) => arrangement !== (household?.contribution ?? 'independent')).map((arrangement) =>
        control({ ...target, action: 'contributions', arrangement }, agreementLabels[arrangement], 'calculator')),
      ...[2000, 10000].map((amount) => control({ ...target, action: 'deposit', amount }, `Contribute ${money(amount)}`, 'savings')),
      ...(savings.player ? [control({ ...target, action: 'withdraw', amount: savings.player }, 'Withdraw My Contributions', 'bank', money(savings.player))] : []),
      ...ownedAssets(life).filter((asset) => !jointTitle(life, asset.ownershipId) && !asset.rental?.offered).map((asset) =>
        control({ ...target, action: 'share-asset', asset: asset.ownershipId }, `Share Ownership · ${assetById.get(asset.id)?.name ?? asset.id}`, 'key',
          `Spouse’s contribution ${money(Math.ceil(assetSaleQuote(life, asset).proceeds / 2))}`)),
    ] });
  }
  for (const child of dependentChildren(life)) {
    const custody = life.social.custody?.[child.id];
    if (custody?.other !== person.id) continue;
    groups.push({ title: `Co-parenting · ${child.name}`, summary: residenceLabels[custody.residence], controls: custodyArrangements
      .filter((residence) => residence !== custody.residence)
      .map((residence) => control({ ...target, action: 'custody', child: child.id, residence }, residenceLabels[residence], 'court')) });
  }
  return groups;
}
