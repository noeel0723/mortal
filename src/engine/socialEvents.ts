import { socialEventCatalog } from '../data/socialEvents.ts';
import { answerDatingDiscovery, discoveryEvent } from './datingDiscovery.ts';
import { datingIntent } from './dating.ts';
import { recordNotice } from './eventNotices.ts';
import { acceptFriendship, friendshipExperience, friendshipWillingness } from './friendships.ts';
import { answerIntimacy, isIntimacyEvent, prepareIntimacy } from './intimacy.ts';
import { clamp, record } from './journal.ts';
import { activeRomances, canPropose, changeRomance, endRomance, romanceFor, romanceHistory } from './love.ts';
import { discardSearchMatch } from './loveSearch.ts';
import { answerMeeting } from './meetings.ts';
import { allContacts, ensureNpc, npcProfile, npcRandom, remember } from './npcs.ts';
import { barrierFee, protectionEvent } from './reproductiveHealth.ts';
import { agreementFor, agreementPhrase, attraction, boundaryEvidence, careIssue, concernLabels, earlyConnection, inPersonIssue, knownRelationship, meaningfulTime, negotiateAgreement, noteAgreementTalk, relationshipMemory,
  relationshipSatisfaction, relationshipState, setAgreement, visibleConcerns } from './relationships.ts';
import { findContact } from './school.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import { canMakeFriend } from './workplace.ts';
import type { IntimacyAction, SocialEventId } from './socialTypes.ts';
import type { Contact, Life, LifeEvent } from './types.ts';

export function isSocialEvent(id: string) {
  return socialEventCatalog.some((event) => event.id === id);
}

export function socialEventText(life: Life, event: LifeEvent) {
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  if (event.id === 'social-affair' && person) {
    const evidence = visibleConcerns(life, person.id).find((entry) => entry.breach?.discovered)?.breach?.evidence.at(-1);
    const contact = evidence ? findContact(life, evidence.who) : undefined;
    if (evidence && contact) {
      const incident = evidence.kind === 'date' ? 'a date' : evidence.kind === 'commitment' ? 'a relationship agreement' : 'a private encounter';
      const names = [contact.name, ...(evidence.others ?? []).map((id) => findContact(life, id)?.name).filter(Boolean)].join(' and ');
      return `${person.name} brought up ${incident} involving ${names}. It crossed the exclusive agreement we made, and they asked me to explain.`;
    }
    const other = activeRomances(life).filter((entry) => entry.person !== person.id)
      .map((entry) => findContact(life, entry.person)).find((contact) => contact?.alive);
    if (other) return `${person.name} found out I was also dating ${other.name}. ${person.name} told me our relationship was over. How will I respond?`;
  }
  if (!person) return event.text;
  if (event.id === 'social-expectations') return `${person.name} asked if we could agree to ${agreementPhrase(suggestedAgreement(life, person))}.`;
  if (event.id === 'social-concern') {
    const concern = visibleConcerns(life, person.id)[0];
    if (concern) return `${person.name} wants to talk about ${concernLabels[concern.kind].toLowerCase()}.`;
  }
  if (event.id === 'social-make-love') return `I want to ask ${person.name} to spend the night together. ${event.text}`;
  if (event.id === 'social-threesome') {
    const guest = findContact(life, life.social.pendingGuest);
    return guest ? `I'm thinking about inviting ${person.name} and ${guest.name}. I’ll only go ahead if both of them agree.` : event.text;
  }
  const identity = event.id === 'social-dating-match' || event.id === 'social-casual-match' || event.id === 'social-hookup' ?
    `${person.name} (age ${person.age})` : person.name;
  return `${identity} ${event.text}`;
}

export function applyIntimacy(life: Life, action: IntimacyAction) {
  const invitation = prepareIntimacy(life, action);
  if (typeof invitation === 'string') return invitation;
  if (!invitation) return null;
  if (invitation.guest) life.social.pendingGuest = invitation.guest;
  queueSocialEvent(life, invitation.event, invitation.person);
  return null;
}

function queueSocialEvent(life: Life, id: SocialEventId, person: string) {
  const event = socialEventCatalog.find((item) => item.id === id)!;
  life.social.pendingPerson = person;
  life.pending = id;
  if (!life.seen.includes(id)) life.seen.push(id);
  record(life, event.category, socialEventText(life, event));
}

