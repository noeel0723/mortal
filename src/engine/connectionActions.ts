import { recordNotice } from './eventNotices.ts';
import { friendshipExperience } from './friendships.ts';
import { familyRelation } from './kinship.ts';
import { clamp, postTransaction } from './journal.ts';
import { ensureNpc, isFamily, npcProfile, npcRandom, remember } from './npcs.ts';
import { activeFor, communicationEnded, inPersonIssue, meaningfulTime, openConcern, recordConnectionPerspective, relationshipCondition,
  relationshipState, stateFor, takingSpace, trackConnection } from './relationships.ts';
import { findContact } from './school.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import type { Emoji } from '../theme/tokens.ts';
import type { Contact, Life } from './types.ts';

type Option = { label: string; topic: string; icon: Emoji; place?: 'local'; money?: 'give' | 'request' | 'toy' };
const options = {
  play: { label: 'Play Together', topic: 'a game we could play together', icon: 'together', place: 'local' },
  toy: { label: 'Ask for a Toy', topic: 'a toy I’d been hoping for', icon: 'gift', money: 'toy' },
  help: { label: 'Ask for Help', topic: 'something that had been difficult to manage on my own', icon: 'support' },
  comfort: { label: 'Seek Comfort', topic: 'what had been making me feel upset', icon: 'health' },
  permission: { label: 'Ask for Permission', topic: 'plans I wanted their permission for', icon: 'talk' },
  school: { label: 'Discuss School', topic: 'how school was going and where I wanted help', icon: 'study' },
  problems: { label: 'Discuss Personal Problems', topic: 'something personal I’d been worried about', icon: 'thoughts' },
  future: { label: 'Discuss Future Plans', topic: 'what I hoped to do in the next few years', icon: 'guidance' },
  rules: { label: 'Negotiate Household Rules', topic: 'which rules felt fair and where I needed more independence', icon: 'home' },
  university: { label: 'Seek University Advice', topic: 'whether university made sense for the life I wanted', icon: 'university' },
  career: { label: 'Seek Career Advice', topic: 'what I valued most when choosing a job', icon: 'career' },
  funding: { label: 'Ask for Financial Support', topic: 'help with my essential expenses', icon: 'bank', money: 'request' },
  move: { label: 'Discuss Moving Out', topic: 'what it would take for me to live independently', icon: 'home' },
  relationships: { label: 'Discuss Relationships', topic: 'the sort of relationships I wanted in my life', icon: 'relationships' },
  visit: { label: 'Visit Family', topic: 'what had changed since my last visit', icon: 'home', place: 'local' },
  invite: { label: 'Invite Them Over', topic: 'plans for a quiet get-together at my place', icon: 'calendar', place: 'local' },
  gather: { label: 'Plan a Family Gathering', topic: 'who we wanted to invite to a family gathering', icon: 'together' },
  retirement: { label: 'Discuss Retirement', topic: 'how they hoped to spend retirement', icon: 'retire' },
  care: { label: 'Offer Care', topic: 'what practical help would make the week easier', icon: 'medical', place: 'local' },
  appointment: { label: 'Accompany Them to an Appointment', topic: 'what they wanted to ask at their appointment', icon: 'medical', place: 'local' },
  living: { label: 'Discuss Living Arrangements', topic: 'where they would feel comfortable living and what support they needed', icon: 'home' },
  money: { label: 'Offer Financial Support', topic: 'a contribution toward their essential expenses', icon: 'bank', money: 'give' },
  emotional: { label: 'Offer Emotional Support', topic: 'what they needed from someone they trusted', icon: 'support' },
  advice: { label: 'Ask for Advice', topic: 'a decision I’d been weighing for a while', icon: 'guidance' },
  achievement: { label: 'Celebrate an Achievement', topic: 'something they were proud to have accomplished', icon: 'trophy' },
  family: { label: 'Discuss Family Matters', topic: 'how things had been going across our family', icon: 'family' },
  stories: { label: 'Listen to Family Stories', topic: 'family stories I hadn’t heard before', icon: 'history' },
  birthday: { label: 'Celebrate Their Birthday', topic: 'how they wanted to celebrate their birthday', icon: 'calendar', place: 'local' },
  deep: { label: 'Have a Deep Talk', topic: 'what mattered to us and how our priorities had changed', icon: 'talk' },
  secret: { label: 'Share Something in Confidence', topic: 'a personal worry I asked them to keep in confidence', icon: 'loveLetter' },
  reminisce: { label: 'Reminisce Together', topic: 'one of our favorite memories', icon: 'history' },
  reconnect: { label: 'Try to Reconnect', topic: 'whether we both wanted to start talking again', icon: 'phone' },
  'end-friendship': { label: 'End Friendship', topic: 'what I needed to move on from the friendship', icon: 'exit' },
  'mark-close': { label: 'Mark as Someone Close', topic: 'how much this relationship meant to me', icon: 'health' },
  'mark-distant': { label: 'Keep a Little Distance', topic: 'how much distance I wanted in the relationship', icon: 'location' },
  archive: { label: 'Archive Contact', topic: '', icon: 'files' },
  unarchive: { label: 'Restore Contact', topic: '', icon: 'person' },
  memorial: { label: 'Remember Them', topic: '', icon: 'remembrance' },
  'child-play': { label: 'Play with Your Child', topic: 'a game they chose for us', icon: 'together', place: 'local' },
  'basic-skills': { label: 'Teach Basic Skills', topic: 'taking turns, counting and putting things away', icon: 'study', place: 'local' },
  'child-comfort': { label: 'Provide Comfort', topic: 'what would help them feel safe and understood', icon: 'support' },
  'school-event': { label: 'Attend a School Event', topic: 'the school project they had been preparing', icon: 'school', place: 'local' },
  responsibility: { label: 'Teach Responsibility', topic: 'one thing they could look after on their own', icon: 'guidance' },
  'family-time': { label: 'Spend Family Time', topic: 'what we wanted our time together to look like', icon: 'family', place: 'local' },
  boundaries: { label: 'Discuss Boundaries', topic: 'the boundaries and freedoms that felt fair to both of us', icon: 'talk' },
  ambitions: { label: 'Support Ambitions', topic: 'the goal they cared most about pursuing', icon: 'guidance' },
  independence: { label: 'Encourage Independence', topic: 'what they felt ready to handle for themselves', icon: 'home' },
  'support-university': { label: 'Support University', topic: 'funding for their education', icon: 'university', money: 'give' },
  'help-housing': { label: 'Help Find Housing', topic: 'places they could afford and what they needed near home', icon: 'home' },
  wedding: { label: 'Celebrate Their Wedding', topic: 'how they felt about starting married life', icon: 'ring', place: 'local' },
  grandchildren: { label: 'Spend Time with Grandchildren', topic: 'what their children had been enjoying lately', icon: 'family', place: 'local' },
} as const satisfies Record<string, Option>;

