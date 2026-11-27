import { adoptionCost, familyIssue, parenting } from './engine/familyLife.ts';
import { activeRomances, dateActivities, datingCompatibility, isActiveRomance, loveIssue, romanceFor, romanceLabels, weddingPlans } from './engine/love.ts';
import { allContacts, isFamily, npcProfile } from './engine/npcs.ts';
import { intimacyIssue, isIntimacyContact } from './engine/intimacy.ts';
import { activeFor, agreementFor, agreementLabels, careIssue, concernLabels, counselingFee, knownRelationship, relationshipCondition,
  relationshipState, visibleConcerns, visitFee } from './engine/relationships.ts';
import type { MemoryKind, RelationshipCareAction } from './engine/relationshipTypes.ts';
import { findContact, isCurrentClassContact, isPeer } from './engine/school.ts';
import { isWorkAcquaintance, isWorkContact } from './engine/workplace.ts';
import { datingSources } from './engine/socialTypes.ts';
import type { DatingSource, IntimacyAction, SocialAction } from './engine/socialTypes.ts';
import type { Contact, Life } from './engine/types.ts';
import { en, money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export function friendshipLabel(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  if (person.bond.resentment >= 55 && person.bond.trust < 35) return 'Rival';
  if (profile.formerFriend) return 'Former Friend';
  if (!('friend' in person) || !person.friend) return 'Acquaintance';
  const years = life.year - profile.met;
  const score = person.bond.affection * .52 + person.bond.trust * .35 + profile.traits.loyalty * .13;
  if (years >= 4 && score >= 80 && profile.memories.length >= 4) return 'Best Friend';
  if (years >= 2 && score >= 66 && profile.memories.length >= 2) return 'Close Friend';
  return 'Friend';
}

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

export function relationshipGroups(life: Life) {
  const former = (person: Contact) => {
    const romance = romanceFor(life, person.id);
    const friendship = friendshipLabel(life, person);
    return (romance?.ended != null || friendship === 'Former Friend' || friendship === 'Rival');
  };
  const known = allContacts(life);
  const partnerIds = new Set(activeRomances(life).map(({ person }) => person));
  return {
    family: known.filter(({ id }) => isFamily(life, id)),
    partners: known.filter(({ id }) => partnerIds.has(id)),
    prospects: known.filter(({ id, alive }) => alive && ['getting-to-know', 'interest'].includes(romanceFor(life, id)?.status ?? '')),
    friends: known.filter((person) => !isFamily(life, person.id) && !partnerIds.has(person.id) && 'friend' in person && person.friend && !former(person)),
    acquaintances: known.filter((person) => person.alive && !partnerIds.has(person.id) && !isFamily(life, person.id) &&
      'friend' in person && !person.friend && !former(person) && (isWorkContact(person) ? isWorkAcquaintance(person) :
      person.role === 'Acquaintance' || romanceFor(life, person.id)?.status === 'interest' ||
      ('stage' in person && isPeer(person) && isCurrentClassContact(life, person)))),
    former: known.filter((person) => !partnerIds.has(person.id) && !isFamily(life, person.id) && former(person)),
  };
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
  return allContacts(life).filter((person) => person.alive && person.age >= 18 && person.city === life.character.city &&
    !isFamily(life, person.id) && !isActiveRomance(romanceFor(life, person.id)) && !npcProfile(life, person).localPartner &&
    (person.role === 'Acquaintance' || ('friend' in person && person.friend)));
}

export function datingSummary(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  return [`Age ${person.age} · ${person.occupation}`, personalityLabels(life, person),
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
  return { summary, years, condition, agreement, concerns, milestones };
}

export function relationshipCareControls(life: Life, person: Contact): Control[] {
  if (!person.alive || life.character.age < 18 || person.age < 18 || !knownRelationship(life, person)) return [];
  const active = activeFor(life, person.id);
  const hasConcern = visibleConcerns(life, person.id).length > 0;
  const rows: Control[] = [];
  const add = (action: RelationshipCareAction['action'], label: string, icon: Emoji, detail?: string) => {
    rows.push({ label, icon, detail, issue: careIssue(life, person, action), action: { type: 'relationship-care', person: person.id, action } });
  };
  add('phone', 'Call', 'phone', 'Make time for a phone call.');
  add('message', 'Send a Message', 'loveLetter', 'Check in from wherever you are.');
  add('video', 'Video Call', 'camera', 'Talk face-to-face from a distance.');
  if (!active) add('support', 'Check In and Offer Support', 'support', 'Show up for a friend who needs you.');
  if (person.city !== life.character.city) add('visit', 'Plan a Visit', 'train', `Visit ${person.city} this year · ${money(visitFee(life, person))}`);
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

const datingActivities: Record<DatingSource, { label: string; icon: Emoji; detail: string }> = {
  spotlight: { label: 'Spotlight Dating', icon: 'star', detail: 'Get matched with a local public figure.' },
  date: { label: 'Find a Date', icon: 'health', detail: 'Meet someone at a singles event.' },
  app: { label: 'Dating App', icon: 'datingPhone', detail: 'Find a match nearby.' },
  lgbtq: { label: 'LGBTQ+ Dating', icon: 'pride', detail: 'Meet a match through an LGBTQ+ dating app.' },
  casual: { label: 'Casual Date', icon: 'rose', detail: 'Share an evening without committing to a relationship.' },
  matchmaking: { label: 'Matchmaking', icon: 'loveLetter', detail: 'Let a local matchmaker introduce you.' },
};

export function datingControls(life: Life) {
  const dating = datingSources.map((source) => {
    const { label, icon, detail } = datingActivities[source];
    return love(life, { type: 'dating-match', source }, label, icon, detail);
  });
  return [...dating, intimacy(life, { type: 'intimacy', encounter: 'hookup' }, 'Hook Up', 'night', 'Meet an adult interested in a one-night stand.')];
}

export function meetingControls(life: Life, romantic: boolean) {
  return romantic ? [
    love(life, { type: 'meet', source: 'date' }, 'Find a Date', 'rose', 'Meet someone at a singles event.'),
    love(life, { type: 'meet', source: 'app' }, 'Dating App', 'loveLetter', 'Get introduced to a local profile.'),
  ] : [
    love(life, { type: 'meet', source: 'neighborhood' }, 'Meet a Neighbor', 'location'),
    love(life, { type: 'meet', source: 'hobbies' }, 'Join a Hobby Group', 'art'),
  ];
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
  if (life.character.age < 18 || person.age < 18 || isFamily(life, id) || !person.alive ||
    !(person.role === 'Acquaintance' || ('friend' in person && person.friend))) return [];
  return [
    ...privateEvening,
    ...(status !== 'interest' ? [love(life, { type: 'romance', person: id, action: 'interest' }, 'Show Romantic Interest', 'loveLetter')] : []),
    love(life, { type: 'romance', person: id, action: 'ask' }, 'Ask on a Date', 'rose'),
  ];
}
