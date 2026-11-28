export const contributions = ['independent', 'equal', 'proportional', 'primary', 'essentials'] as const;
export type Contribution = typeof contributions[number];
export type Household = {
  spouse: string;
  living: 'together' | 'separate';
  contribution: Contribution;
  duties?: 'shared' | 'player' | 'partner';
  savings: { player: number; partner: number };
  familyPlan?: { year: number; answer: 'ready' | 'wait' };
};
export type JointTitle = { asset: string; partner: string; basis: number; contribution: number };
export const custodyArrangements = ['player', 'other', 'shared'] as const;
export type Custody = { other: string; residence: typeof custodyArrangements[number]; since: number };
export type HouseholdAction = { type: 'household'; person: string } & (
  { action: 'contributions'; arrangement: Contribution } |
  { action: 'together' | 'separate' | 'responsibilities' | 'career' | 'vacation' | 'anniversary' | 'planning' } |
  { action: 'deposit' | 'withdraw'; amount: number } |
  { action: 'share-asset'; asset: string } |
  { action: 'custody'; child: string; residence: Custody['residence'] }
);

export type AdoptionApplication = { candidate: string; city: import('./types.ts').City; applied: number; due: number; partner?: string; fee: number };
