import type { ClubId } from '../data/localSocial.ts';
import type { City } from './types.ts';

export const neighborActivities = ['introduce', 'visit', 'invite', 'help', 'gathering'] as const;
export const libraryActivities = ['read', 'research', 'circle', 'socialize'] as const;
export const clubActivities = ['join', 'leave', 'attend', 'project', 'meet'] as const;
export type LocalSocialAction =
  | { type: 'neighborhood'; activity: typeof neighborActivities[number]; person?: string }
  | { type: 'community'; activity: typeof clubActivities[number]; club: ClubId; person?: string }
  | { type: 'library-visit'; activity: typeof libraryActivities[number]; book?: string };

export type ClubMembership = { club: ClubId; city: City; joined: number; active: boolean; standing: number;
  members: string[]; attended?: true; history: { year: number; text: string }[] };
export type LocalSocialState = {
  neighborhoods: Record<string, { rotations: Record<string, number> }>;
  memberships: Record<string, ClubMembership>;
  reading: { book: string; year: number; experience: string }[];
};

export const friendshipStages = ['acquaintance', 'casual', 'friend', 'close', 'best', 'former'] as const;
export type FriendshipStage = typeof friendshipStages[number];
export type Friendship = { stage: FriendshipStage; experiences: number; changed: number; last?: number };

export const socialEdgeTypes = ['acquaintance', 'friend', 'close', 'rival'] as const;
export type SocialEdge = {
  people: [string, string]; type: typeof socialEdgeTypes[number];
  affection: number; trust: number; familiarity: number; compatibility: number; resentment: number;
  met: number; last: number; memories: { year: number; text: string }[];
};