export function offerSocialEvent(life: Life) {
  if (life.pending || life.character.age < 8 || life.character.causeOfDeath) return;
  const romances = activeRomances(life).filter(({ person }) => findContact(life, person)?.alive);
  for (const romance of romances) {
    const person = findContact(life, romance.person)!;
    const evidence = relationshipState(life, person.id)?.conflicts.find((entry) =>
      entry.state !== 'resolved' && entry.breach?.unseen);
    const discovery = npcRandom(life, `romance-discovery:${person.id}`, life.year);
    if (evidence?.breach && discovery.next() * 100 < Math.min(90, 24 + evidence.severity * .31 + evidence.breach.count * 6)) {
      evidence.breach.discovered = true;
      evidence.breach.unseen = false;
      evidence.updated = life.year;
      queueSocialEvent(life, 'social-affair', person.id);
      return;
    }
    const concern = visibleConcerns(life, person.id)[0];
    const profile = npcProfile(life, person);
    const dissatisfied = relationshipSatisfaction(life, person);
    if (concern && concern.severity >= 60 && concern.year < life.year && dissatisfied < 56 &&
      discovery.next() * 100 < 15 + (56 - dissatisfied) * .8 + (100 - profile.traits.loyalty) * .16) {
      if (dissatisfied >= 30 && life.year - concern.year < 4 && relationshipState(life, person.id)?.apartUntil !== life.year) {
        queueSocialEvent(life, 'social-space', person.id);
        return;
      }
      const text = `${person.name} said ${concernLabels[concern.kind].toLowerCase()} had gone unresolved for too long. They decided to end our relationship.`;
      const settlement = endRomance(life, person, text, concern.kind === 'neglect' ? 'neglect' : concern.kind === 'boundary' ? 'betrayal' : 'conflict');
      remember(life, person, text);
      recordNotice(life, 'community', 'Their Decision', text, { bank: -settlement, happiness: -7, stress: 4 }, 'relationships');
      return;
    }
  }
  const agreementTalk = romances.map(({ person }) => findContact(life, person)!)
    .find((partner) => wantsAgreementTalk(life, partner));
  if (agreementTalk) {
    queueSocialEvent(life, 'social-expectations', agreementTalk.id);
    return;
  }
  const random = npcRandom(life, 'social-event', life.year);
  if (random.next() >= .23) return;
  const possibilities: { person: string; event: SocialEventId }[] = [];
  for (const romance of romances) {
    const partner = findContact(life, romance.person);
    if (partner?.alive) {
      const profile = ensureNpc(life, partner);
      if (canPropose(life, romance) && !inPersonIssue(life, partner) && life.year > romance.started && partner.bond.trust >= 55 &&
        random.next() < (profile.traits.confidence + profile.traits.loyalty + datingIntent(life, partner, 'engage').adjustment) / 300) {
        possibilities.push({ person: partner.id, event: 'social-proposal' });
      }
      if (life.year - profile.lastInteraction >= 2 || partner.bond.resentment >= 32) possibilities.push({ person: partner.id, event: 'social-time' });
      if (romance.status === 'married' && profile.savings < 20000) possibilities.push({ person: partner.id, event: 'social-finances' });
    }
  }
  const parent = life.family.find((person) => person.alive && ensureNpc(life, person).savings < 16000);
  if (parent && life.character.age >= 18 && life.character.bank >= 1200) possibilities.push({ person: parent.id, event: 'social-support' });
  const child = life.social.people.find((person) => person.role === 'Child' && person.alive && person.age >= 6 && person.age < 18);
  if (child) possibilities.push({ person: child.id, event: 'social-school' });
  const friend = allContacts(life).find((person) => 'friend' in person && person.friend && person.alive &&
    !ensureNpc(life, person).formerFriend && person.city === life.character.city &&
    !availability(life, person, { key: 'invite-dinner', location: 'local', demanding: true }) &&
    npcRandom(life, `invite:${person.id}`, life.year).next() < ensureNpc(life, person).traits.sociability / 120);
  if (friend) possibilities.push({ person: friend.id, event: 'social-dinner' });
  const proposer = allContacts(life).find((person) => person.alive && 'friend' in person && !person.friend && canMakeFriend(person) &&
    person.city === life.character.city && person.bond.familiarity >= 25 && friendshipWillingness(life, person) >= 51 &&
    !availability(life, person, { key: 'friendship-offer', location: 'local' }) &&
    npcRandom(life, `friendship-offer:${person.id}`, life.year).next() < npcProfile(life, person).traits.sociability / 260);
  if (proposer) possibilities.push({ person: proposer.id, event: 'social-friendship' });
  const concerned = allContacts(life).find((person) => person.alive && person.age >= 18 && knownRelationship(life, person) && !earlyConnection(life, person.id) &&
    visibleConcerns(life, person.id).some((entry) => entry.severity >= 33));
  if (concerned && life.character.age >= 18) possibilities.push({ person: concerned.id, event: 'social-concern' });
  const former = allContacts(life).find((person) => person.alive && person.age >= 18 && npcProfile(life, person).formerFriend &&
    person.bond.affection >= 16 && life.year - npcProfile(life, person).lastInteraction >= 3);
  if (former && life.character.age >= 18) possibilities.push({ person: former.id, event: 'social-reconnect' });
  const selection = possibilities[random.integer(0, Math.max(0, possibilities.length - 1))];
  if (!selection) return;
  queueSocialEvent(life, selection.event, selection.person);
}

