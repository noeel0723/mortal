import { activeRomances, romanceFor } from './love.ts';
import { communicationEnded } from './relationships.ts';
import { allContacts, isFamily } from './npcs.ts';
import { friendshipLabels, friendshipStage } from './friendships.ts';
import { isCurrentClassContact, isPeer } from './school.ts';
import { isWorkAcquaintance, isWorkContact } from './workplace.ts';
import type { Contact, Life } from './types.ts';

export function friendshipLabel(life: Life, person: Contact) {
  const stage = friendshipStage(life, person);
  if (stage === 'former') return 'Former Friend';
  if (person.bond.resentment >= 55 && person.bond.trust < 35) return 'Rival';
  return friendshipLabels[stage];
}

export function relationshipGroups(life: Life) {
  const former = (person: Contact) => {
    const romance = romanceFor(life, person.id);
    const friendship = friendshipLabel(life, person);
    return communicationEnded(life, person.id) || romance?.ended != null || friendship === 'Former Friend' || friendship === 'Rival';
  };
  const matching = life.pending === 'social-dating-match' || life.pending === 'social-casual-match' || life.pending === 'social-hookup' ||
    life.social.pendingEncounter === 'social-hookup';
  const known = allContacts(life).filter(({ id }) => !matching || id !== life.social.pendingPerson);
  const partnerIds = new Set(activeRomances(life).map(({ person }) => person));
  return {
    family: known.filter(({ id }) => isFamily(life, id)),
    partners: known.filter(({ id }) => partnerIds.has(id)),
    prospects: known.filter(({ id, alive }) => alive && ['getting-to-know', 'interest'].includes(romanceFor(life, id)?.status ?? '')),
    friends: known.filter((person) => !isFamily(life, person.id) && !partnerIds.has(person.id) && 'friend' in person && person.friend && !former(person)),
    acquaintances: known.filter((person) => person.alive && !partnerIds.has(person.id) && !isFamily(life, person.id) &&
      'friend' in person && !person.friend && !former(person) && (isWorkContact(person) ? isWorkAcquaintance(person) :
      person.role === 'Acquaintance' || romanceFor(life, person.id)?.status === 'interest' ||
      ('stage' in person && isPeer(person) && isCurrentClassContact(life, person)))),
    former: known.filter((person) => !partnerIds.has(person.id) && !isFamily(life, person.id) && former(person)),
  };
}