export type ConnectionKind = keyof typeof options;
export type ConnectionAction = { type: 'connection'; person: string; action: ConnectionKind };

export function parentTendency(life: Life, person: Contact) {
  const { empathy, discipline, ambition, sociability, temperament, riskTolerance } = npcProfile(life, person).traits;
  return empathy < 35 && sociability < 45 ? 'Emotionally Distant' : empathy >= 68 && temperament < 50 ? 'Protective' :
    empathy >= 68 ? 'Supportive' : ambition >= 72 ? 'Demanding' : discipline >= 65 ? 'Strict' : riskTolerance >= 60 ? 'Permissive' : 'Supportive';
}

export function contactContexts(life: Life, person: Contact) {
  const { id } = person;
  const result: string[] = [];
  if (id.includes('neighborhood')) result.push('Neighborhood');
  if ('stage' in person) result.push(person.stage === 'undergraduate' || person.stage === 'postgraduate' || person.stage === 'vocational' ? 'University' : 'School');
  if ('employerId' in person) result.push('Workplace');
  if (id.includes('club-') || id.includes('hobbies') || Object.values(life.social.local?.memberships ?? {}).some(({ members }) => members.includes(id))) result.push('Community');
  if (id.includes('library') || id.includes('reading-')) result.push('Library');
  if (id.startsWith('npc-dating-') || id.startsWith('npc-hookup-')) result.push('Dating');
  if (npcProfile(life, person).introduced) result.push('Mutual Connections');
  if (isFamily(life, id)) result.push('Family');
  if (!result.length) result.push('Other Encounters');
  return result;
}

export function friendshipContexts(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  if (!('friend' in person) || !person.friend) return [];
  const contexts = contactContexts(life, person);
  const types = { Neighborhood: 'Neighborhood Friend', School: 'School Friend', University: 'University Friend', Workplace: 'Work Friend',
    Community: 'Hobby Friend', Library: 'Hobby Friend', Family: 'Family Friend' } as const;
  const result: string[] = contexts.flatMap((item) => Object.hasOwn(types, item) ? [types[item as keyof typeof types]] : []);
  if (profile.met - life.character.birthYear < 13) result.unshift('Childhood Friend');
  if (person.city !== life.character.city) result.push('Long-Distance Friend');
  return [...new Set(result)];
}

