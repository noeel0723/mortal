import type { City, Gender, Person } from './types.ts';
import type { DatingGoal, DatingPreferences, DatingProfile } from './dating.ts';
import type { RelationshipCareAction, RelationshipState } from './relationshipTypes.ts';
import type { FirstDateVenue } from './firstDates.ts';
import type { IntimacyEvent } from './intimacy.ts';
import type { Friendship, LocalSocialAction, LocalSocialState, SocialEdge } from './localSocialTypes.ts';
import type { AdoptionApplication, Custody, Household, HouseholdAction, JointTitle } from './householdTypes.ts';
import type { ConnectionAction } from './connectionActions.ts';

export const traits = ['ambition', 'loyalty', 'empathy', 'sociability', 'discipline', 'confidence', 'temperament', 'materialism', 'riskTolerance'] as const;
export type Traits = Record<typeof traits[number], number>;
export const npcEducation = ['Early childhood', 'School', 'High school', 'Vocational', 'Undergraduate', 'Postgraduate'] as const;
export const employment = ['student', 'seeking', 'employed', 'retired'] as const;
export type SocialPerson = Person<'Sibling' | 'Grandparent' | 'Child' | 'Relative' | 'Acquaintance'> & { friend: boolean };
export type NpcProfile = {
  traits: Traits; interests: string[]; preferences: Gender[];
  education: typeof npcEducation[number]; educationProgram?: string; status: typeof employment[number];
  job: string | null; experience: number; income: number; savings: number; expenses: number; commitments: number;
  born: number; met: number; friendsSince: number | null; lastInteraction: number; formerFriend: boolean;
  memories: { year: number; text: string }[]; conflicts: number;
  localPartner: string | null; movedFrom?: City;
  datingGoal?: DatingGoal;
  casualContact?: 'connected' | 'closed';
  friendship?: Friendship;
  localHousehold?: 'alone' | 'family' | 'shared';
  introduced?: true;
  familyStudies?: { program: string; started: number; graduation: number };
};
export const activeRomanceStatuses = ['dating', 'committed', 'engaged', 'married'] as const;
export const romanceStatuses = ['getting-to-know', 'interest', ...activeRomanceStatuses, 'contact-ended', 'broken-up', 'divorced', 'widowed'] as const;
export type Romance = { person: string; status: typeof romanceStatuses[number]; started: number; engagement: number | null;
  wedding: number | null; ended: number | null; history: { year: number; text: string }[] };
export const socialEvents = ['social-dinner', 'social-time', 'social-proposal', 'social-support', 'social-school', 'social-finances',
  'social-dating-match', 'social-casual-match', 'social-affair', 'social-make-love', 'social-hookup', 'social-threesome',
  'social-expectations', 'social-space', 'social-concern', 'social-reconnect', 'social-meeting', 'social-dating-discovery', 'social-protection', 'social-friendship'] as const;
export type SocialEventId = typeof socialEvents[number];
export const datingSources = ['spotlight', 'date', 'app', 'lgbtq', 'casual', 'matchmaking'] as const;
export type DatingSource = typeof datingSources[number];
export type DatingCycle = { year: number; viewed: number[]; background?: 2; pending?: { candidate: number; source: DatingSource } };
export const meetingSources = ['neighborhood', 'hobbies', 'library'] as const;
export type MeetingSource = typeof meetingSources[number];
export type VehicleKind = 'cars' | 'motorcycles';
export type ChildRecord = { year: number; adopted: boolean; wellbeing: number; learning: number; confidence: number; supportEnded: boolean;
  driving?: VehicleKind[]; atHome?: boolean };
export type Pregnancy = { mother: string; father: string; dueYear: number; name?: string };
export type SocialState = {
  people: SocialPerson[]; profiles: Record<string, NpcProfile>;
  parents: Record<string, string[]>; children: Record<string, ChildRecord>;
  romances: Romance[]; relationships: Record<string, RelationshipState>; pendingPerson: string | null; pendingGuest?: string;
  pregnancies?: Pregnancy[];
  pendingMeeting?: MeetingSource;
  pendingEncounter?: IntimacyEvent;
  datingProfile?: DatingProfile;
  datingCycle?: DatingCycle;
  local?: LocalSocialState;
  graph?: SocialEdge[];
  unions?: { people: [string, string]; since: number; married?: number }[];
  household?: Household;
  jointTitles?: JointTitle[];
  custody?: Record<string, Custody>;
  adoption?: AdoptionApplication;
};
export const paidRomanticActivities = ['date', 'dinner', 'movie'] as const;
export type PaidRomanticActivity = typeof paidRomanticActivities[number];
export const dateTiers = ['simple', 'standard', 'premium'] as const;
export type DateTier = typeof dateTiers[number];
export const parentingActivities = ['care', 'read', 'school', 'hobby', 'lesson', 'support', 'future'] as const;
export type IntimacyAction =
  | { type: 'intimacy'; encounter: 'make-love'; person: string }
  | { type: 'intimacy'; encounter: 'hookup' }
  | { type: 'intimacy'; encounter: 'threesome'; first: string; second: string };
export type SocialAction =
  | IntimacyAction
  | RelationshipCareAction
  | HouseholdAction
  | ConnectionAction
  | LocalSocialAction
  | { type: 'social-introduction'; person: string }
  | { type: 'meet'; source: 'neighborhood' | 'hobbies' | 'date' | 'app' }
  | { type: 'dating-match'; source: DatingSource; preferences?: DatingPreferences }
  | { type: 'dating-profile'; profile: DatingProfile }
  | ({ type: 'romance'; person: string } & ({ action: 'ask'; venue?: FirstDateVenue } |
    { action: PaidRomanticActivity; tier?: DateTier } |
    { action: 'interest' | 'propose' | 'breakup' | 'divorce' | 'support' | 'future' | 'apologize' }))
  | { type: 'wedding'; person: string; plan: 'civil' | 'gathering' | 'celebration' }
  | { type: 'plan-child'; person: string; method: 'family' | 'adoption'; name?: string }
  | { type: 'parent-child'; person: string; action: typeof parentingActivities[number] };
