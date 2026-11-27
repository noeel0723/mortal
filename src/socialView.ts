import { adoptionCost, familyIssue, parenting } from './engine/familyLife.ts';
import { activeRomance, dateActivities, datingCompatibility, loveIssue, romanceFor, romanceLabels, weddingPlans } from './engine/love.ts';
import { allContacts, isFamily, npcProfile } from './engine/npcs.ts';
import { findContact, isCurrentClassContact, isPeer } from './engine/school.ts';
import { isWorkAcquaintance, isWorkContact } from './engine/workplace.ts';
import type { SocialAction } from './engine/socialTypes.ts';
import type { Contact, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
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
  if (relationship && relationship.status !== 'interest') return romanceLabels[relationship.status];
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
  const partner = activeRomance(life)?.person;
  return {
    family: known.filter(({ id }) => isFamily(life, id)),
    partner: partner ? findContact(life, partner) : undefined,
    friends: known.filter((person) => !isFamily(life, person.id) && person.id !== partner && 'friend' in person && person.friend && !former(person)),
    acquaintances: known.filter((person) => person.alive && person.id !== partner && !isFamily(life, person.id) &&
      'friend' in person && !person.friend && !former(person) && (isWorkContact(person) ? isWorkAcquaintance(person) :
      person.role === 'Acquaintance' || romanceFor(life, person.id)?.status === 'interest' ||
      ('stage' in person && isPeer(person) && isCurrentClassContact(life, person)))),
    former: known.filter((person) => !isFamily(life, person.id) && former(person)),
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
    !isFamily(life, person.id) && !npcProfile(life, person).localPartner &&
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
const parentingIcons = { care: 'bottle', read: 'library', school: 'study', hobby: 'trophy', gift: 'gift', support: 'support', future: 'talk' } as const;

export function relationshipControls(life: Life, person: Contact) {
  const { id } = person;
  if (life.social.parents[id]?.includes('self')) return (Object.keys(parenting) as (keyof typeof parenting)[]).map((action) =>
    family(life, { type: 'parent-child', person: id, action }, parenting[action].label, parentingIcons[action],
      parenting[action].cost ? money(parenting[action].cost) : undefined));

  const status = romanceFor(life, id)?.status;
  const partner = activeRomance(life)?.person === id;
  if (partner) {
    const rows = (Object.keys(dateActivities) as (keyof typeof dateActivities)[]).map((action) =>
      love(life, { type: 'romance', person: id, action }, dateActivities[action].label, romanceIcons[action],
        dateActivities[action].cost ? money(dateActivities[action].cost) : undefined));
    if (status === 'dating') rows.push(love(life, { type: 'romance', person: id, action: 'propose' }, 'Propose Marriage', 'ring'));
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
    ...(status !== 'interest' ? [love(life, { type: 'romance', person: id, action: 'interest' }, 'Show Romantic Interest', 'loveLetter')] : []),
    love(life, { type: 'romance', person: id, action: 'ask' }, 'Ask on a Date', 'rose'),
  ];
}
