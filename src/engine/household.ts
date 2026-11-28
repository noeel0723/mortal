import { assetById } from '../data/shops.ts';
import { recordNotice } from './eventNotices.ts';
import { contributions, custodyArrangements } from './householdTypes.ts';
import type { Household, HouseholdAction } from './householdTypes.ts';
import { postTransaction, record } from './journal.ts';
import { ensureNpc, npcProfile, npcRandom, remember } from './npcs.ts';
import { assetSaleQuote, ownedAssets } from './property.ts';
import { communicationEnded, meaningfulTime, openConcern, relationshipSatisfaction, takingSpace } from './relationships.ts';
import { findContact } from './school.ts';
import type { City, Contact, Life } from './types.ts';

export function dependentChildren(life: Life) {
  return life.social.people.filter((person) => person.alive && person.age < 18 && Object.hasOwn(life.social.children, person.id));
}

export function householdMembers(life: Life): { person: Contact; role: 'Spouse' | 'Child' }[] {
  const members = life.social.people.filter((person) => {
    const child = life.social.children[person.id];
    return person.alive && person.city === life.character.city && !!child &&
      (person.age < 18 ? life.social.custody?.[person.id]?.residence !== 'other' : child.atHome === true);
  })
    .map((person) => ({ person, role: 'Child' as const }));
  const spouses = life.social.romances.filter(({ status }) => status === 'married')
    .map(({ person }) => findContact(life, person)).filter((person) => person?.alive && person.city === life.character.city &&
      life.social.household?.living !== 'separate');
  return [...spouses.map((person) => ({ person: person!, role: 'Spouse' as const })), ...members];
}

export function moveHousehold(life: Life, city: City) {
  const members = householdMembers(life);
  let moved = false;
  for (const { person } of members) {
    if (person.city === city) continue;
    if (person.city !== life.character.city) continue;
    const adult = life.social.children[person.id];
    if (adult && person.age >= 18) {
      adult.atHome = false;
      continue;
    }
    if (life.social.custody?.[person.id]?.residence === 'shared') {
      const custody = life.social.custody[person.id]!;
      if (findContact(life, custody.other)?.alive) continue;
    }
    if (life.social.romances.some(({ person: id, status }) => id === person.id && status === 'married')) {
      const state = life.social.relationships[person.id];
      const moves = state?.move?.year === life.year && !takingSpace(life, person.id);
      if (!moves) {
        householdFor(life, person).living = 'separate';
        continue;
      }
    }
    ensureNpc(life, person).movedFrom = person.city;
    person.city = city;
    moved = true;
    const relationship = life.social.relationships[person.id];
    if (relationship) delete relationship.move;
  }
  return moved;
}

export function householdFor(life: Life, spouse: Contact): Household {
  return life.social.household ??= { spouse: spouse.id, living: spouse.city === life.character.city ? 'together' : 'separate',
    contribution: 'independent', savings: { player: 0, partner: 0 } };
}

export const playerJointSavings = (life: Life) => life.social?.household?.savings.player ?? 0;
export const jointTitle = (life: Life, asset: string) => life.social?.jointTitles?.find((item) => item.asset === asset);
export const partnerAssetShare = (life: Life, asset: string, money: number) => {
  const title = jointTitle(life, asset);
  return title ? Math.round(money * title.contribution / title.basis) : 0;
};

export function settleJointAsset(life: Life, asset: string, proceeds: number) {
  const title = jointTitle(life, asset);
  if (!title) return 0;
  const amount = partnerAssetShare(life, asset, proceeds);
  const person = findContact(life, title.partner);
  if (person) ensureNpc(life, person).savings += amount;
  life.social.jointTitles = life.social.jointTitles!.filter((item) => item.asset !== asset);
  return person ? amount : 0;
}

export function settleHousehold(life: Life, spouse: Contact, death = false) {
  const household = life.social.household;
  if (household?.spouse === spouse.id) {
    postTransaction(life, 'Return of my contributions to joint savings', household.savings.player, 'relationships');
    ensureNpc(life, spouse).savings += household.savings.partner;
    delete life.social.household;
  }
  for (const child of dependentChildren(life)) {
    if (!life.social.parents[child.id]?.includes(spouse.id)) continue;
    const custody = life.social.custody ??= {};
    custody[child.id] = { other: spouse.id, residence: 'player', since: life.year };
    child.city = life.character.city;
  }
  if (!death) {
    const sharedChildren = dependentChildren(life).some(({ id }) => life.social.parents[id]?.includes(spouse.id));
    record(life, 'family', `We returned each person’s joint savings contributions and kept separate assets and debts. Joint titles will be split when sold.${
      sharedChildren ? ' Our dependent children stay with me until we agree otherwise.' : ''}`);
  }
}

