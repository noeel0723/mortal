import { activeRomances, romanceFor } from './love.ts';
import { communicationEnded, relationshipState } from './relationships.ts';
import { familyRelation } from './kinship.ts';
import { allContacts, isFamily, npcProfile } from './npcs.ts';
import { friendshipLabels, friendshipStage } from './friendships.ts';
import { isCurrentClassContact, isPeer } from './school.ts';
import { isWorkAcquaintance, isWorkContact } from './workplace.ts';
import type { Contact, Life } from './types.ts';

export function friendshipLabel(life: Life, person: Contact) {
  const stage = friendshipStage(life, person);
  if (stage === 'former') return person.bond.resentment >= 45 ? 'Estranged Friend' : 'Former Friend';
  if (person.bond.resentment >= 55 && person.bond.trust < 35) return 'Rival';
  return friendshipLabels[stage];
}

export function relationshipGroups(life: Life) {
  const former = (person: Contact) => {
    const romance = romanceFor(life, person.id);
    const friendship = friendshipLabel(life, person);
    return communicationEnded(life, person.id) || romance?.ended != null || friendship === 'Former Friend' || friendship === 'Estranged Friend' ||
      friendship === 'Rival' || lostContact(life, person);
  };
  const matching = life.pending === 'social-dating-match' || life.pending === 'social-casual-match' || life.pending === 'social-hookup' ||
    life.social.pendingEncounter === 'social-hookup';
  const known = allContacts(life).filter(({ id }) => !matching || id !== life.social.pendingPerson);
  const romances = activeRomances(life);
  const partnerIds = new Set(romances.filter(({ status }) => status !== 'married').map(({ person }) => person));
  const spouseIds = new Set(romances.filter(({ status }) => status === 'married').map(({ person }) => person));
  const kin = new Map(known.map(({ id }) => [id, familyRelation(life, id)]));
  const shown = known.filter(({ id }) => !relationshipState(life, id)?.archived || !!kin.get(id) || partnerIds.has(id) || spouseIds.has(id));
  const side = (id: string) => kin.get(id) ?? '';
  return {
    parents: known.filter(({ id }) => ['parent', 'step-parent'].includes(side(id))),
    family: known.filter(({ id }) => spouseIds.has(id) || life.social.parents[id]?.includes('self')),
    relatives: known.filter(({ id }) => ['sibling', 'half-sibling', 'step-sibling', 'grandparent'].includes(side(id))),
    extended: known.filter(({ id }) => ['grandchild', 'aunt-uncle', 'cousin', 'niece-nephew', 'parent-in-law', 'sibling-in-law'].includes(side(id))),
    partners: known.filter(({ id }) => partnerIds.has(id)),
    prospects: known.filter(({ id, alive }) => alive && ['getting-to-know', 'interest'].includes(romanceFor(life, id)?.status ?? '')),
    friends: shown.filter((person) => !isFamily(life, person.id) && !partnerIds.has(person.id) && 'friend' in person && person.friend && !former(person)),
    acquaintances: shown.filter((person) => person.alive && !partnerIds.has(person.id) && !isFamily(life, person.id) &&
      'friend' in person && !person.friend && !former(person) && (isWorkContact(person) ? isWorkAcquaintance(person) :
      person.role === 'Acquaintance' || romanceFor(life, person.id)?.status === 'interest' ||
      ('stage' in person && isPeer(person) && isCurrentClassContact(life, person)))),
    former: shown.filter((person) => !partnerIds.has(person.id) && !isFamily(life, person.id) && former(person)),
    archived: known.filter(({ id, alive }) => alive && relationshipState(life, id)?.archived && !isFamily(life, id) && !partnerIds.has(id)),
    remembered: known.filter(({ alive }) => !alive),
  };
}

export function lostContact(life: Life, person: Contact) {
  return person.role === 'Acquaintance' && 'friend' in person && !person.friend && life.year - npcProfile(life, person).lastInteraction >= 12;
}
