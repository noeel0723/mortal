import { jobById } from '../data/jobs.ts';
import { programById } from '../data/academics.ts';
import { cities, genders } from '../data/veyra.ts';
import { allContacts, newPeopleLimit } from '../engine/npcs.ts';
import { familyRelation } from '../engine/kinship.ts';
import { validNpcProgram } from '../engine/npcQualifications.ts';
import { isActiveRomance } from '../engine/love.ts';
import { adoptionApplicationFee } from '../engine/adoption.ts';
import { contributions, custodyArrangements } from '../engine/householdTypes.ts';
import { datingGoals } from '../engine/dating.ts';
import { discoveryEvent, validDatingState } from '../engine/datingDiscovery.ts';
import { validSearchMatchId } from '../engine/loveSearch.ts';
import { protectionEvent } from '../engine/reproductiveHealth.ts';
import { validPendingMeeting } from '../engine/meetings.ts';
import { canShareInvitation, isIntimacyContact, isIntimacyEvent } from '../engine/intimacy.ts';
import { validateRelationships } from './relationshipCodec.ts';
import { validateFriendship, validateLocalSocial } from './localSocialCodec.ts';
import { inPersonIssue, knownRelationship, visibleConcerns } from '../engine/relationships.ts';
import { employment, npcEducation, romanceStatuses, socialEvents, traits } from '../engine/socialTypes.ts';
import { canMakeFriend } from '../engine/workplace.ts';
import type { Life } from '../engine/types.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;

