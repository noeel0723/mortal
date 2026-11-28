import { agreements, breachKinds, concerns, conflictStates, memoryKinds, milestoneKinds } from '../engine/relationshipTypes.ts';
import { cities } from '../data/veyra.ts';
import type { Life } from '../engine/types.ts';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const valueIn = (list: readonly string[], value: unknown) => list.some((entry) => entry === value);
const integer = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= low && value <= high;

export function validateRelationships(life: Life, ids: ReadonlySet<string>) {
  const { year, character, social } = life;
  const date = (value: unknown) => integer(value, character.birthYear, year);
  const memory = (value: unknown) => object(value) && valueIn(memoryKinds, value.kind) && date(value.year) &&
    valueIn(['meaningful', 'major'], value.significance) && integer(value.impact, -100, 100);
  if (!object(social.relationships)) return false;
  for (const [id, state] of Object.entries(social.relationships)) {
    if (!ids.has(id) || !object(state) || !valueIn(agreements, state.agreement) ||
      (state.lastMeaningful !== undefined && !date(state.lastMeaningful)) ||
      (state.lastAgreementTalk !== undefined && !date(state.lastAgreementTalk)) ||
      (state.apartUntil !== undefined && !integer(state.apartUntil, character.birthYear, year + 1)) ||
      (state.endedBecause !== undefined && !valueIn(['player', 'betrayal', 'neglect', 'conflict', 'death'], state.endedBecause)) ||
      !Array.isArray(state.memories) || state.memories.length > 16 || !state.memories.every(memory) || !object(state.milestones) ||
      !Object.entries(state.milestones).every(([kind, item]) => valueIn(milestoneKinds, kind) && object(item) && item.kind === kind && memory(item)) ||
      !Array.isArray(state.conflicts) || state.conflicts.length > concerns.length) return false;
    if (state.archived !== undefined && state.archived !== true) return false;
    if (state.perspective !== undefined && (!object(state.perspective) || !date(state.perspective.updated) ||
      !integer(state.perspective.npc, 0, 100) || !integer(state.perspective.willingness, 0, 100) ||
      (state.perspective.player !== undefined && !integer(state.perspective.player, 0, 100)))) return false;
    if (state.grief !== undefined && (!object(state.grief) || !date(state.grief.since) || !integer(state.grief.intensity, 0, 100) ||
      (state.grief.lastMemorial !== undefined && (!date(state.grief.lastMemorial) || state.grief.lastMemorial < state.grief.since)))) return false;
    if (state.confidence !== undefined && (!object(state.confidence) || !date(state.confidence.shared) ||
      (state.confidence.recipient !== undefined && (typeof state.confidence.recipient !== 'string' || state.confidence.recipient === id || !ids.has(state.confidence.recipient))))) return false;
    if (state.visit !== undefined && (!object(state.visit) || !date(state.visit.year) || !valueIn(cities, state.visit.city))) return false;
    if (state.move !== undefined && (!object(state.move) || !integer(state.move.year, character.birthYear, year + 1) ||
      (state.move.city !== undefined && !valueIn(cities, state.move.city)))) return false;
    if (state.promise !== undefined && (!object(state.promise) || !date(state.promise.year) || state.promise.due !== state.promise.year + 1 ||
      !valueIn(['time', 'support'], state.promise.kind) || !valueIn(['pending', 'kept', 'broken'], state.promise.status))) return false;
    const kinds = new Set<string>();
    for (const entry of state.conflicts) {
      if (!object(entry) || !valueIn(concerns, entry.kind) || kinds.has(entry.kind) || !date(entry.year) || !date(entry.updated) ||
        entry.updated < entry.year || entry.id !== `concern:${id}:${entry.kind}:${entry.year}` || !integer(entry.severity, 0, 100) ||
        !integer(entry.peak, entry.severity, 100) ||
        !valueIn(conflictStates, entry.state) || !Array.isArray(entry.participants) || entry.participants.length !== 2 ||
        entry.participants[0] !== 'self' || entry.participants[1] !== id ||
        (entry.repairYear !== undefined && (!date(entry.repairYear) || entry.repairYear < entry.year))) return false;
      kinds.add(entry.kind);
      if (entry.kind === 'boundary') {
        const breach = entry.breach;
        if (!object(breach) || typeof breach.discovered !== 'boolean' || typeof breach.unseen !== 'boolean' || !Array.isArray(breach.evidence) ||
          breach.evidence.length < 1 || breach.evidence.length > 4 || !integer(breach.count, breach.evidence.length, Number.MAX_SAFE_INTEGER) ||
          !breach.evidence.every((item: unknown) => object(item) && typeof item.who === 'string' && item.who !== id && ids.has(item.who) &&
            (item.others === undefined || (item.kind === 'intimacy' && Array.isArray(item.others) && item.others.length === 1 &&
              typeof item.others[0] === 'string' && item.others[0] !== id && ids.has(item.others[0]) && item.who < item.others[0])) &&
            date(item.year) && item.year >= entry.year && valueIn(breachKinds, item.kind))) return false;
      } else if (entry.breach !== undefined) return false;
    }
  }
  return true;
}
