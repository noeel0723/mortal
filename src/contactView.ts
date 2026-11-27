import { genderLabels } from './data/veyra.ts';
import { employerById } from './data/employers.ts';
import { canStudyWith, contactGroup, giftCost, relationshipActivities, relationshipIssue } from './engine/interactions.ts';
import type { RelationshipActivity } from './engine/interactions.ts';
import { befriendIssue, friendshipEnergyCost, talkIssue } from './engine/simulation.ts';
import { canMakeFriend, isWorkContact } from './engine/workplace.ts';
import type { Action, Contact, Life } from './engine/types.ts';
import { money } from './i18n/en.ts';
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

export function contactRole(person: Contact) {
  return 'friend' in person && person.friend ? 'Friend' : person.role;
}

export function contactProfileRows(person: Contact) {
  return [
    { label: 'Relationship', value: contactRole(person) },
    { label: person.alive ? 'Age' : 'Age at death', value: person.age },
    { label: 'Gender identity', value: genderLabels[person.gender] },
    { label: 'City', value: person.city },
    { label: 'Occupation', value: person.occupation },
    ...(isWorkContact(person) ? [{ label: 'Employer', value: employerById.get(person.employerId)?.name ?? person.employerId }] : []),
    { label: 'Health', value: `${person.health}%` },
  ];
}

export function contactBondRows(person: Contact) {
  return Object.entries(person.bond).map(([key, value]) => ({ label: key.charAt(0).toUpperCase() + key.slice(1), value }));
}

type InteractionRow = { label: string; icon: Emoji; detail: string; issue: string | null; action: Action };

export function contactInteractions(life: Life, person: Contact) {
  const group = contactGroup(person);
  const blocked = life.character.causeOfDeath ? 'This life has already ended.' :
    life.pending ? 'Resolve the open decision in your journal.' : null;
  const rows: InteractionRow[] = [];
  if ('friend' in person && canMakeFriend(person) && !person.friend) {
    rows.push({ label: 'Become Friends', icon: 'relationships', detail: `Uses ${friendshipEnergyCost} energy. Adds them to Relationships.`,
      issue: blocked ?? befriendIssue(life, person.id), action: { type: 'befriend', person: person.id } });
  }
  rows.push({ label: 'Have a Conversation', icon: 'talk', detail: 'Uses 8 energy. Strengthens affection and trust.',
    issue: blocked ?? talkIssue(life, person.id), action: { type: 'talk', person: person.id } });

  for (const activity of Object.keys(relationshipActivities) as RelationshipActivity[]) {
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
