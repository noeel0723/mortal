import { datingSources } from './socialTypes.ts';
import type { DatingSource } from './socialTypes.ts';
import type { Life } from './types.ts';

export const annualLoveSearches = 5;
type Search = DatingSource | 'hookup';
const key = (source: Search) => `love-search:${source}`;
const legacyHookup = (life: Life) => life.social.people.some(({ id }) => id === `npc-hookup-${life.year}`);

export function loveSearchCount(life: Life, source: Search) {
  return life.usedActions.filter((action) => action === key(source)).length +
    Number(source === 'hookup' ? legacyHookup(life) : life.usedActions.includes('dating-match'));
}

export function loveSearchIssue(life: Life, source: Search) {
  return loveSearchCount(life, source) >= annualLoveSearches ? `You’ve used all ${annualLoveSearches} searches this year.` : null;
}

export function consumeLoveSearch(life: Life, source: Search) {
  const attempt = loveSearchCount(life, source) + 1;
  life.usedActions.push(key(source));
  return attempt;
}

export function validSearchMatchId(id: string, year: number, kind: 'dating' | 'hookup') {
  if (id === `npc-${kind}-${year}`) return true;
  const attempt = Number(id.split('-').at(-1));
  if (!Number.isInteger(attempt) || attempt < 1 || attempt > annualLoveSearches) return false;
  return kind === 'hookup' ? id === `npc-hookup-${year}-${attempt}` :
    datingSources.some((source) => id === `npc-dating-${source}-${year}-${attempt}`);
}

export function discardSearchMatch(life: Life, id: string) {
  if (id === `npc-hookup-${life.year}`) life.usedActions.push(key('hookup'));
  life.social.people = life.social.people.filter((person) => person.id !== id);
  delete life.social.profiles[id];
  delete life.social.relationships[id];
}