function suggestedAgreement(life: Life, person: Contact) {
  const profile = npcProfile(life, person);
  return profile.datingGoal === 'casual' || (profile.datingGoal !== 'marriage' && profile.traits.riskTolerance > profile.traits.loyalty + 16) ?
    'non-exclusive' as const : 'exclusive' as const;
}

function wantsAgreementTalk(life: Life, person: Contact) {
  const romance = romanceFor(life, person.id)!;
  const lastTalk = relationshipState(life, person.id)?.lastAgreementTalk;
  const proposal = suggestedAgreement(life, person);
  if (life.year <= romance.started || (lastTalk !== undefined && life.year - lastTalk < 3) ||
    person.bond.trust < 38 || attraction(life, person) === 0 || careIssue(life, person, proposal) ||
    !datingIntent(life, person, 'commit').allowed) return false;
  const { confidence, loyalty, riskTolerance } = npcProfile(life, person).traits;
  const motivation = proposal === 'exclusive' ? loyalty : riskTolerance;
  return npcRandom(life, `agreement-talk:${person.id}`, life.year).next() < .08 + confidence / 420 + motivation / 540;
}

function answerBreach(life: Life, person: Contact, choice: string) {
  const concern = visibleConcerns(life, person.id).find((entry) => entry.breach?.discovered);
  if (!concern?.breach) return false;
  const attempts = concern.breach.count;
  const honesty = choice === 'apologize';
  const profile = ensureNpc(life, person);
  const status = romanceFor(life, person.id)?.status;
  const commitment = status === 'married' ? 12 : status === 'engaged' ? 8 : status === 'committed' ? 5 : 0;
  const score = relationshipSatisfaction(life, person) + profile.traits.loyalty * .24 + profile.traits.empathy * .15 +
    Math.min(14, life.year - (romanceFor(life, person.id)?.started ?? life.year)) + commitment -
    concern.severity * .42 - (attempts - 1) * 19 - (choice === 'deny' ? 22 : 0) + (honesty ? 11 : 0);
  person.bond.trust = clamp(person.bond.trust - (honesty ? 17 : choice === 'deny' ? 33 : 21));
  person.bond.resentment = clamp(person.bond.resentment + (honesty ? 13 : choice === 'deny' ? 27 : 16));
  concern.updated = life.year;
  let text: string;
  let title: string;
  let settlement = 0;
  if (score < 26) {
    title = status === 'married' ? 'Marriage Ended' : 'Relationship Ended';
    text = `${person.name} said the broken agreement had changed how they felt. They decided to end our relationship.`;
    settlement = endRomance(life, person, text, 'betrayal');
  } else if (choice === 'space' || score < 48) {
    relationshipState(life, person.id)!.apartUntil = life.year + 1;
    title = 'Time Apart';
    text = `${person.name} asked for space until next year. They aren’t ready to decide what happens after that.`;
  } else {
    title = 'Trust Takes Time';
    text = honesty ? `${person.name} appreciated that I told the truth. They want to keep talking, but rebuilding trust will take time.` :
      `${person.name} said they were still hurt and would only stay if we took our agreement seriously.`;
    if (honesty) concern.state = 'repairing';
  }
  remember(life, person, text, true);
  recordNotice(life, 'community', title, text, { bank: -settlement, happiness: -5, stress: choice === 'deny' ? 6 : 3 }, 'relationships');
  return true;
}

