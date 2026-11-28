import { adoptionCost, familyIssue, parenting } from './engine/familyLife.ts';
import { dateActivities, datingCompatibility, isActiveRomance, loveIssue, romanceFor, romanceLabels, weddingPlans } from './engine/love.ts';
import { datingGoals } from './engine/dating.ts';
import { firstDatePrice, firstDateVenues } from './engine/firstDates.ts';
import type { FirstDateVenue } from './engine/firstDates.ts';
import { friendshipLabel, relationshipGroups } from './engine/relationshipDirectory.ts';
import { allContacts, isFamily, npcProfile } from './engine/npcs.ts';
import { intimacyIssue, isIntimacyContact } from './engine/intimacy.ts';
import { annualLoveSearches, loveSearchCount } from './engine/loveSearch.ts';
import { activeFor, agreementFor, agreementLabels, careIssue, communicationEnded, concernLabels, counselingFee, earlyConnection, knownRelationship, relationshipCondition,
  relationshipState, visibleConcerns, visitFee } from './engine/relationships.ts';
import type { MemoryKind, RelationshipCareAction } from './engine/relationshipTypes.ts';
import { findContact } from './engine/school.ts';
import { isWorkAcquaintance } from './engine/workplace.ts';
import type { DatingAppSource } from './engine/dating.ts';
import type { DatingSource, IntimacyAction, SocialAction } from './engine/socialTypes.ts';
import type { Contact, Life } from './engine/types.ts';
import { en, money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export { friendshipLabel, relationshipGroups };

export function socialRole(life: Life, person: Contact) {
  const relationship = romanceFor(life, person.id);
  if (relationship?.status === 'married') return 'Spouse';
  if (relationship) return romanceLabels[relationship.status];
  if (isFamily(life, person.id)) return person.role;
  const status = friendshipLabel(life, person);
  return status === 'Acquaintance' && !isWorkAcquaintance(person) ? person.role : status;
}

export function personalityLabels(life: Life, person: Contact) {
  const { traits } = npcProfile(life, person);
  const labels = [
    [traits.ambition, 'Ambitious'], [traits.loyalty, 'Loyal'], [traits.empathy, 'Empathetic'],
    [traits.sociability, 'Outgoing'], [traits.discipline, 'Disciplined'], [traits.confidence, 'Confident'],
    [traits.temperament, 'Patient'], [traits.materialism, 'Material-minded'], [traits.riskTolerance, 'Adventurous'],
  ] as const;
  return [...labels].sort(([a], [b]) => b - a).slice(0, 3).map(([, label]) => label).join(', ');
}

export function familyTreeGroups(life: Life) {
  const groups = relationshipGroups(life);
  return [
    { label: 'Grandparents', people: groups.family.filter(({ role }) => role === 'Grandparent') },
    { label: 'Parents', people: life.family },
    { label: 'Siblings', people: groups.family.filter(({ role }) => role === 'Sibling') },
    { label: 'Spouse and former spouses', people: [...groups.family, ...groups.former].filter((person) => {
      const entry = romanceFor(life, person.id);
      return entry?.wedding != null;
    }) },
    { label: 'Children', people: groups.family.filter(({ role }) => role === 'Child') },
  ].filter(({ people }) => people.length);
}

export function childParents(life: Life, person: Contact) {
  const ids = life.social.parents[person.id];
  if (!ids?.length) return undefined;
  return ids.map((id) => id === 'self' ? 'You' : findContact(life, id)?.name).filter(Boolean).join(' and ');
}

export function datingCandidates(life: Life) {
  if (life.character.age < 18) return [];
  return allContacts(life).filter((person) => person.alive && person.age >= 18 &&
    (person.city === life.character.city || earlyConnection(life, person.id)) && !communicationEnded(life, person.id) &&
    !isFamily(life, person.id) && !isActiveRomance(romanceFor(life, person.id)) && !npcProfile(life, person).localPartner &&
    (person.role === 'Acquaintance' || ('friend' in person && person.friend)));
}

export function datingSummary(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  return [`Age ${person.age} · ${person.occupation} · ${person.city}`, personalityLabels(life, person),
    profile.interests.join(' and '), `${datingCompatibility(life, person)}% compatibility`].join(' · ');
}

type Control = { label: string; icon: Emoji; action: SocialAction; detail?: string; issue: string | null };
const love = (life: Life, action: Parameters<typeof loveIssue>[1], label: string, icon: Emoji, detail?: string): Control =>
  ({ action, label, icon, detail, issue: loveIssue(life, action) });
const family = (life: Life, action: Parameters<typeof familyIssue>[1], label: string, icon: Emoji, detail?: string): Control =>
  ({ action, label, icon, detail, issue: familyIssue(life, action) });
const intimacy = (life: Life, action: IntimacyAction, label: string, icon: Emoji, detail: string): Control =>
  ({ action, label, icon, detail, issue: intimacyIssue(life, action) });

const memories: Record<MemoryKind, string> = { meeting: 'First Meeting', date: 'First Date', commitment: 'Commitment', engagement: 'Engagement',
  marriage: 'Marriage', support: 'Meaningful Support', conflict: 'Conflict', promise: 'A Promise', boundary: 'Boundary Violation',
  reconciliation: 'Reconciliation', breakup: 'Relationship Ended' };

export function relationshipOverview(life: Life, person: Contact) {
  const romance = romanceFor(life, person.id);
  const state = relationshipState(life, person.id);
  const active = activeFor(life, person.id);
  if (!romance && !knownRelationship(life, person)) return null;
  const years = active ? life.year - romance!.started : undefined;
  const condition = person.alive && (active || knownRelationship(life, person)) ? relationshipCondition(life, person) : undefined;
  const agreement = active ? agreementLabels[agreementFor(life, person.id)] : undefined;
  const summary = [socialRole(life, person), person.alive ? en.age(person.age) : 'Deceased',
    active ? `${years} ${years === 1 ? 'year' : 'years'} together` : undefined,
    condition, person.alive && person.city !== life.character.city ? 'Long-distance' : undefined].filter(Boolean).join(' · ');
  const concerns = visibleConcerns(life, person.id).map((entry) => ({ label: concernLabels[entry.kind],
    value: `${entry.state === 'repairing' ? 'Working on it' : 'Open'} · Since ${entry.year}` }));
  if (state?.promise) concerns.push({ label: state.promise.kind === 'time' ? 'Promise to make time' : 'Promise to offer support',
    value: state.promise.status === 'pending' ? `Due by ${state.promise.due}` : state.promise.status === 'kept' ? 'Kept' : 'Broken' });
  if ((state?.apartUntil ?? 0) > life.year) concerns.push({ label: 'Taking time apart', value: `Until ${state!.apartUntil}` });
  const milestones = Object.values(state?.milestones ?? {}).sort((a, b) => a.year - b.year)
    .map((entry) => ({ label: memories[entry.kind], value: String(entry.year) }));
  const goal = npcProfile(life, person).datingGoal;
  return { summary, years, condition, agreement, concerns, milestones, goal: goal && datingGoals[goal].label };
}

export function relationshipCareControls(life: Life, person: Contact): Control[] {
  if (!person.alive || life.character.age < 18 || person.age < 18 || !knownRelationship(life, person)) return [];
  const active = activeFor(life, person.id);
  const early = earlyConnection(life, person.id);
  const hasConcern = visibleConcerns(life, person.id).length > 0;
  const rows: Control[] = [];
  const add = (action: RelationshipCareAction['action'], label: string, icon: Emoji, detail?: string) => {
    rows.push({ label, icon, detail, issue: careIssue(life, person, action), action: { type: 'relationship-care', person: person.id, action } });
  };
  add('phone', 'Call', 'phone', 'Make time for a phone call.');
  add('message', 'Send a Message', 'loveLetter', 'Check in from wherever you are.');
  if (early) {
    add('conversation', 'Have a Conversation', 'talk', 'Get to know each other in person.');
    add('interests', 'Discuss Shared Interests', 'art', 'Talk about the things you both enjoy.');
  } else {
    add('video', 'Video Call', 'camera', 'Talk face-to-face from a distance.');
    if (!active) add('support', 'Check In and Offer Support', 'support', 'Show up for a friend who needs you.');
  }
  if (person.city !== life.character.city) add('visit', 'Plan a Visit', 'train', `Visit ${person.city} this year · ${money(visitFee(life, person))}`);
  if (early) {
    add('end-contact', 'End Communication', 'exit', 'Close the connection and keep your shared history.');
    return rows;
  }
  if (active) {
    add('exclusive', 'Discuss Exclusivity', 'ring', 'Agree to date only each other.');
    add('non-exclusive', 'Discuss Non-Exclusivity', 'talk', 'Agree that other dates and relationships are allowed.');
    add('relocation', 'Discuss Relocation', 'location', 'Talk about living in the same city.');
  }
  if (hasConcern) {
    add('discuss', 'Discuss Concerns', 'thoughts', 'Hear how they feel about the most urgent issue.');
    add('promise-time', 'Promise to Make Time', 'calendar');
    add('promise-support', 'Promise to Offer Support', 'support');
    add('space', 'Take Time Apart', 'walk');
    add('reconcile', 'Try to Reconcile', 'thanks');
    if (active) add('counseling', 'Relationship Counseling', 'medical', money(counselingFee));
  }
  return rows;
}

export const datingApps: Record<DatingAppSource, { label: string; icon: Emoji }> = {
  app: { label: 'Dating App', icon: 'datingPhone' },
  lgbtq: { label: 'LGBTQ+ Dating', icon: 'pride' },
};

function searchDetail(life: Life, source: DatingSource | 'hookup', detail: string) {
  return `${detail} · ${Math.max(0, annualLoveSearches - loveSearchCount(life, source))} left this year`;
}

function datingAppControls(life: Life) {
  return (['app', 'lgbtq'] as const).map((source) => {
    const { label, icon } = datingApps[source];
    return love(life, { type: 'dating-match', source }, label, icon, searchDetail(life, source, 'Search by age and net worth'));
  });
}

export function datingControls(life: Life) {
  return [
    love(life, { type: 'dating-match', source: 'date' }, 'Find a Date', 'health', searchDetail(life, 'date', 'Meet someone at a singles event')),
    ...datingAppControls(life),
  ];
}

export function hookupControl(life: Life) {
  return intimacy(life, { type: 'intimacy', encounter: 'hookup' }, 'Hook Up', 'blackHeart', searchDetail(life, 'hookup', 'Find a one-night match'));
}

export function meetingControls(life: Life) {
  return [
    love(life, { type: 'meet', source: 'neighborhood' }, 'Meet a Neighbor', 'location', 'Get to know someone nearby'),
    love(life, { type: 'meet', source: 'hobbies' }, 'Join a Hobby Group', 'art', 'Meet people with shared interests'),
  ];
}

export function firstDateControls(life: Life, person: Contact) {
  return (Object.keys(firstDateVenues) as FirstDateVenue[]).map((venue) => {
    const { label, icon } = firstDateVenues[venue];
    const price = firstDatePrice(life, person, venue);
    return love(life, { type: 'romance', person: person.id, action: 'ask', venue }, label, icon, price ? money(price) : 'Free');
  });
}

const romanceIcons = { date: 'rose', gift: 'gift', dinner: 'restaurant', movie: 'camera', support: 'support', future: 'thoughts', apologize: 'thanks' } as const;
const parentingIcons = { care: 'bottle', read: 'library', school: 'study', hobby: 'art', lesson: 'classroom', gift: 'gift', support: 'support', future: 'talk' } as const;

export function relationshipControls(life: Life, person: Contact) {
  const { id } = person;
  if (life.social.parents[id]?.includes('self')) return (Object.keys(parenting) as (keyof typeof parenting)[]).map((action) =>
    family(life, { type: 'parent-child', person: id, action }, parenting[action].label, parentingIcons[action],
      parenting[action].cost ? money(parenting[action].cost) : undefined));

  const romance = romanceFor(life, id);
  const status = romance?.status;
  const privateEvening = isIntimacyContact(life, person) ?
    [intimacy(life, { type: 'intimacy', encounter: 'make-love', person: id }, 'Make Love', 'loveLetter', 'Invite them to spend a private evening together.')] : [];
  if (isActiveRomance(romance)) {
    const dates = (Object.keys(dateActivities) as (keyof typeof dateActivities)[]).map((action) =>
      love(life, { type: 'romance', person: id, action }, dateActivities[action].label, romanceIcons[action],
        dateActivities[action].cost ? money(dateActivities[action].cost) : undefined));
    const rows = [...privateEvening, ...dates];
    if (status === 'dating' || status === 'committed') rows.push(love(life, { type: 'romance', person: id, action: 'propose' }, 'Propose Marriage', 'ring'));
    if (status === 'engaged') for (const plan of Object.keys(weddingPlans) as (keyof typeof weddingPlans)[]) {
      rows.push(love(life, { type: 'wedding', person: id, plan }, weddingPlans[plan].label, 'ring', money(weddingPlans[plan].cost)));
    }
    if (status === 'married') {
      rows.push(family(life, { type: 'plan-child', person: id, method: 'family' }, 'Discuss Family Planning', 'bottle'));
      rows.push(family(life, { type: 'plan-child', person: id, method: 'adoption' }, 'Discuss Adoption', 'family', money(adoptionCost)));
    }
    rows.push(love(life, { type: 'romance', person: id, action: status === 'married' ? 'divorce' : 'breakup' },
      status === 'married' ? 'Divorce' : 'Break Up', 'brokenHeart',
      status === 'married' ? 'Settlement is 8% of savings, up to $50. Assets stay in your inventory.' : undefined));
    return rows;
  }
  if (communicationEnded(life, id) || life.character.age < 18 || person.age < 18 || isFamily(life, id) || !person.alive ||
    !(person.role === 'Acquaintance' || ('friend' in person && person.friend))) return [];
  return [
    ...privateEvening,
    ...(status !== 'interest' ? [love(life, { type: 'romance', person: id, action: 'interest' }, 'Express Romantic Interest', 'loveLetter')] : []),
    love(life, { type: 'romance', person: id, action: 'ask' }, 'Ask on a Date', 'rose'),
  ];
}
