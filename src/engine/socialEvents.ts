import { socialEventCatalog } from '../data/socialEvents.ts';
import { clamp, record } from './journal.ts';
import { activeRomance, changeRomance, romanceHistory } from './love.ts';
import { allContacts, ensureNpc, npcRandom, remember } from './npcs.ts';
import { findContact } from './school.ts';
import type { Life, LifeEvent } from './types.ts';

export function isSocialEvent(id: string) {
  return socialEventCatalog.some((event) => event.id === id);
}

export function socialEventText(life: Life, event: LifeEvent) {
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  return person ? `${person.name} ${event.text}` : event.text;
}

export function offerSocialEvent(life: Life) {
  if (life.pending || life.character.age < 8 || life.character.causeOfDeath) return;
  const random = npcRandom(life, 'social-event', life.year);
  if (random.next() >= .23) return;
  const possibilities: { person: string; event: string }[] = [];
  const romance = activeRomance(life);
  if (romance) {
    const partner = findContact(life, romance.person);
    if (partner?.alive) {
      const profile = ensureNpc(life, partner);
      if (romance.status === 'dating' && life.year > romance.started && partner.bond.trust >= 55 &&
        random.next() < (profile.traits.confidence + profile.traits.loyalty) / 300) {
        possibilities.push({ person: partner.id, event: 'social-proposal' });
      }
      if (life.year - profile.lastInteraction >= 2 || partner.bond.resentment >= 32) possibilities.push({ person: partner.id, event: 'social-time' });
      if (romance.status === 'married' && profile.savings < 20000) possibilities.push({ person: partner.id, event: 'social-finances' });
    }
  }
  const parent = life.family.find((person) => person.alive && ensureNpc(life, person).savings < 16000);
  if (parent && life.character.age >= 18 && life.character.bank >= 1200) possibilities.push({ person: parent.id, event: 'social-support' });
  const child = life.social.people.find((person) => person.role === 'Child' && person.alive && person.age >= 6 && person.age < 18);
  if (child) possibilities.push({ person: child.id, event: 'social-school' });
  const friend = allContacts(life).find((person) => 'friend' in person && person.friend && person.alive &&
    !ensureNpc(life, person).formerFriend && person.city === life.character.city &&
    npcRandom(life, `invite:${person.id}`, life.year).next() < ensureNpc(life, person).traits.sociability / 120);
  if (friend) possibilities.push({ person: friend.id, event: 'social-dinner' });
  const selection = possibilities[random.integer(0, Math.max(0, possibilities.length - 1))];
  if (!selection) return;
  const event = socialEventCatalog.find(({ id }) => id === selection.event)!;
  life.social.pendingPerson = selection.person;
  life.pending = event.id;
  if (!life.seen.includes(event.id)) life.seen.push(event.id);
  record(life, event.category, socialEventText(life, event));
}

export function answerSocialEvent(life: Life, id: string, choice: string) {
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  life.social.pendingPerson = null;
  if (!person?.alive) return;
  const accepted = choice === 'accept';
  const profile = ensureNpc(life, person);
  const cost = accepted && id === 'social-support' ? Math.min(life.character.bank, 1200) : 0;
  profile.savings += cost;
  if (accepted && id === 'social-finances') profile.commitments = Math.max(0, profile.commitments - 600);
  const child = life.social.children[person.id];
  if (accepted && id === 'social-school' && child) child.learning = clamp(child.learning + 4);
  person.bond.trust = clamp(person.bond.trust + (accepted ? 5 : -2));
  person.bond.affection = clamp(person.bond.affection + (accepted ? 4 : -2));
  if (accepted && id === 'social-time') person.bond.resentment = clamp(person.bond.resentment - 7);
  const stories: Record<string, string> = {
    'social-dinner': `I accepted ${person.name}’s invitation and we had dinner together.`,
    'social-time': `I set some time aside for ${person.name} and we talked about how we had been feeling.`,
    'social-proposal': `I accepted ${person.name}’s proposal. We are engaged.`,
    'social-support': `I helped ${person.name} cover part of their household expenses.`,
    'social-school': `I worked through the assignment with ${person.name}.`,
    'social-finances': `I made a household budget with ${person.name} and we reduced some commitments.`,
  };
  const text = accepted ? stories[id]! : `I told ${person.name} I would rather wait. We agreed to leave it for now.`;
  if (accepted && id === 'social-proposal') changeRomance(life, person.id, 'engaged', text);
  else romanceHistory(life, person.id, text);
  remember(life, person, text);
  record(life, 'decision', text, { bank: -cost, happiness: accepted ? 3 : 0 }, 'relationships');
}