function roleOptions(life: Life, person: Contact): ConnectionKind[] {
  const type = familyRelation(life, person.id);
  const age = life.character.age;
  if (type === 'parent' || type === 'step-parent') {
    if (age < 13) return ['play', 'toy', 'help', 'comfort'];
    if (age < 18) return ['permission', 'school', 'problems', 'future', 'rules'];
    if (age < 26) return ['university', 'career', 'funding', 'move', 'relationships'];
    return person.age >= 65 ? ['care', 'appointment', 'living', 'emotional', 'visit'] : ['visit', 'money', 'invite', 'gather',
      ...(person.age >= 55 ? ['retirement' as const] : [])];
  }
  if (type === 'child') {
    if (person.age < 6) return ['child-play', 'basic-skills', 'child-comfort'];
    if (person.age < 13) return ['school-event', 'responsibility', 'family-time'];
    if (person.age < 18) return ['problems', 'advice', 'boundaries', 'ambitions', 'school', 'independence'];
    if (person.age < 25) return ['support-university', 'career', 'help-housing', 'money', 'future'];
    return ['visit', 'emotional', 'achievement',
      ...(life.social.unions?.some(({ people, married }) => married && people.includes(person.id)) ? ['wedding' as const] : []),
      ...(Object.values(life.social.parents).some((parents) => parents.includes(person.id)) ? ['grandchildren' as const] : [])];
  }
  if (type === 'sibling' || type === 'half-sibling' || type === 'step-sibling') return [
    ...(Math.min(age, person.age) < 16 ? ['play' as const] : ['visit' as const]),
    ...(person.age >= 6 && person.age < 18 ? ['school' as const] : []), 'advice', 'emotional', 'achievement', 'family', 'reconnect'];
  if (type) return ['visit', 'advice', 'stories', 'gather', 'birthday', 'care', 'reconnect'];
  const friend = 'friend' in person && person.friend && !npcProfile(life, person).formerFriend;
  if (friend) return ['deep', 'emotional', 'advice', 'secret', 'problems', 'money', 'help', 'reminisce', 'end-friendship'];
  return activeFor(life, person.id) ? [] : ['reconnect'];
}