export function validateSocial(life: Life, savedPerson: (value: unknown) => value is Record<string, unknown>) {
  const social = life.social;
  const { year, character } = life;
  const date = (value: unknown) => integer(value, character.birthYear, year);
  const amount = (value: unknown) => integer(value, 0, Number.MAX_SAFE_INTEGER);
  const history = (value: unknown, length: number) => Array.isArray(value) && value.length <= length &&
    value.every((item: unknown) => record(item) && date(item.year) && typeof item.text === 'string');
  if (!record(social) || !Array.isArray(social.people) || social.people.length > newPeopleLimit ||
    !social.people.every((person: unknown) => savedPerson(person) && typeof person.id === 'string' &&
      /^npc-[a-z0-9-]+$/.test(person.id) && ['Sibling', 'Grandparent', 'Child', 'Relative', 'Acquaintance'].includes(String(person.role)) &&
      typeof person.friend === 'boolean') || !record(social.profiles) || !record(social.parents) || !record(social.children) ||
      !Array.isArray(social.romances)) return false;
  const contacts = allContacts(life);
  const ids = new Set(contacts.map(({ id }) => id));
  if (ids.has('self') || ids.size !== contacts.length || Object.keys(social.profiles).length !== ids.size) return false;
  if (!validateRelationships(life, ids)) return false;
  if (!validateLocalSocial(life, ids)) return false;
  if (!validDatingState(life)) return false;
  for (const person of contacts) {
    const { id } = person;
    if (!Object.hasOwn(social.profiles, id)) return false;
    const profile = social.profiles[id];
    if (!record(profile) || !record(profile.traits) || !traits.every((trait) => integer(profile.traits[trait], 0, 100)) ||
      !Array.isArray(profile.interests) || profile.interests.length !== 2 || !profile.interests.every((item) => typeof item === 'string') ||
      !Array.isArray(profile.preferences) || !profile.preferences.length || !profile.preferences.every((item) => genders.includes(item)) ||
      (profile.datingGoal !== undefined && (typeof profile.datingGoal !== 'string' || !Object.hasOwn(datingGoals, profile.datingGoal))) ||
      (profile.casualContact !== undefined && profile.casualContact !== 'connected' && profile.casualContact !== 'closed') ||
      (profile.localHousehold !== undefined && !['alone', 'shared', 'family'].includes(profile.localHousehold)) ||
      (profile.introduced !== undefined && profile.introduced !== true) ||
      !validateFriendship(profile.friendship, life, 'friend' in person && person.friend, profile.formerFriend) ||
      !npcEducation.includes(profile.education) || !employment.includes(profile.status) ||
      (profile.educationProgram !== undefined && !validNpcProgram(profile.educationProgram, profile.education, year - profile.born)) ||
      (profile.familyStudies !== undefined && (!record(profile.familyStudies) || typeof profile.familyStudies.program !== 'string' ||
        !date(profile.familyStudies.started) || profile.familyStudies.started < profile.born + 18 ||
        !['vocational', 'undergraduate'].includes(programById.get(profile.familyStudies.program)?.level ?? '') ||
        profile.familyStudies.graduation !== profile.familyStudies.started + programById.get(profile.familyStudies.program)!.duration ||
        profile.familyStudies.graduation <= year)) ||
      (profile.job !== null && !jobById.has(profile.job)) ||
      ![profile.income, profile.expenses, profile.savings, profile.commitments, profile.experience, profile.conflicts].every(amount) ||
      !integer(profile.born, 1800, year) || !date(profile.met) || !date(profile.lastInteraction) || profile.lastInteraction < profile.met ||
      (profile.friendsSince !== null && (!date(profile.friendsSince) || profile.friendsSince < profile.met)) ||
      typeof profile.formerFriend !== 'boolean' || !history(profile.memories, 12) ||
      (profile.localPartner !== null && (!ids.has(profile.localPartner) || profile.localPartner === id)) ||
      (profile.movedFrom !== undefined && !cities.includes(profile.movedFrom))) return false;
  }
  const exists = (id: string) => id === 'self' || ids.has(id);
  const born = (id: string) => id === 'self' ? character.birthYear : social.profiles[id]!.born;
  const gender = (id: string) => id === 'self' ? character.gender : contacts.find((person) => person.id === id)?.gender;
  const mothers = new Set<string>();
  const pregnancies = social.pregnancies;
  if (pregnancies !== undefined && (!Array.isArray(pregnancies) || pregnancies.length + Object.keys(social.children).length > 4 ||
    pregnancies.length + social.people.length > newPeopleLimit || !pregnancies.every((item) => {
      if (!record(item) || typeof item.mother !== 'string' || typeof item.father !== 'string' ||
        (item.mother === 'self') === (item.father === 'self') || gender(item.mother) !== 'woman' || gender(item.father) !== 'man' ||
        year - born(item.mother) < 18 || year - born(item.mother) > 45 || year - born(item.father) < 18 ||
        item.dueYear !== year + 1 || (item.name !== undefined && (typeof item.name !== 'string' || !/^\p{L}[\p{L}\p{M} '’.-]{0,27}$/u.test(item.name))) ||
        mothers.has(item.mother) || character.causeOfDeath) return false;
      mothers.add(item.mother);
      return true;
    }))) return false;
  if (!Array.isArray(social.parents.self) || social.parents.self.length !== life.family.length ||
    !life.family.every(({ id }) => social.parents.self!.includes(id))) return false;
  for (const [child, parents] of Object.entries(social.parents)) {
    const childRecord = social.children[child];
    const parentYear = childRecord?.adopted === true && date(childRecord.year) ? childRecord.year : exists(child) ? born(child) : 0;
    if (!exists(child) || !Array.isArray(parents) || parents.length === 0 || parents.length > 2 || new Set(parents).size !== parents.length ||
      !parents.every((parent) => typeof parent === 'string' && parent !== child && exists(parent) && parentYear - born(parent) >= 18)) return false;
  }
  const checkedAncestry = new Set<string>();
  const activeAncestry = new Set<string>();
  function acyclic(id: string): boolean {
    if (checkedAncestry.has(id)) return true;
    if (activeAncestry.has(id)) return false;
    activeAncestry.add(id);
    if (!(social.parents[id] ?? []).every(acyclic)) return false;
    activeAncestry.delete(id);
    checkedAncestry.add(id);
    return true;
  }
  if (!Object.keys(social.parents).every(acyclic)) return false;
  const unionPeople = new Set<string>();
  if (social.unions !== undefined && (!Array.isArray(social.unions) || social.unions.length > 14 || !social.unions.every((union) => {
    if (!record(union) || !date(union.since) || !Array.isArray(union.people) || union.people.length !== 2 ||
      new Set(union.people).size !== 2 || union.people.some((id) => !ids.has(id) || unionPeople.has(id) || union.since - born(id) < 18) ||
      (union.married !== undefined && (!date(union.married) || union.married < union.since))) return false;
    union.people.forEach((id) => unionPeople.add(id));
    return true;
  }))) return false;
  for (const [id, child] of Object.entries(social.children)) {
    if (!social.people.some((person) => person.id === id && person.role === 'Child') ||
      !record(child) || !date(child.year) || child.year < born(id) || typeof child.adopted !== 'boolean' || typeof child.supportEnded !== 'boolean' ||
      ![child.wellbeing, child.learning, child.confidence].every((value) => integer(value, 0, 100)) ||
      (child.atHome !== undefined && (typeof child.atHome !== 'boolean' || year - born(id) < 18)) ||
      (child.driving !== undefined && (!Array.isArray(child.driving) || new Set(child.driving).size !== child.driving.length ||
        child.driving.some((kind) => kind !== 'cars' && kind !== 'motorcycles') || year - born(id) < 15)) ||
      !social.parents[id]?.includes('self') || (!child.adopted && social.parents[id]?.length !== 2)) return false;
  }
  const seen = new Set<string>();
  let commitments = 0;
  for (const entry of social.romances) {
    if (!record(entry) || !ids.has(entry.person) || seen.has(entry.person) || !romanceStatuses.includes(entry.status) ||
      !date(entry.started) || entry.started < character.birthYear + 18 || entry.started < born(entry.person) + 18 ||
      !history(entry.history, 30) ||
      ![entry.engagement, entry.wedding, entry.ended].every((value) => value === null || (date(value) && value >= entry.started)) ||
      (entry.wedding !== null && (entry.engagement === null || entry.wedding < entry.engagement)) ||
      (entry.status === 'married' && entry.wedding === null) || (entry.status === 'engaged' && entry.engagement === null) ||
      (['contact-ended', 'broken-up', 'divorced', 'widowed'].includes(entry.status) !== (entry.ended !== null))) return false;
    seen.add(entry.person);
    if ((entry.status === 'engaged' || entry.status === 'married') && ++commitments > 1) return false;
  }
  for (const person of social.people) {
    if (person.role === 'Child' && !Object.hasOwn(social.children, person.id)) return false;
    if (person.role === 'Sibling' && !['sibling', 'half-sibling'].includes(familyRelation(life, person.id) ?? '')) return false;
    if (person.role === 'Grandparent' && !social.parents.self.some((id) => social.parents[id]?.includes(person.id))) return false;
  }
  if (social.romances.some(({ person, ended }) => ended === null && familyRelation(life, person))) return false;
  const household = social.household;
  if (household !== undefined && (!record(household) || !social.romances.some(({ person, status }) => person === household.spouse && status === 'married') ||
    !['together', 'separate'].includes(household.living) || !contributions.includes(household.contribution) ||
    (household.duties !== undefined && !['shared', 'player', 'partner'].includes(household.duties)) ||
    !record(household.savings) || !amount(household.savings.player) || !amount(household.savings.partner) ||
    (household.familyPlan !== undefined && (!record(household.familyPlan) || !date(household.familyPlan.year) ||
      !['ready', 'wait'].includes(household.familyPlan.answer))))) return false;
  if (social.jointTitles !== undefined) {
    const titles = social.jointTitles;
    if (!Array.isArray(titles) || titles.length > 12 || !titles.every((title) => record(title) && ids.has(title.partner) &&
      life.property.owned.some(({ ownershipId, sale }) => ownershipId === title.asset && !sale) &&
      integer(title.basis, 1, Number.MAX_SAFE_INTEGER) && integer(title.contribution, 1, title.basis)) ||
      new Set(titles.map(({ asset }) => asset)).size !== titles.length) return false;
  }
  if (social.custody !== undefined && (!record(social.custody) || !Object.entries(social.custody).every(([child, arrangement]) =>
    Object.hasOwn(social.children, child) && record(arrangement) && social.parents[child]?.includes(arrangement.other) &&
    arrangement.other !== 'self' && custodyArrangements.includes(arrangement.residence) && date(arrangement.since) &&
    arrangement.since >= social.children[child]!.year))) return false;
  const application = social.adoption;
  if (application !== undefined && (!record(application) || application.applied !== year || application.due !== year + 1 ||
    typeof application.candidate !== 'string' || !new RegExp(`^npc-adoption-${year}-[1-5]$`).test(application.candidate) ||
    ids.has(application.candidate) || !cities.includes(application.city) || application.fee !== adoptionApplicationFee ||
    (application.partner !== undefined && !ids.has(application.partner)))) return false;
  if (life.pending === protectionEvent ? !isIntimacyEvent(social.pendingEncounter ?? null) : social.pendingEncounter !== undefined) return false;
  const encounter = life.pending === protectionEvent ? social.pendingEncounter! : life.pending;
  if (encounter !== 'social-threesome' && social.pendingGuest !== undefined) return false;
  if (!validPendingMeeting(life)) return false;
  if (life.pending === discoveryEvent) return true;
  if (life.pending === 'social-meeting') return !character.causeOfDeath;
  if (!socialEvents.some((event) => event === life.pending)) return social.pendingPerson === null;
  const participant = contacts.find(({ id, alive }) => id === social.pendingPerson && alive);
  if (!participant) return false;
  if (life.pending === 'social-friendship') return character.age >= 6 && 'friend' in participant && !participant.friend && canMakeFriend(participant);
  if (isIntimacyEvent(encounter)) {
    if (character.causeOfDeath || character.age < 18 || participant.age < 18 || inPersonIssue(life, participant)) return false;
    if (encounter === 'social-hookup') {
      return validSearchMatchId(participant.id, year, 'hookup') && participant.role === 'Acquaintance' && !seen.has(participant.id) &&
        social.profiles[participant.id]!.preferences.includes(character.gender);
    }
    if (!isIntimacyContact(life, participant)) return false;
    if (encounter === 'social-make-love') return true;
    const guest = contacts.find(({ id }) => id === social.pendingGuest);
    return !!guest && !inPersonIssue(life, guest) && isIntimacyContact(life, guest) && canShareInvitation(life, participant, guest);
  }
  if (life.pending === 'social-affair') {
    const partners = social.romances.filter(isActiveRomance);
    return partners.some(({ person }) => person === participant.id) &&
      (visibleConcerns(life, participant.id).some((entry) => entry.breach?.discovered) ||
        contacts.some(({ id, alive }) => alive && id !== participant.id && partners.some(({ person }) => person === id)));
  }
  if (life.pending === 'social-dating-match' || life.pending === 'social-casual-match') {
    return character.age >= 18 && participant.age >= 18 && validSearchMatchId(participant.id, year, 'dating') &&
      !seen.has(participant.id) && social.profiles[participant.id]!.preferences.includes(character.gender);
  }
  if (life.pending === 'social-proposal') {
    return commitments === 0 && social.romances.some(({ person, status }) => person === participant.id && (status === 'dating' || status === 'committed'));
  }
  if (life.pending === 'social-expectations' || life.pending === 'social-space') {
    return participant.age >= 18 && social.romances.some((entry) => entry.person === participant.id && isActiveRomance(entry));
  }
  if (life.pending === 'social-concern') return knownRelationship(life, participant) && visibleConcerns(life, participant.id).length > 0;
  if (life.pending === 'social-reconnect') return social.profiles[participant.id]!.formerFriend;
  return true;
}
