import type { City, Gender, Person } from './types.ts';

export const traits = ['ambition', 'loyalty', 'empathy', 'sociability', 'discipline', 'confidence', 'temperament', 'materialism', 'riskTolerance'] as const;
export type Traits = Record<typeof traits[number], number>;
export const npcEducation = ['Early childhood', 'School', 'High school', 'Vocational', 'Undergraduate', 'Postgraduate'] as const;
export const employment = ['student', 'seeking', 'employed', 'retired'] as const;
export type SocialPerson = Person<'Sibling' | 'Grandparent' | 'Child' | 'Acquaintance'> & { friend: boolean };
export type NpcProfile = {
  traits: Traits; interests: string[]; preferences: Gender[];
  education: typeof npcEducation[number]; status: typeof employment[number];
  job: string | null; experience: number; income: number; savings: number; expenses: number; commitments: number;
  born: number; met: number; friendsSince: number | null; lastInteraction: number; formerFriend: boolean;
  memories: { year: number; text: string }[]; conflicts: number;
  localPartner: string | null; movedFrom?: City;
};
export const romanceStatuses = ['interest', 'dating', 'engaged', 'married', 'broken-up', 'divorced', 'widowed'] as const;
export type Romance = { person: string; status: typeof romanceStatuses[number]; started: number; engagement: number | null;
  wedding: number | null; ended: number | null; history: { year: number; text: string }[] };
export const socialEvents = ['social-dinner', 'social-time', 'social-proposal', 'social-support', 'social-school', 'social-finances'] as const;
export type ChildRecord = { year: number; adopted: boolean; wellbeing: number; learning: number; confidence: number; supportEnded: boolean };
export type SocialState = {
  people: SocialPerson[]; profiles: Record<string, NpcProfile>;
  parents: Record<string, string[]>; children: Record<string, ChildRecord>;
  romances: Romance[]; pendingPerson: string | null;
};
export const romanticActivities = ['date', 'gift', 'dinner', 'movie', 'support', 'future', 'apologize'] as const;
export const parentingActivities = ['care', 'read', 'school', 'hobby', 'gift', 'support', 'future'] as const;
export type SocialAction =
  | { type: 'meet'; source: 'neighborhood' | 'hobbies' | 'date' | 'app' }
  | { type: 'romance'; person: string; action: 'interest' | 'ask' | 'propose' | 'breakup' | 'divorce' | typeof romanticActivities[number] }
  | { type: 'wedding'; person: string; plan: 'civil' | 'gathering' | 'celebration' }
  | { type: 'plan-child'; person: string; method: 'family' | 'adoption'; name?: string }
  | { type: 'parent-child'; person: string; action: typeof parentingActivities[number] };
