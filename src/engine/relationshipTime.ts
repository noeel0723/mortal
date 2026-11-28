import { recordNotice } from './eventNotices.ts';
import { contactIssue } from './interactions.ts';
import { friendshipExperience } from './friendships.ts';
import { clamp, record } from './journal.ts';
import { isFamily, remember } from './npcs.ts';
import { relationshipGroups } from './relationshipDirectory.ts';
import { timeTogetherStory } from './relationshipStories.ts';
import { inPersonIssue, meaningfulTime, takingSpace } from './relationships.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import type { Life } from './types.ts';

function availableContacts(life: Life) {
  const people = Object.values(relationshipGroups(life)).flat();
  return [...new Map(people.map((person) => [person.id, person])).values()]
    .filter((person) => !contactIssue(life, person) && !takingSpace(life, person.id));
}

export function spendTimeAllIssue(life: Life) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  if (life.character.age < 3) return 'Available from age 3.';
  if (life.usedActions.includes('spend-time-all')) return 'Available again next year.';
  if (!availableContacts(life).length) return 'Nobody is available to spend time with.';
  return null;
}

export function spendTimeWithAll(life: Life) {
  const issue = spendTimeAllIssue(life);
  if (issue) return issue;
  const contacts = availableContacts(life);
  const stories = new Set<string>();
  life.usedActions.push('spend-time-all');
  let enjoyed = 0;
  for (const person of contacts) {
    const story = timeTogetherStory(life, person, !!inPersonIssue(life, person), stories);
    const occasion = { key: 'spend-time-all', location: 'remote' } as const;
    const unavailable = availability(life, person, occasion);
    const outcome = contextualOutcome(life, person, occasion);
    const reception = unavailable ? 0 : outcome.weight;
    person.bond.affection = clamp(person.bond.affection + Math.round(4 * reception));
    person.bond.familiarity = clamp(person.bond.familiarity + Math.round(3 * reception));
    if (reception > 0) {
      meaningfulTime(life, person, 'time', 4);
      enjoyed++;
    }
    const entry = unavailable ? `${story} ${unavailable.reason}` : `${story} ${outcome.note}`;
    remember(life, person, entry, reception <= -.60);
    friendshipExperience(life, person, reception);
    record(life, isFamily(life, person.id) ? 'family' : 'community', entry);
  }
  recordNotice(life, 'community', 'Time With Everyone',
    `I made time for ${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} in my life.`,
    { happiness: Math.min(enjoyed, 8), stress: -Math.min(enjoyed, 5) });
  return null;
}
