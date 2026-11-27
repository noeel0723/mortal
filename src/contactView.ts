import { genderLabels } from './data/veyra.ts';
import { employerById } from './data/employers.ts';
import { isSkillId, skills } from './data/skills.ts';
import { canShareHobby, sharedHobbies, sharedHobbyIssue } from './engine/hobbies.ts';
import { canStudyWith, contactGroup, giftCost, relationshipActivities, relationshipIssue } from './engine/interactions.ts';
import type { RelationshipActivity } from './engine/interactions.ts';
import { befriendIssue, friendshipEnergyCost, talkIssue } from './engine/simulation.ts';
import { canMakeFriend, coworkerFriendAffection, isWorkContact } from './engine/workplace.ts';
import type { Action, Contact, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
import { profileHealthRows } from './healthView.ts';
import { npcProfile } from './engine/npcs.ts';
import { isActiveRomance, romanceFor } from './engine/love.ts';
import { childParents, personalityLabels, relationshipOverview, socialRole } from './socialView.ts';
import type { Emoji } from './theme/tokens.ts';

const presentation: Record<RelationshipActivity, { label: string; icon: Emoji; detail: string }> = {
  'ask-allowance': { label: 'Ask for Pocket Money', icon: 'bank', detail: 'Ask for a small allowance once per year.' },
  'thank-parent': { label: 'Say Thank You', icon: 'thanks', detail: 'Show appreciation for their care.' },
  'family-time': { label: 'Spend Time Together', icon: 'together', detail: 'Share an afternoon and unwind together.' },
  'ask-advice': { label: 'Ask for Advice', icon: 'guidance', detail: 'Get their perspective on something on your mind.' },
  compliment: { label: 'Give a Compliment', icon: 'compliment', detail: 'Tell them something you appreciate about them.' },
  'hang-out': { label: 'Hang Out', icon: 'together', detail: 'Have fun together and get to know each other better.' },
  'study-together': { label: 'Study Together', icon: 'study', detail: 'Review classwork and improve your grades.' },
  gift: { label: 'Give a Gift', icon: 'gift', detail: `Buy them a small gift for ${money(giftCost)}.` },
  'academic-help': { label: 'Ask for Academic Help', icon: 'study', detail: 'Get feedback to improve your coursework.' },
  'mentor-guidance': { label: 'Ask for Guidance', icon: 'guidance', detail: 'Talk through your study goals and next steps.' },
  'thank-educator': { label: 'Say Thank You', icon: 'thanks', detail: 'Thank them for the support they give you.' },
  'work-break': { label: 'Spend Time Together', icon: 'coffee', detail: 'Get to know one another outside work.' },
  'discuss-work': { label: 'Discuss Work', icon: 'work', detail: 'Talk through a task and improve your performance.' },
  insult: { label: 'Insult', icon: 'insult', detail: 'Make a rude remark that harms trust and respect.' },
  'mess-with': { label: 'Mess With', icon: 'prank', detail: 'Play a prank that may strain the relationship.' },
};

export function contactRole(person: Contact, life?: Life) {
  if (life) return socialRole(life, person);
  return 'friend' in person && person.friend ? 'Friend' : person.role;
}

export function contactProfileRows(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  const parents = childParents(life, person);
  const child = life.social.children[person.id];
  const overview = relationshipOverview(life, person);
  return [
    { label: 'Relationship', value: contactRole(person, life) },
    ...(overview?.condition ? [{ label: 'Relationship condition', value: overview.condition }] : []),
    ...(overview?.years !== undefined ? [{ label: 'Years together', value: overview.years }] : []),
    ...(overview?.agreement ? [{ label: 'Agreement', value: overview.agreement }] : []),
    { label: person.alive ? 'Age' : 'Age at death', value: person.age },
    { label: 'Gender identity', value: genderLabels[person.gender] },
    { label: 'City', value: person.city },
    { label: 'Occupation', value: person.occupation },
    { label: 'Education', value: profile.education },
    { label: 'Personality', value: personalityLabels(life, person) },
    { label: 'Interests', value: profile.interests.map((interest) => isSkillId(interest) ? skills[interest].name : interest).join(', ') },
    ...(life.skills.children[person.id] ?? []).map(({ skill, proficiency }) => ({ label: skills[skill].name, value: `${proficiency}%` })),
    { label: 'Years known', value: life.year - profile.met },
    ...(profile.friendsSince !== null ? [{ label: 'Friends since', value: profile.friendsSince }] : []),
    ...(parents ? [{ label: 'Parents', value: parents }] : []),
    ...(child ? [{ label: child.adopted ? 'Adopted' : 'Born', value: child.year }] : []),
    ...(child ? [{ label: 'Learning', value: `${child.learning}%` }, { label: 'Wellbeing', value: `${child.wellbeing}%` },
      { label: 'Confidence', value: `${child.confidence}%` }] : []),
    ...(isWorkContact(person) ? [{ label: 'Employer', value: employerById.get(person.employerId)?.name ?? person.employerId }] : []),
    ...('hobby' in person ? [{ label: 'Shared hobby', value: person.hobby }] : []),
    { label: 'Health', value: `${person.health}%` },
    ...profileHealthRows(life, person.id),
  ];
}

export function contactHistory(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  const romance = romanceFor(life, person.id);
  return [...profile.memories, ...(romance?.history ?? [])]
    .filter((item, index, all) => all.findIndex((other) => other.year === item.year && other.text === item.text) === index)
    .sort((a, b) => a.year - b.year).slice(-8).reverse();
}

export function contactBondRows(person: Contact) {
  return Object.entries(person.bond).map(([key, value]) => ({ label: key.charAt(0).toUpperCase() + key.slice(1), value }));
}

type InteractionRow = { label: string; icon: Emoji; detail: string; issue: string | null; action: Action };

export function contactInteractions(life: Life, person: Contact) {
  const group = contactGroup(person);
  const blocked = life.character.causeOfDeath ? 'This life has already ended.' :
    life.pending ? 'Resolve the pending decision first.' : null;
  const rows: InteractionRow[] = [];
  const reconnect = npcProfile(life, person).formerFriend;
  if ('friend' in person && canMakeFriend(person) && (!person.friend || reconnect)) {
    const outcome = isWorkContact(person) && !person.friend ? `Starts the friendship at ${coworkerFriendAffection}% Affection.` : 'Adds them to Relationships.';
    rows.push({ label: reconnect ? 'Reconnect' : 'Become Friends', icon: 'relationships', detail: `Uses ${friendshipEnergyCost} energy. ${outcome}`,
      issue: blocked ?? befriendIssue(life, person.id), action: { type: 'befriend', person: person.id } });
  }
  if (person.age >= 3) rows.push({ label: 'Have a Conversation', icon: 'talk', detail: 'Uses 8 energy. Strengthens affection and trust.',
    issue: blocked ?? talkIssue(life, person.id), action: { type: 'talk', person: person.id } });
  if (canShareHobby(life, person)) for (const id of sharedHobbies(life, person)) {
    rows.push({ label: `Practice ${skills[id].name} Together`, icon: skills[id].icon, detail: 'Uses 6 energy. Develop a shared interest.',
      issue: sharedHobbyIssue(life, person, id), action: { type: 'share-hobby', person: person.id, skill: id } });
  }

  for (const activity of Object.keys(relationshipActivities) as RelationshipActivity[]) {
    if (life.social.children[person.id]) continue;
    if (activity === 'gift' && isActiveRomance(romanceFor(life, person.id))) continue;
    const rule = relationshipActivities[activity];
    if (!rule.groups.some((allowed) => allowed === group)) continue;
    if (activity === 'study-together' && !canStudyWith(life, person)) continue;
    if (activity === 'ask-allowance' && life.character.age >= 18) continue;
    if (activity === 'discuss-work' && (!isWorkContact(person) || person.employerId !== life.career.current?.employerId)) continue;
    const item = presentation[activity];
    const label = activity === 'hang-out' && life.character.age < 12 ? 'Play Together' : item.label;
    rows.push({ ...item, label, detail: `${item.detail} Uses ${rule.energy} energy.`,
      issue: blocked ?? relationshipIssue(life, person, activity), action: { type: 'interact', person: person.id, activity } });
  }
  return rows;
}