export function hasSharedEssentials(life: Life, id: string) {
  const agreement = life.social.household;
  const spouse = findContact(life, id);
  return !!agreement && agreement.spouse === id && agreement.living === 'together' && agreement.contribution !== 'independent' &&
    !!spouse?.alive && spouse.city === life.character.city;
}

export function householdCosts(life: Life, housing: number, food: number, childcare: number) {
  const shared = life.social.household;
  if (!shared || !hasSharedEssentials(life, shared.spouse)) return 0;
  const spouse = findContact(life, shared.spouse)!;
  const profile = ensureNpc(life, spouse);
  const income = life.career.current?.salary ?? life.wealth.pension.lastBenefit;
  const fraction = shared.contribution === 'proportional' ? profile.income / Math.max(1, profile.income + income) :
    shared.contribution === 'primary' ? (profile.income > income ? .8 : .2) : .5;
  const total = housing + food + (shared.contribution === 'essentials' ? 0 : childcare);
  const paid = postTransaction(life, `${spouse.name} contributed to shared household bills`, Math.min(profile.savings, Math.round(total * fraction)), 'relationships');
  profile.savings -= paid;
  return paid;
}

export const childStaysWithPlayer = (life: Life, id: string) => life.social.custody?.[id]?.residence !== 'other';

export function coveredChildCommitments(life: Life, id: string) {
  const shared = hasSharedEssentials(life, id) && life.social.household?.contribution !== 'essentials';
  return dependentChildren(life).filter((person) => life.social.parents[person.id]?.includes(id) &&
    (shared || life.social.custody?.[person.id]?.other === id)).length * 2000;
}

export function settleChildSupport(life: Life) {
  for (const child of dependentChildren(life)) {
    const custody = life.social.custody?.[child.id];
    const other = findContact(life, custody?.other);
    if (!custody || !other?.alive) continue;
    const profile = ensureNpc(life, other);
    const factor = custody.residence === 'shared' ? .045 : .09;
    if (custody.residence === 'other') {
      const due = Math.min(3600, Math.round((life.career.current?.salary ?? 0) * factor));
      profile.savings += -postTransaction(life, `Child support for ${child.name}`, -due, 'relationships');
    } else {
      const support = Math.min(profile.savings, 3600, Math.round(profile.income * factor));
      profile.savings -= postTransaction(life, `Child support for ${child.name} from ${other.name}`, support, 'relationships');
    }
  }
}

export function familyPlanningWillingness(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  const dependents = dependentChildren(life).length;
  return relationshipSatisfaction(life, person) * .49 + profile.traits.empathy * .15 + Math.min(15, profile.savings / 1700) +
    Math.min(10, life.character.bank / 2500) + (profile.datingGoal === 'marriage' ? 8 : profile.datingGoal === 'casual' ? -10 : 0) -
    dependents * 7 - Math.max(0, profile.traits.ambition - 60) * .18 - (person.city !== life.character.city ? 18 : 0) -
    (life.social.household?.living === 'separate' ? 14 : 0) - (Math.min(person.health, life.character.attributes.health) < 55 ? 20 : 0);
}

export function householdIssue(life: Life, person: Contact, action: HouseholdAction) {
  if (life.pending || life.character.causeOfDeath || !person.alive) return 'This household decision is unavailable.';
  if (life.character.age < 18 || person.age < 18) return 'Available to adults.';
  if (communicationEnded(life, person.id)) return 'Respect their request for no contact.';
  if (takingSpace(life, person.id)) return 'They’ve asked for time apart.';
  if (action.action === 'custody') {
    const child = findContact(life, action.child);
    return custodyArrangements.includes(action.residence) && child?.alive && child.age < 18 && life.social.custody?.[child.id]?.other === person.id ?
      null : 'Choose a valid co-parenting arrangement.';
  }
  if (!life.social.romances.some(({ status, person: id }) => status === 'married' && id === person.id)) return 'Available with your spouse.';
  const household = life.social.household;
  if (action.action === 'together' && life.character.city !== person.city) return 'Discuss relocation before sharing a home in another city.';
  if (action.action === 'contributions' && !contributions.includes(action.arrangement)) return 'Choose a contribution arrangement.';
  if (action.action === 'deposit' || action.action === 'withdraw') {
    if (!Number.isSafeInteger(action.amount) || action.amount < 100) return 'Choose a valid amount.';
    if (action.action === 'deposit' && life.character.bank < action.amount) return 'Your balance does not cover this deposit.';
    if (action.action === 'withdraw' && playerJointSavings(life) < action.amount) return 'This exceeds your contributions to joint savings.';
  }
  if (action.action === 'vacation' && (life.character.bank < 2400 || Math.min(life.character.attributes.health, person.health) < 40)) {
    return 'A vacation requires $24 and enough health to travel.';
  }
  if (action.action === 'share-asset') {
    const asset = ownedAssets(life).find(({ ownershipId }) => ownershipId === action.asset);
    if (!asset || jointTitle(life, action.asset) || asset.rental?.offered) return 'Choose an individually owned asset that isn’t rented out.';
    if ((life.social.jointTitles?.length ?? 0) >= 12) return 'There are too many joint titles.';
    const price = Math.ceil(assetSaleQuote(life, asset).proceeds / 2);
    if (!price || npcProfile(life, person).savings < price) return 'Your spouse cannot cover their share of this asset.';
  }
  if (action.action === 'planning' && household?.familyPlan?.year === life.year) return 'You already discussed your plans this year.';
  return null;
}