export function answerSocialEvent(life: Life, id: string, choice: string) {
  const accepted = choice === 'accept';
  if (id === discoveryEvent) {
    answerDatingDiscovery(life, choice === 'like');
    return;
  }
  if (id === 'social-meeting') {
    answerMeeting(life, accepted);
    return;
  }
  const person = findContact(life, life.social.pendingPerson ?? undefined);
  const guest = findContact(life, life.social.pendingGuest);
  if (person?.alive && isIntimacyEvent(id) && accepted) {
    life.pending = protectionEvent;
    life.social.pendingEncounter = id;
    if (!life.seen.includes(protectionEvent)) life.seen.push(protectionEvent);
    return;
  }
  const encounter = id === protectionEvent ? life.social.pendingEncounter : isIntimacyEvent(id) ? id : undefined;
  if (id === protectionEvent && choice === 'barrier' && life.character.bank < barrierFee(life)) return 'Your balance does not cover barrier protection.';
  life.social.pendingPerson = null;
  delete life.social.pendingGuest;
  delete life.social.pendingEncounter;
  if (!person?.alive) return;
  if (id === 'social-friendship') {
    if (accepted) acceptFriendship(life, person);
    else {
      const story = `I told ${person.name} I wanted to stay acquaintances for now.`;
      remember(life, person, story);
      record(life, 'decision', story);
    }
    return;
  }
  if (encounter) {
    const method = choice === 'barrier' || choice === 'no-barrier' ? choice : 'pass';
    const completed = answerIntimacy(life, encounter, person, guest, method);
    if (encounter === 'social-hookup' && !completed) discardSearchMatch(life, person.id);
    return;
  }
  if (id === 'social-dating-match' || id === 'social-casual-match') {
    const dating = id === 'social-dating-match';
    const slow = dating && choice === 'slow';
    const text = slow ? `${person.name} and I exchanged numbers. We decided to get to know each other first.` :
      !accepted ? `I thanked ${person.name} for the invitation and decided to pass.` : dating ?
        `${person.name} and I went on a first date and left room for a second.` : `I went on a casual date with ${person.name}. We enjoyed the evening and left things there.`;
    if (slow) changeRomance(life, person.id, 'getting-to-know', text);
    if (accepted) {
      person.bond.affection = clamp(person.bond.affection + 6);
      person.bond.trust = clamp(person.bond.trust + 3);
      if (dating) changeRomance(life, person.id, 'dating', text);
      else boundaryEvidence(life, [person.id], 'date');
    }
    if (accepted || slow) remember(life, person, text);
    else discardSearchMatch(life, person.id);
    if (accepted) recordNotice(life, 'community', dating ? 'A First Date' : 'A Casual Date', text, { happiness: 4 });
    else record(life, 'decision', text);
    return;
  }
  if (id === 'social-affair') {
    if (answerBreach(life, person, choice)) return;
    const honest = choice === 'apologize';
    const married = romanceFor(life, person.id)?.status === 'married';
    const response = honest ? `I took responsibility and apologized to ${person.name}.` :
      `I denied it, but ${person.name} did not believe me.`;
    const text = `${response} ${married ? 'We divorced and settled our shared expenses.' : 'Our relationship ended.'}`;
    const settlement = endRomance(life, person, text, 'betrayal');
    person.bond.trust = clamp(person.bond.trust - (honest ? 16 : 30));
    person.bond.resentment = clamp(person.bond.resentment + (honest ? 12 : 27));
    remember(life, person, text, true);
    recordNotice(life, 'community', married ? 'Marriage Ended' : 'Relationship Ended', text,
      { bank: -settlement, happiness: honest ? -5 : -9, stress: honest ? 3 : 6 }, 'relationships');
    return;
  }
  if (id === 'social-expectations' || id === 'social-space' || id === 'social-concern' || id === 'social-reconnect') {
    let text: string;
    let title = accepted ? 'A Conversation' : 'For Another Time';
    if (id === 'social-space') {
      setAgreement(life, person.id, agreementFor(life, person.id));
      relationshipState(life, person.id)!.apartUntil = life.year + 1;
      if (!accepted) person.bond.resentment = clamp(person.bond.resentment + 6);
      text = accepted ? `I agreed to give ${person.name} time to think until next year.` : `I wanted to keep talking, but ${person.name} still needed some space.`;
    } else if (id === 'social-expectations') {
      const proposed = suggestedAgreement(life, person);
      const agreed = accepted && negotiateAgreement(life, person, proposed, true);
      noteAgreementTalk(life, person.id);
      title = agreed ? 'An Agreement' : 'For Another Time';
      text = agreed ? `${person.name} and I agreed to ${agreementPhrase(proposed)} after talking openly.` :
        `I heard what ${person.name} wanted. We left our existing expectations in place.`;
      romanceHistory(life, person.id, text);
    } else if (id === 'social-concern') {
      if (accepted) meaningfulTime(life, person, 'time', 7);
      text = accepted ? `I listened to ${person.name} and heard why the issue still mattered to them.` :
        `${person.name} and I left the conversation for another time.`;
    } else {
      if (accepted) {
        ensureNpc(life, person).formerFriend = false;
        person.bond.trust = clamp(person.bond.trust + 5);
        relationshipMemory(life, person.id, 'reconciliation', 5, true);
      }
      text = accepted ? `${person.name} and I caught up after a long time apart. We agreed to stay in touch.` :
        `I appreciated hearing from ${person.name}, but wasn’t ready to reconnect.`;
    }
    remember(life, person, text);
    recordNotice(life, 'community', title, text);
    return;
  }
  const profile = ensureNpc(life, person);
  const outcome = accepted && (id === 'social-time' || id === 'social-dinner') ? contextualOutcome(life, person, { key: id }) : undefined;
  const impact = outcome?.weight ?? 1;
  const cost = accepted && id === 'social-support' ? Math.min(life.character.bank, 1200) : 0;
  profile.savings += cost;
  if (accepted && id === 'social-finances') profile.commitments = Math.max(0, profile.commitments - 600);
  const child = life.social.children[person.id];
  if (accepted && id === 'social-school' && child) child.learning = clamp(child.learning + 4);
  person.bond.trust = clamp(person.bond.trust + (accepted ? Math.round(5 * impact) : -2));
  person.bond.affection = clamp(person.bond.affection + (accepted ? Math.round(4 * impact) : -2));
  if (accepted && id === 'social-time') person.bond.resentment = clamp(person.bond.resentment - Math.round(7 * impact));
  if (outcome && impact > 0) meaningfulTime(life, person, 'time', 5);
  if (accepted && id === 'social-support') meaningfulTime(life, person, 'support', 5);
  const stories: Record<string, string> = {
    'social-dinner': `I accepted ${person.name}’s invitation and we had dinner together.`,
    'social-time': `I set some time aside for ${person.name} and we talked about how we had been feeling.`,
    'social-proposal': `I accepted ${person.name}’s proposal. We are engaged.`,
    'social-support': `I helped ${person.name} cover part of their household expenses.`,
    'social-school': `I worked through the assignment with ${person.name}.`,
    'social-finances': `I made a household budget with ${person.name} and we reduced some commitments.`,
  };
  const text = accepted ? `${stories[id]!}${outcome ? ` ${outcome.note}` : ''}` : `I told ${person.name} I would rather wait. We agreed to leave it for now.`;
  if (accepted && id === 'social-proposal') changeRomance(life, person.id, 'engaged', text);
  else romanceHistory(life, person.id, text);
  remember(life, person, text);
  if (outcome) {
    friendshipExperience(life, person, impact);
    recordNotice(life, 'community', outcome.title, text, { bank: -cost, happiness: Math.round(3 * impact) }, 'relationships');
  } else record(life, 'decision', text, { bank: -cost, happiness: accepted ? 3 : 0 }, 'relationships');
}