export function connectionIssue(life: Life, person: Contact, kind: ConnectionKind) {
  if (!Object.hasOwn(options, kind) || life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  if (kind === 'memorial') return person.alive ? 'Available for someone who passed away.' : null;
  if (kind === 'archive' || kind === 'unarchive') {
    if (isFamily(life, person.id) || activeFor(life, person.id) || !person.alive) return 'This contact stays in your directory.';
    return null;
  }
  if (!person.alive || communicationEnded(life, person.id) || takingSpace(life, person.id)) return 'Respect their communication boundaries.';
  if (life.character.age < 3) return 'Available from age 3.';
  if (kind === 'mark-close' || kind === 'mark-distant') return null;
  if (!roleOptions(life, person).includes(kind)) return 'This interaction isn’t appropriate for this relationship.';
  const item: Option = options[kind];
  if (item.place && inPersonIssue(life, person)) return inPersonIssue(life, person);
  if (kind === 'play' && !isFamily(life, person.id)) return 'Available with family.';
  if (item.money === 'give' && (life.character.age < 18 || life.character.bank < 1200)) return 'Available to adults with $12 to contribute.';
  if ((item.money === 'request' || item.money === 'toy') && npcProfile(life, person).savings < (item.money === 'toy' ? 350 : 1200)) return 'They cannot cover this expense.';
  if (kind === 'secret' && (life.character.age < 13 || person.age < 13 || person.bond.trust < 50)) return 'Share this with a friend you trust.';
  if (kind === 'support-university' && !npcProfile(life, person).familyStudies) return 'Available when they are enrolled in a program.';
  if (kind === 'appointment' && person.health > 75 && !life.illnesses.some(({ patient }) => patient === person.id)) return 'They don’t need help with an appointment right now.';
  return null;
}

export function connectionControls(life: Life, person: Contact) {
  const archived = relationshipState(life, person.id)?.archived;
  const archiveActions: ConnectionKind[] = !isFamily(life, person.id) && !activeFor(life, person.id) ? [archived ? 'unarchive' : 'archive'] : [];
  const kinds: ConnectionKind[] = !person.alive ? ['memorial'] : communicationEnded(life, person.id) ? archiveActions :
    [...roleOptions(life, person), 'mark-close', 'mark-distant', ...archiveActions];
  const management: ConnectionKind[] = ['archive', 'unarchive', 'mark-close', 'mark-distant', 'end-friendship', 'reconnect'];
  const support: ConnectionKind[] = ['money', 'funding', 'emotional', 'help', 'care', 'appointment', 'support-university', 'comfort', 'child-comfort'];
  return kinds.filter((kind) => life.character.age >= 3 || kind === 'memorial' || kind === 'archive' || kind === 'unarchive').map((kind) => ({
    group: management.includes(kind) ? 'Relationship Management' : support.includes(kind) ? 'Support' :
      kind === 'memorial' ? 'Remembrance' : isFamily(life, person.id) ? 'Family Responsibilities' : 'Meaningful Conversations',
    label: options[kind].label, icon: options[kind].icon, issue: connectionIssue(life, person, kind),
    action: { type: 'connection', person: person.id, action: kind } as const,
  }));
}

export function applyConnection(life: Life, action: ConnectionAction) {
  const person = findContact(life, action.person);
  if (!person) return 'This person is unavailable.';
  const kind = action.action;
  const issue = connectionIssue(life, person, kind);
  if (issue) return issue;
  const { name, id } = person;
  const state = stateFor(life, id);
  if (kind === 'archive' || kind === 'unarchive') {
    if (kind === 'archive') state.archived = true;
    else delete state.archived;
    return null;
  }
  if (kind === 'memorial') {
    const grief = state.grief;
    const canHelp = !!grief && grief.lastMemorial !== life.year;
    if (canHelp) {
      state.grief = { ...grief, intensity: Math.max(0, grief.intensity - 12), lastMemorial: life.year };
    }
    const memory = npcProfile(life, person).memories.at(-1)?.text;
    recordNotice(life, 'family', 'In Remembrance', memory ? `I thought about ${name} and looked back on an old memory. ${memory}` :
      `I paused to remember ${name} in my own way.`, canHelp ? { stress: -4, happiness: 2 } : undefined);
    return null;
  }
  if (kind === 'mark-close' || kind === 'mark-distant') {
    if (!state.perspective) recordConnectionPerspective(life, person, 0);
    state.perspective = { ...state.perspective!, player: kind === 'mark-close' ? 92 : 25 };
    recordNotice(life, 'community', 'How I Feel', `I ${kind === 'mark-close' ? 'considered' : 'wanted a little more distance from'} ${name}${kind === 'mark-close' ? ' one of the closest people in my life' : ''}.`);
    return null;
  }
  const profile = ensureNpc(life, person);
  if (kind === 'end-friendship' && 'friend' in person) {
    profile.formerFriend = true;
    profile.friendship = { stage: 'former', experiences: profile.friendship?.experiences ?? 0, changed: life.year };
    remember(life, person, 'I chose to step away from the friendship.');
    recordNotice(life, 'community', 'A Friendship Ended', `I told ${name} I wanted to step away from our friendship.`);
    return null;
  }
  const item: Option = options[kind];
  const occasion = { key: `connection:${kind}`, location: item.place ?? 'remote', demanding: !!item.place } as const;
  const unavailable = availability(life, person, occasion);
  const result = contextualOutcome(life, person, occasion);
  if (unavailable) {
    recordNotice(life, 'community', 'Maybe Another Time', `${name} said this wasn’t a good time. ${unavailable.reason}`);
    return null;
  }
  const stance = state.perspective?.willingness ?? person.bond.trust;
  if ((item.money || kind === 'reconnect') && (stance < 34 || result.weight < 0)) {
    recordNotice(life, 'community', 'Different Expectations', `${name} listened, then told me they weren’t ready to agree.`);
    return null;
  }
  if (item.money === 'give') profile.savings += -postTransaction(life, `Financial support for ${name}`, -1200, 'relationships');
  else if (item.money === 'request') profile.savings -= postTransaction(life, `Financial support from ${name}`, 1200, 'relationships');
  else if (item.money === 'toy') profile.savings -= 350;
  if (kind === 'secret' && !state.confidence) state.confidence = { shared: life.year };
  if (kind === 'reconnect') {
    delete state.archived;
    if (profile.formerFriend) {
      profile.formerFriend = false;
      if (profile.friendship) profile.friendship = { ...profile.friendship, stage: 'casual', changed: life.year };
    }
  }
  const family = familyRelation(life, id);
  let followup: string = result.note;
  if (family === 'parent' || family === 'step-parent') {
    const tendency = parentTendency(life, person);
    if (['rules', 'career', 'school', 'move', 'future'].includes(kind)) {
      followup = tendency === 'Demanding' || tendency === 'Strict' ? 'They explained what they expected of me. We gave each other time to think.' :
        tendency === 'Protective' ? 'They asked how I would stay safe, then listened to what I wanted.' : 'They listened and encouraged me to make a plan I believed in.';
    }
  }
  const sibling = family === 'sibling' || family === 'half-sibling' || family === 'step-sibling';
  if (sibling && (kind === 'family' || kind === 'achievement')) {
    if (result.weight < -.28 && profile.traits.ambition > 60 && person.bond.resentment >= 16) {
      followup = 'They said that being compared with me had made it harder to feel heard at home.';
      openConcern(life, id, 'argument', 40);
    } else if (result.weight > .35) followup = 'We traded stories about growing up and gave each other credit for what had changed.';
  }
  const child = life.social.children[id];
  if (child) {
    const response = result.weight * (profile.traits.discipline + 65) / 140;
    child.confidence = clamp(child.confidence + Math.round(response * 4));
    child.wellbeing = clamp(child.wellbeing + Math.round(response * 3));
    if (['school-event', 'school', 'basic-skills', 'support-university'].some((item) => item === kind)) {
      child.learning = clamp(child.learning + Math.round(response * 4));
    }
  }
  const story = `I spoke with ${name} about ${item.topic}. ${followup}`;
  trackConnection(life, id);
  person.bond.trust = clamp(person.bond.trust + Math.round(result.weight * 3));
  if (result.weight < -.4) openConcern(life, id, 'argument', 34);
  if (result.weight > 0) meaningfulTime(life, person, 'support', 4);
  else recordConnectionPerspective(life, person, Math.round(result.weight * 4));
  if (kind === 'emotional' && result.weight > .35) easeGrief(life, 4);
  remember(life, person, story, result.weight < -.4);
  if (!family && kind !== 'reconnect') friendshipExperience(life, person, result.weight);
  recordNotice(life, isFamily(life, id) ? 'family' : 'community', item.label, story);
  return null;
}

export function easeGrief(life: Life, amount: number) {
  for (const state of Object.values(life.social.relationships)) {
    if (state.grief) state.grief = { ...state.grief, intensity: Math.max(0, state.grief.intensity - amount) };
  }
}

export function advanceConnections(life: Life) {
  easeGrief(life, 12);
  for (const [id, state] of Object.entries(life.social.relationships)) {
    const person = findContact(life, id);
    if (!person?.alive) continue;
    const profile = npcProfile(life, person);
    if (state.perspective && life.year - (state.lastMeaningful ?? profile.lastInteraction) > 3 && state.perspective.updated < life.year) {
      recordConnectionPerspective(life, person, profile.traits.loyalty >= 70 ? -1 : -3);
    }
    if (state.confidence && !state.confidence.recipient && life.year > state.confidence.shared && profile.traits.loyalty < 38 &&
      npcRandom(life, `disclosure:${id}`, life.year).next() < .14) {
      const edge = life.social.graph?.find(({ people, type, trust }) => people.includes(id) && type === 'close' && trust >= 65);
      const other = findContact(life, edge?.people.find((person) => person !== id));
      if (!other?.alive || communicationEnded(life, id) || communicationEnded(life, other.id) || person.city !== other.city) continue;
      state.confidence = { ...state.confidence, recipient: other.id };
      if ('friend' in other && other.friend) {
        openConcern(life, id, 'argument', 43);
        recordConnectionPerspective(life, person, -6);
        const text = `${other.name} told me that ${person.name} had shared something I’d asked them to keep private.`;
        remember(life, person, text, true);
        recordNotice(life, 'community', 'A Confidence Shared', text);
      }
    }
  }
}

export function perceivedConnection(life: Life, person: Contact) {
  const state = relationshipState(life, person.id);
  const viewpoint = state?.perspective;
  if (viewpoint?.player === undefined || !person.alive || relationshipCondition(life, person) === 'Estranged') return undefined;
  if (viewpoint.player - viewpoint.npc >= 28) return 'I seem more invested than they are.';
  if (viewpoint.npc - viewpoint.player >= 28) return 'They seem more invested than I am.';
  return 'Our feelings seem mutual.';
}