export function applyHousehold(life: Life, action: HouseholdAction) {
  const person = findContact(life, action.person);
  if (!person) return 'This person is unavailable.';
  const issue = householdIssue(life, person, action);
  if (issue) return issue;
  const profile = ensureNpc(life, person);
  const random = npcRandom(life, `household:${person.id}:${action.action}`, life.year);
  const agreement = relationshipSatisfaction(life, person) * .69 + profile.traits.empathy * .25 + (profile.traits.loyalty - 50) * .1;
  const accepted = action.action === 'separate' || action.action === 'withdraw' || action.action === 'planning' || random.next() * 100 < agreement;
  if (!accepted) {
    recordNotice(life, 'family', 'Different Priorities', `${person.name} heard me out and wanted more time before changing our plans.`);
    return null;
  }
  if (action.action === 'custody') {
    const child = findContact(life, action.child)!;
    life.social.custody![child.id] = { other: person.id, residence: action.residence, since: life.year };
    child.city = action.residence === 'other' ? person.city : life.character.city;
    recordNotice(life, 'family', 'Co-parenting Agreement', `${person.name} and I agreed that ${child.name} would ${action.residence === 'shared' ? 'share time between our homes' : action.residence === 'player' ? 'live primarily with me' : 'live primarily with them'}.`);
    return null;
  }
  const household = householdFor(life, person);
  let story: string;
  if (action.action === 'contributions') {
    household.contribution = action.arrangement;
    story = `I agreed with ${person.name} to use the ${action.arrangement} household contribution arrangement.`;
  } else if (action.action === 'together' || action.action === 'separate') {
    household.living = action.action;
    story = `${person.name} and I would ${action.action === 'together' ? 'share a home' : 'keep separate homes'} for now.`;
  } else if (action.action === 'deposit') {
    const partner = Math.min(profile.savings, action.amount);
    household.savings.player += -postTransaction(life, 'My contribution to joint savings', -action.amount, 'relationships');
    household.savings.partner += partner;
    profile.savings -= partner;
    story = `${person.name} and I deposited what we could and recorded our separate contributions.`;
  } else if (action.action === 'withdraw') {
    household.savings.player -= postTransaction(life, 'Withdrawal of my joint savings contributions', action.amount, 'relationships');
    story = `I withdrew part of my contributions to joint savings and told ${person.name}.`;
  } else if (action.action === 'share-asset') {
    const asset = ownedAssets(life).find(({ ownershipId }) => ownershipId === action.asset)!;
    const basis = assetSaleQuote(life, asset).proceeds;
    const contribution = postTransaction(life, `${person.name} purchased a share of ${assetById.get(asset.id)!.name}`, Math.ceil(basis / 2), 'relationships');
    if (!contribution) return 'The share could not be recorded.';
    profile.savings -= contribution;
    life.social.jointTitles = [...(life.social.jointTitles ?? []), { asset: asset.ownershipId, partner: person.id, basis, contribution }];
    story = `We recorded ${person.name}’s cash contribution and added them to the title.`;
  } else if (action.action === 'planning') {
    const ready = familyPlanningWillingness(life, person) >= 52;
    household.familyPlan = { year: life.year, answer: ready ? 'ready' : 'wait' };
    story = ready ? `${person.name} felt ready to plan for a child if we both wanted that.` : `${person.name} wanted to wait. We talked through health, money, and our other commitments.`;
  } else if (action.action === 'responsibilities') {
    household.duties = profile.commitments > 3000 ? 'player' : (life.career.current?.hours ?? 0) > 42 ? 'partner' : 'shared';
    story = `${person.name} and I made a plan for chores, appointments, and childcare around our schedules.`;
  } else if (action.action === 'vacation') {
    postTransaction(life, 'Family vacation', -2400, 'leisure');
    story = `I took a short family vacation with ${person.name}. We made time away from our routines.`;
  } else if (action.action === 'anniversary') story = `${person.name} and I celebrated our anniversary and remembered what had brought us together.`;
  else {
    if (profile.traits.ambition >= 72 && (life.career.current?.hours ?? 0) >= 45) openConcern(life, person.id, 'workload', 32);
    story = `${person.name} told me what they want from their career and how we could make room for both of our plans.`;
  }
  meaningfulTime(life, person, 'support', 4);
  remember(life, person, story);
  recordNotice(life, 'family', 'Household Plans', story);
  return null;
}
