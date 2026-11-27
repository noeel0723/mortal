import type { City } from './types.ts';

export const agreements = ['legacy', 'casual', 'exclusive', 'non-exclusive'] as const;
export type Agreement = typeof agreements[number];
export const concerns = ['neglect', 'money', 'workload', 'jealousy', 'promise', 'goals', 'distance', 'parenting', 'argument', 'boundary'] as const;
export type Concern = typeof concerns[number];
export const conflictStates = ['open', 'repairing', 'resolved'] as const;
export const memoryKinds = ['meeting', 'date', 'commitment', 'engagement', 'marriage', 'support', 'conflict', 'promise', 'boundary',
  'reconciliation', 'breakup'] as const;
export type MemoryKind = typeof memoryKinds[number];
export const milestoneKinds = ['meeting', 'date', 'commitment', 'engagement', 'marriage', 'reconciliation', 'breakup'] as const;
export const breachKinds = ['date', 'commitment', 'intimacy'] as const;
export type BreachKind = typeof breachKinds[number];

export type RelationshipMemory = { kind: MemoryKind; year: number; significance: 'meaningful' | 'major'; impact: number };
export type RelationshipConflict = {
  id: string; participants: ['self', string]; kind: Concern; severity: number; peak: number; year: number; updated: number;
  state: typeof conflictStates[number]; repairYear?: number;
  breach?: { count: number; discovered: boolean; unseen: boolean; evidence: { who: string; kind: BreachKind; year: number }[] };
};
export type RelationshipState = {
  agreement: Agreement; conflicts: RelationshipConflict[]; memories: RelationshipMemory[];
  milestones: Partial<Record<typeof milestoneKinds[number], RelationshipMemory>>;
  lastMeaningful?: number; apartUntil?: number; visit?: { year: number; city: City }; move?: { year: number; city?: City };
  promise?: { year: number; due: number; kind: 'time' | 'support'; status: 'pending' | 'kept' | 'broken' };
  endedBecause?: 'player' | 'betrayal' | 'neglect' | 'conflict' | 'death';
};

export const careActions = ['exclusive', 'non-exclusive', 'discuss', 'promise-time', 'promise-support', 'reconcile', 'space',
  'counseling', 'support', 'phone', 'message', 'video', 'visit', 'relocation'] as const;
export type RelationshipCareAction = { type: 'relationship-care'; person: string; action: typeof careActions[number] };
