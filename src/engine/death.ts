import { recordNotice } from './eventNotices.ts';
import { record } from './journal.ts';
import { relationshipSatisfaction, relationshipState, stateFor } from './relationships.ts';
import { ensureNpc, isFamily, npcProfile } from './npcs.ts';
import { familyRole } from './kinship.ts';
import { seededRandom } from './random.ts';
import { findContact } from './school.ts';
import type { Category, Contact, DeathResponse, Effect, Life } from './types.ts';

function roleAtDeath(life: Life, person: Contact) {
  const status = life.social.romances.find((entry) => entry.person === person.id)?.status;
  if (status === 'married') return { woman: 'Wife', man: 'Husband', nonbinary: 'Spouse' }[person.gender];
  if (status === 'engaged') return 'Fiancé(e)';
  if (status === 'dating' || status === 'committed') return 'Partner';
  if (status === 'broken-up') return 'Former Partner';
  if (status === 'divorced') return 'Former Spouse';
  return familyRole(life, person) ?? ('friend' in person && person.friend ? 'Friend' : person.role);
}

export function recordContactDeath(life: Life, person: Contact, cause: string, category: Category, effects?: Effect) {
  if (!person.alive) return;
  const role = roleAtDeath(life, person);
  const state = relationshipState(life, person.id);
  const memories = npcProfile(life, person).memories.length;
  const attachment = state?.perspective?.player ?? (isFamily(life, person.id) ? 65 : person.bond.affection * .6);
  const loss = Math.min(95, Math.round(relationshipSatisfaction(life, person) * .34 + attachment * .48 + Math.min(12, memories * 2) +
    (/accident|sudden/i.test(cause) ? 10 : 0)));
  person.alive = false;
  delete ensureNpc(life, person).familyStudies;
  const text = `${person.name} died at age ${person.age}. The cause of death was ${cause.toLowerCase()}.`;
  if (loss >= 26) stateFor(life, person.id).grief = { since: life.year, intensity: loss };
  const notice = recordNotice(life, category, 'Death', text, loss >= 26 && !life.character.causeOfDeath ?
    { ...effects, happiness: Math.min(effects?.happiness ?? 0, -Math.round(loss * .12)), stress: Math.max(effects?.stress ?? 0, Math.round(loss * .09)) } : effects);
  notice.details = { kind: 'death', person: person.id, age: person.age, role, cause };
}

export function recordPlayerDeath(life: Life, cause: string) {
  const { age } = life.character;
  const notice = recordNotice(life, 'life', 'End of Life', `My life ended at age ${age}. The cause was ${cause.toLowerCase()}.`);
  notice.details = { kind: 'death', person: 'self', age, role: 'Your Character', cause };
}

export function respondToDeath(life: Life, entry: number, response: DeathResponse) {
  const notice = life.notices[0];
  if (life.pending || life.character.causeOfDeath || !notice || notice.entry !== entry || notice.details?.kind !== 'death' ||
    (response !== 'honor' && response !== 'skip' && response !== 'surprise')) return 'This choice is no longer available.';
  const person = findContact(life, notice.details.person);
  if (!person || person.alive) return 'This choice is no longer available.';
  const honor = response === 'honor' || (response === 'surprise' &&
    seededRandom(life.seed ^ Math.imul(entry + 1, 0x9e3779b9)).next() < .5);
  life.notices = life.notices.slice(1);
  const state = relationshipState(life, person.id);
  if (honor && state?.grief) state.grief = { ...state.grief, intensity: Math.max(0, state.grief.intensity - 8), lastMemorial: life.year };
  const text = !honor ? `I chose to remember ${person.name} in my own way and didn’t go to the funeral.` :
    person.city === life.character.city ? `I attended ${person.name}’s funeral and shared a memory with the people there.` :
      `I sent condolences to ${person.name}’s loved ones and shared a memory from afar.`;
  record(life, 'decision', text, honor ? { stress: -2 } : undefined);
  return null;
}
