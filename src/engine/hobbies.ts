import { libraryHobbies } from '../data/libraryEvents.ts';
import { isSkillId, skills } from '../data/skills.ts';
import type { SkillId } from '../data/skills.ts';
import { recordNotice, resultMeter } from './eventNotices.ts';
import { contactIssue } from './interactions.ts';
import { activeFor, inPersonIssue, meaningfulTime } from './relationships.ts';
import { clamp } from './journal.ts';
import { allContacts, isFamily, npcProfile, remember } from './npcs.ts';
import { incidentalPractice, openingIssue, skillRandom } from './skills.ts';
import type { Contact, Life } from './types.ts';

const links: Readonly<Record<string, readonly SkillId[]>> = {
  reading: ['writing', 'foreign-languages'], cooking: ['cooking'], hiking: ['running', 'fitness', 'photography'],
  music: ['guitar', 'piano', 'violin', 'drums', 'singing'], sketching: ['drawing', 'painting'],
  chess: ['chess'], gardening: ['cooking', 'photography'], photography: ['photography'],
  'reading mystery stories': ['writing'], 'drawing comics': ['drawing', 'writing'],
  'looking at star maps': ['mathematics', 'photography'], 'playing chess': ['chess'],
  'making paper crafts': ['drawing', 'painting'], 'reading about animals': ['writing'],
};

export function skillsForInterest(interest: string): readonly SkillId[] {
  const exact = Object.hasOwn(links, interest) ? links[interest] : undefined;
  return [...new Set([...(exact ?? []), ...(isSkillId(interest) ? [interest] : [])])];
}

export function personalizedLibraryHobbies(life: Life) {
  return libraryHobbies.filter((interest) => skillsForInterest(interest).some((id) => life.skills.hobbies.includes(id)));
}

export function sharedHobbies(life: Life, person: Contact) {
  if (!life.skills.hobbies.length) return [];
  const interests = npcProfile(life, person).interests;
  const contactSkills = [...interests, ...('hobby' in person ? [person.hobby] : [])].flatMap(skillsForInterest);
  return life.skills.hobbies.filter((id) => contactSkills.includes(id));
}

export function hobbyGroupContact(life: Life) {
  if (!life.skills.hobbies.length) return undefined;
  const matches = allContacts(life).filter((person) => !isFamily(life, person.id) && person.city === life.character.city &&
    Math.abs(person.age - life.character.age) <= 4 && !contactIssue(life, person) && sharedHobbies(life, person).length);
  if (!matches.length) return undefined;
  return matches[skillRandom(life.seed, `hobby-group:${life.year}`).integer(0, matches.length - 1)];
}

export function canShareHobby(life: Life, person: Contact) {
  const friends = 'friend' in person && person.friend && !npcProfile(life, person).formerFriend;
  const partner = activeFor(life, person.id);
  return friends || partner;
}

export function sharedHobbyIssue(life: Life, person: Contact, id: SkillId) {
  const blocked = openingIssue(life) ?? contactIssue(life, person);
  if (blocked) return blocked;
  if (!isSkillId(id) || !canShareHobby(life, person) || !sharedHobbies(life, person).includes(id)) return 'Choose a hobby you share with a friend or partner.';
  const meeting = inPersonIssue(life, person);
  if (meeting) return meeting;
  if (Math.min(person.age, life.character.age) < skills[id].age) return `Available from age ${skills[id].age}.`;
  if (life.usedActions.includes(`shared-hobby:${person.id}`)) return 'Available again next year.';
  if (life.character.attributes.energy < 6) return 'You need 6 energy.';
  return null;
}

export function spendTimeOnHobby(life: Life, person: Contact, id: SkillId) {
  const issue = sharedHobbyIssue(life, person, id);
  if (issue) return issue;
  const name = skills[id].name;
  const random = skillRandom(life.seed, `share:${person.id}:${id}:${life.year}`);
  const story = random.pick([`I spent an afternoon practicing ${name} with ${person.name}. We each shared a trick that helped.`,
    `${person.name} and I set ourselves a small ${name} challenge and compared how we did.`]);
  const bond = person.bond;
  const before = bond.affection;
  bond.affection = clamp(before + 4);
  bond.compatibility = clamp(bond.compatibility + 2);
  bond.familiarity = clamp(bond.familiarity + 2);
  life.usedActions.push(`shared-hobby:${person.id}`);
  incidentalPractice(life, id, 1, 45);
  remember(life, person, story);
  meaningfulTime(life, person, 'time', 5);
  recordNotice(life, 'community', 'A Shared Interest', story, { happiness: 3, stress: -2, energy: -6 }).meter =
    resultMeter('Affection', before, bond.affection);
  return null;
}
