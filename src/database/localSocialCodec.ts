import { books, clubs } from '../data/localSocial.ts';
import { cities } from '../data/veyra.ts';
import { membershipKey, neighborhoodLimit, neighborhoodSize, readingHistoryLimit } from '../engine/localSocial.ts';
import { friendshipStages, socialEdgeTypes } from '../engine/localSocialTypes.ts';
import { socialGraphLimit } from '../engine/socialGraph.ts';
import type { Life } from '../engine/types.ts';

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, low: number, high: number) => typeof value === 'number' && Number.isInteger(value) && value >= low && value <= high;

export function validateLocalSocial(life: Life, ids: ReadonlySet<string>) {
  const { local, graph } = life.social;
  const date = (value: unknown) => integer(value, life.character.birthYear, life.year);
  const history = (items: unknown, limit: number) => Array.isArray(items) && items.length <= limit &&
    items.every((item) => record(item) && date(item.year) && typeof item.text === 'string');
  if (local !== undefined) {
    if (!record(local) || !record(local.neighborhoods) || !record(local.memberships) || !Array.isArray(local.reading) ||
      Object.keys(local.neighborhoods).length > neighborhoodLimit || Object.keys(local.memberships).length > cities.length * Object.keys(clubs).length ||
      local.reading.length > readingHistoryLimit) return false;
    for (const [site, state] of Object.entries(local.neighborhoods)) {
      if (!/^(?:alder-bay|northwick|bellmere)-[a-z0-9]{1,7}$/.test(site) || !record(state) || !record(state.rotations) ||
        !Object.entries(state.rotations).every(([slot, year]) => /^[0-9]$/.test(slot) && Number(slot) < neighborhoodSize && date(year))) return false;
    }
    for (const [key, member] of Object.entries(local.memberships)) {
      if (!record(member) || !cities.includes(member.city) || !Object.hasOwn(clubs, member.club) || key !== membershipKey(member.city, member.club) ||
        !date(member.joined) || typeof member.active !== 'boolean' || !integer(member.standing, 0, 100) || !history(member.history, 12) ||
        (member.attended !== undefined && member.attended !== true) ||
        !Array.isArray(member.members) || member.members.length !== 3 || new Set(member.members).size !== member.members.length) return false;
      const city = member.city.toLowerCase().replaceAll(' ', '-');
      if (!member.members.every((id, slot) => typeof id === 'string' && (ids.has(id) ||
        (id.startsWith(`npc-venue-club-${city}-${member.club}-${slot}-`) && date(Number(id.split('-').at(-1))))))) return false;
    }
    if (!local.reading.every((entry) => record(entry) && typeof entry.book === 'string' && Object.hasOwn(books, entry.book) &&
      date(entry.year) && typeof entry.experience === 'string')) return false;
  }
  if (graph === undefined) return true;
  if (!Array.isArray(graph) || graph.length > socialGraphLimit) return false;
  const visited = new Set<string>();
  const degrees = new Map<string, number>();
  for (const edge of graph) {
    if (!record(edge) || !Array.isArray(edge.people) || edge.people.length !== 2 ||
      !edge.people.every((id) => typeof id === 'string' && ids.has(id)) || edge.people[0] >= edge.people[1] ||
      !socialEdgeTypes.includes(edge.type) || !date(edge.met) || !date(edge.last) || edge.last < edge.met ||
      ![edge.affection, edge.trust, edge.familiarity, edge.compatibility, edge.resentment].every((value) => integer(value, 0, 100)) ||
      !history(edge.memories, 5)) return false;
    const key = edge.people.join('|');
    if (visited.has(key)) return false;
    visited.add(key);
    for (const id of edge.people) {
      const degree = (degrees.get(id) ?? 0) + 1;
      if (degree > 4) return false;
      degrees.set(id, degree);
    }
  }
  return true;
}

export function validateFriendship(value: unknown, life: Life, flag: boolean, former: boolean) {
  if (value === undefined) return true;
  if (!record(value) || !friendshipStages.some((stage) => stage === value.stage) ||
    !integer(value.experiences, 0, 32) || !integer(value.changed, life.character.birthYear, life.year) ||
    (value.last !== undefined && !integer(value.last, life.character.birthYear, life.year))) return false;
  return (value.stage !== 'acquaintance') === flag && (value.stage === 'former') === former;
}
