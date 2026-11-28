import { eventById, events } from '../data/events.ts';
import { libraryEvents, libraryFriendEvent } from '../data/libraryEvents.ts';
import { advanceAcademics, chooseEducationPath, isTuitionDue, performAcademicAction } from './academics.ts';
import { activityStory } from './activityStories.ts';
import { adoptChild } from './adoption.ts';
import { accessoryIssue, appearanceChanged, appearanceIssue, mergeAppearance, validFace, validHair } from './appearance.ts';
import { advanceCareer, applyCareerEffect, closeCareerYear, endEmployment, performCareerAction, studyWorkload } from './career.ts';
import { developChildInterests } from './childSkills.ts';
import { discoveryEvent, searchDatingPool, updateDatingProfile } from './datingDiscovery.ts';
import { answerCasualFollowup } from './casualConnections.ts';
import { recordContactDeath, recordPlayerDeath, respondToDeath } from './death.ts';
import { annualFinance } from './finance.ts';
import { enqueueNotice, eventTitle, recordNotice, resultMeter } from './eventNotices.ts';
import { applyFamilyDriving, offerFirstDrivingLessons } from './familyDriving.ts';
import { ageFamilyOpportunities, applyFamily, deliverPregnancies } from './familyLife.ts';
import { respondToSurname } from './familyNames.ts';
import { friendshipExperience, friendshipResponse } from './friendships.ts';
import { advanceIllnesses, startIllness, visitHealthcare } from './health.ts';
import { playerPatient } from './healthTypes.ts';
import { sharedHobbies, spendTimeOnHobby } from './hobbies.ts';
import { skills } from '../data/skills.ts';
import { contactIssue, performRelationshipActivity } from './interactions.ts';
import { clamp, record } from './journal.ts';
import { befriendLibraryGuest, visitLibrary } from './library.ts';
import { doLifestyle } from './lifestyle.ts';
import { advanceClubMemberships, advanceNeighborhood, performLocalSocial } from './localSocial.ts';
import { applyLove } from './love.ts';
import { advanceNpcLives, ageNewPeople, cloneSocial, remember, syncNpcs } from './npcs.ts';
import { applyPropertyAction, movingAge } from './property.ts';
import { performSurgery } from './plasticSurgery.ts';
import { seededRandom } from './random.ts';
import { advanceReproductiveHealth, cloneReproductiveHealth, protectionEvent } from './reproductiveHealth.ts';
import { relocate } from './relocation.ts';
import { conversationStory } from './relationshipStories.ts';
import { spendTimeWithAll } from './relationshipTime.ts';
import { answerSocialEvent, applyIntimacy, isSocialEvent, offerSocialEvent } from './socialEvents.ts';
import { activeFor, advanceEarlyConnections, advanceRelationships, applyRelationshipCare, inPersonIssue, meaningfulTime, openConcern, takingSpace, trackConnection } from './relationships.ts';
import { advanceContactOccupation, currentClass, findContact, isPeer, isSchoolStage } from './school.ts';
import { ageSkills, cloneSkills, incidentalPractice, setHobby, trainSkill } from './skills.ts';
import { developAcademicSkills } from './skillIntegration.ts';
import { holdShowcase } from './skillShowcases.ts';
import { ageWorkplace, canMakeFriend, coworkerAcquaintanceThreshold, isWorkAcquaintance, isWorkContact } from './workplace.ts';
import { availability, contextualOutcome } from './socialContext.ts';
import { advanceSocialGraph, introduceThroughFriend } from './socialGraph.ts';
import { advanceWorld } from './world.ts';
import { cloneWealth, performWealth, recordValuation } from './wealth.ts';
import { stats } from './types.ts';
import type { Action, Life } from './types.ts';

export const maxAge = 115;

export const activities = {
  'go-to-library': { age: 5, effects: { smarts: 2, happiness: 1 }, title: 'Library Visit', meter: 'smarts' },
  rest: { age: 4, effects: { stress: -8 }, title: 'Time to Rest', meter: 'stress' },
  walk: { age: 4, effects: { health: 3, stress: -3 }, title: 'A Walk Outside', meter: 'health' },
  study: { age: 6, effects: { smarts: 4, discipline: 3, stress: 3 }, title: 'Study Session', meter: 'smarts' },
  library: { age: 6, effects: { smarts: 1 }, title: 'School Library Visit', meter: 'smarts' },
  socialize: { age: 6, effects: { happiness: 3 }, title: 'Time with Classmates', meter: 'happiness' },
  extracurricular: { age: 6, effects: { discipline: 2, happiness: 2 }, title: 'Club Activity', meter: 'discipline' },
  'academic-talk': { age: 6, effects: { stress: -2 }, title: 'Academic Feedback', meter: 'stress' },
  exams: { age: 6, effects: { discipline: 1, stress: 4 }, title: 'Exam Practice', meter: 'discipline' },
} as const;
type Activity = keyof typeof activities;

const academicEffects = {
  study: { performance: 6, attendance: 2, stress: 5 },
  library: { performance: 3, attendance: 0, stress: -2 },
  socialize: { performance: 0, attendance: 2, stress: -6 },
  extracurricular: { performance: 2, attendance: 3, stress: 4 },
  'academic-talk': { performance: 3, attendance: 2, stress: -4 },
  exams: { performance: 7, attendance: 0, stress: 7 },
} as const;
type AcademicActivity = keyof typeof academicEffects;

export function isAcademicActivity(activity: Activity): activity is AcademicActivity {
  return Object.hasOwn(academicEffects, activity);
}

function ageUp(life: Life) {
  const random = seededRandom(life.random);
  const character = life.character;
  const elapsedAge = character.age;
  character.age += 1;
  life.year += 1;
  life.usedActions = [];
  delete life.social.datingCycle;
  ageSkills(life);
  character.attributes.stress = clamp(character.attributes.stress - 5);
  const age = character.age;
  character.attributes.health = clamp(character.attributes.health + (
    age < 18 ? random.integer(0, 1) : age < 45 ? random.integer(-1, 1) :
    age < 66 ? random.integer(-2, 0) : random.integer(-4, -1)
  ));
  for (const person of life.family) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 55) person.health = clamp(person.health - random.integer(0, 3));
    if (person.age > 70 && (person.health === 0 || person.age >= maxAge || random.next() < (person.age - 70) / 500)) {
      recordContactDeath(life, person, person.health === 0 ? 'Declining health' : 'Natural causes', 'family', { happiness: -10, stress: 10 });
    }
  }
  for (const person of life.schoolContacts) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) {
      recordContactDeath(life, person, person.health === 0 ? 'Declining health' : 'Natural causes', 'school');
    }
    if (person.alive && !life.social.profiles[person.id]?.job && life.social.profiles[person.id]?.status !== 'retired') advanceContactOccupation(person);
  }
  for (const person of life.communityFriends) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age === 18) person.occupation = 'Library member';
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) {
      recordContactDeath(life, person, person.health === 0 ? 'Declining health' : 'Natural causes', 'community', { happiness: -5 });
    }
  }
  ageWorkplace(life, maxAge);
  ageNewPeople(life, maxAge);
  annualFinance(life, elapsedAge);
  closeCareerYear(life);
  const elapsedWorld = life.world;
  life.world = advanceWorld(life.world, life.year);
  advanceIllnesses(life);
  advanceReproductiveHealth(life);
  advanceNpcLives(life, elapsedWorld);
  advanceNeighborhood(life);
  advanceClubMemberships(life);
  advanceSocialGraph(life);
  developChildInterests(life);
  const dies = character.attributes.health === 0 || age >= maxAge ||
    (age >= 72 && random.next() < (age - 69) / 650 + (100 - character.attributes.health) / 1800);
  if (dies) {
    character.causeOfDeath = character.attributes.health === 0 ? 'Declining health' : 'Natural causes';
    life.illnesses = life.illnesses.filter(({ patient }) => patient !== playerPatient);
    life.academic.gapUntil = null;
    life.scheduled = [];
    endEmployment(life, 'died');
    deliverPregnancies(life);
    recordPlayerDeath(life, character.causeOfDeath);
    recordValuation(life);
    life.random = random.state;
    return;
  }
  studyWorkload(life);
  deliverPregnancies(life);
  offerFirstDrivingLessons(life);
  ageFamilyOpportunities(life);
  const graduated = advanceAcademics(life, random);
  advanceCareer(life, random);
  if (age === movingAge) recordNotice(life, 'life', 'Moving Out',
    'I can stay with family, rent a place, or ask a parent to help buy my first home. My options are in Assets under Housing.');
  for (const consequence of life.scheduled) {
    if (consequence.year === life.year) recordNotice(life, 'decision', 'An Earlier Choice', consequence.text, consequence.effects);
  }
  life.scheduled = life.scheduled.filter(({ year }) => year > life.year);
  if (graduated && age === 18) {
    const photo = eventById.get('graduation-photo')!;
    life.seen.push(photo.id);
    recordNotice(life, photo.category, eventTitle(photo.id), photo.text, photo.effects);
  }
  const eligible = events.filter((event) => event.id !== discoveryEvent && event.id !== protectionEvent && event.id !== 'social-friendship' &&
    age >= event.ages[0] && age <= event.ages[1] &&
    !life.seen.includes(event.id) && !(life.academic.leftSchool && age < 18 && event.category === 'school') &&
    (event.eligible?.(life) ?? true));
  const graduationDecision = graduated && !life.seen.includes('graduation-plan') ? eventById.get('graduation-plan') : undefined;
  const triggered = graduationDecision ?? eligible.find((event) => event.probability === 1) ??
    eligible.filter((event) => random.next() < event.probability * (event.modifier?.(life) ?? 1))
      .map((event) => ({ event, order: random.next() })).sort((a, b) => a.order - b.order)[0]?.event;
  if (triggered) {
    life.seen.push(triggered.id);
    if (triggered.illness) startIllness(life, triggered.illness);
    else if (triggered.choices) {
      record(life, triggered.category, triggered.text, triggered.effects);
      life.pending = triggered.id;
    } else recordNotice(life, triggered.category, eventTitle(triggered.id), triggered.text, triggered.effects);
    if (triggered.careerEffects) applyCareerEffect(life, triggered.careerEffects);
  }
  advanceRelationships(life);
  advanceEarlyConnections(life);
  offerSocialEvent(life);
  recordValuation(life);
  life.random = random.state;
}

export function activityIssue(life: Life, activity: Activity) {
  const entry = activities[activity];
  if (life.character.age < entry.age) return `Available from age ${entry.age}.`;
  if (isAcademicActivity(activity)) {
    const enrollment = life.academic.enrollment;
    if (!enrollment) return 'Only available while attending school or a program.';
    if (isTuitionDue(enrollment)) return 'Pay this year’s tuition to attend.';
    if (!isSchoolStage(enrollment.level) && (activity === 'library' || activity === 'extracurricular')) return 'Only offered in school.';
    if (activity === 'academic-talk' && !currentClass(life).some((person) => person.alive && !isPeer(person))) return 'Your adviser is unavailable.';
    if (activity === 'socialize' && !currentClass(life).some((person) => person.alive && isPeer(person))) return 'No classmates are available.';
    if (activity !== 'socialize' && activity !== 'academic-talk' && activity !== 'extracurricular' && life.usedActions.includes(activity)) return 'Already done this year.';
  }
  return null;
}

export function talkIssue(life: Life, id: string) {
  const person = findContact(life, id);
  if (!person) return 'This person is no longer available.';
  const issue = contactIssue(life, person);
  if (issue) return issue;
  if (takingSpace(life, id)) return 'They’ve asked for time apart.';
  if (activeFor(life, id) && inPersonIssue(life, person)) return 'Call or video call when you’re apart.';
  if (life.character.age < 3) return 'Available from age 3.';
  if (person.age < 3) return 'They are too young for a conversation.';
  return null;
}

export function befriendIssue(life: Life, id: string) {
  const person = findContact(life, id);
  if (!person || !('friend' in person) || !canMakeFriend(person)) return 'You can only befriend a classmate or co-worker.';
  if (person.friend && !life.social.profiles[person.id]?.formerFriend) return 'You are already friends.';
  const issue = contactIssue(life, person);
  if (issue) return issue;
  if (isWorkContact(person) && !person.friend && !isWorkAcquaintance(person)) {
    return `Affection must be above ${coworkerAcquaintanceThreshold}% to become friends.`;
  }
  return null;
}

export function advance(previous: Life, action: Action): { life: Life; error?: never } | { error: string; life?: never } {
  if (action.type === 'acknowledge-event') {
    const notice = previous.notices[0];
    if (previous.pending || notice?.entry !== action.entry) return { error: 'This event is no longer available.' };
    if (!previous.character.causeOfDeath && notice.details?.kind === 'death') return { error: 'Choose how to remember this person.' };
    return { life: { ...previous, notices: previous.notices.slice(1) } };
  }
  if (previous.character.causeOfDeath) return { error: 'This life has already ended.' };
  if (previous.pending && action.type !== 'choose') return { error: 'Resolve the pending decision first.' };
  const life = structuredCloneLife(previous);
  switch (action.type) {
    case 'respond-death': {
      const issue = respondToDeath(life, action.entry, action.response);
      if (issue) return { error: issue };
      break;
    }
    case 'respond-casual': {
      const issue = answerCasualFollowup(life, action.entry, action.response);
      if (issue) return { error: issue };
      break;
    }
    case 'neighborhood': case 'community': case 'library-visit': {
      const issue = performLocalSocial(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'social-introduction': {
      const issue = introduceThroughFriend(life, action.person);
      if (issue) return { error: issue };
      break;
    }
    case 'respond-family': {
      const notice = life.notices[0];
      const detail = notice?.details;
      if (notice?.entry !== action.entry || !detail) return { error: 'This family event is no longer available.' };
      if (detail.kind === 'birth' || detail.kind === 'wedding-names') {
        const issue = respondToSurname(life, detail.kind, detail.person, action.response);
        if (issue) return { error: issue };
      } else if (detail.kind === 'driving-lesson') {
        if (action.response === 'teach') {
          const issue = applyFamilyDriving(life, { type: 'family-driving', mode: 'teach', person: detail.person, asset: detail.asset }, true);
          if (issue) return { error: issue };
        } else if (action.response !== 'later') return { error: 'Choose whether to give a lesson.' };
      } else return { error: 'This family event is no longer available.' };
      life.notices.shift();
      break;
    }
    case 'family-driving': {
      const issue = applyFamilyDriving(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'age':
      ageUp(life);
      break;
    case 'relocate': {
      const issue = relocate(life, action.city);
      if (issue) return { error: issue };
      break;
    }
    case 'healthcare': {
      const issue = visitHealthcare(life, action.visit);
      if (issue) return { error: issue };
      break;
    }
    case 'train-skill': case 'set-hobby': {
      const issue = action.type === 'train-skill' ? trainSkill(life, action.skill, action.method) : setHobby(life, action.skill, action.enabled);
      if (issue) return { error: issue };
      break;
    }
    case 'skill-showcase': case 'lifestyle': {
      const issue = action.type === 'skill-showcase' ? holdShowcase(life, action.skill) : doLifestyle(life, action.activity);
      if (issue) return { error: issue };
      if (life.journal.length === previous.journal.length) return { life: previous };
      break;
    }
    case 'share-hobby': {
      const person = findContact(life, action.person);
      if (!person) return { error: 'This person is unavailable.' };
      const issue = spendTimeOnHobby(life, person, action.skill);
      if (issue) return { error: issue };
      break;
    }
    case 'buy-asset': case 'rent-home': case 'ask-for-home': case 'move-into-home': case 'manage-asset': {
      const issue = applyPropertyAction(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'savings-transfer': case 'request-loan': case 'respond-loan': case 'repay-loan': case 'trade-fund': {
      const issue = performWealth(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'dating-profile': {
      const issue = updateDatingProfile(life, action.profile);
      if (issue) return { error: issue };
      break;
    }
    case 'dating-match': {
      const issue = searchDatingPool(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'meet': {
      const { source } = action;
      const issue = source === 'date' || source === 'app' ? searchDatingPool(life, { type: 'dating-match', source }) :
        applyLove(life, { type: 'meet', source });
      if (issue) return { error: issue };
      break;
    }
    case 'romance': case 'wedding': {
      const issue = applyLove(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'intimacy': {
      const issue = applyIntimacy(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'relationship-care': {
      const issue = applyRelationshipCare(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'plan-child': case 'parent-child': {
      const issue = applyFamily(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'adopt-child': {
      const issue = adoptChild(life, action.person);
      if (issue) return { error: issue };
      break;
    }
    case 'plastic-surgery': {
      const issue = performSurgery(life, action.procedure, action.surgeon);
      if (issue) return { error: issue };
      break;
    }
    case 'choose': {
      const choice = eventById.get(action.event)?.choices?.find(({ id }) => id === action.choice);
      if (life.pending !== action.event || !choice) return { error: 'This decision is no longer available.' };
      life.pending = null;
      if (isSocialEvent(action.event)) {
        const issue = answerSocialEvent(life, action.event, action.choice);
        if (issue) return { error: issue };
        break;
      }
      if (choice.academicPath) chooseEducationPath(life, choice.academicPath);
      if (choice.academicPath === 'workforce' && !life.career.current && life.career.retiredYear === null) life.career.seeking = true;
      if (choice.careerEffects) applyCareerEffect(life, choice.careerEffects);
      const outcome = action.event === libraryFriendEvent && choice.id === 'befriend' ? befriendLibraryGuest(life) : choice.outcome;
      const libraryStat = libraryEvents.some(({ id }) => id === action.event)
        ? stats.find((stat) => choice.effects[stat] !== undefined) ?? 'happiness' : undefined;
      const before = libraryStat ? life.character.attributes[libraryStat] : 0;
      record(life, 'decision', outcome, choice.effects);
      if (libraryStat) {
        enqueueNotice(life, 'Library Visit', resultMeter(eventTitle(libraryStat), before, life.character.attributes[libraryStat]));
      }
      if (choice.delayed) {
        life.scheduled.push({ year: life.year + choice.delayed.years, text: choice.delayed.text, effects: choice.delayed.effects });
      }
      break;
    }
    case 'activity': {
      const issue = activityIssue(life, action.activity);
      if (issue) return { error: issue };
      const { activity } = action;
      const item = activities[activity];
      const academic = isAcademicActivity(activity);
      if (academic && life.academic.enrollment) {
        if (!life.usedActions.includes(activity)) life.usedActions.push(activity);
        const effect = academicEffects[activity];
        const enrollment = life.academic.enrollment;
        enrollment.performance = clamp(enrollment.performance + effect.performance);
        if (effect.performance) enrollment.performanceRecorded = true;
        enrollment.attendance = clamp(enrollment.attendance + effect.attendance);
        enrollment.stress = clamp(enrollment.stress + effect.stress);
        if (activity === 'study' || activity === 'library' || activity === 'exams') developAcademicSkills(life, enrollment.programId, 1);
      }
      const adviser = action.activity === 'academic-talk' ?
        currentClass(life).find((person) => person.alive && (person.role === 'Teacher' || person.role === 'Professor')) : undefined;
      const before = life.character.attributes[item.meter];
      const repeatable = activity === 'walk' || activity === 'go-to-library' || activity === 'rest';
      const repeatKey = `repeat:${activity}`;
      const count = repeatable ? life.usedActions.filter((key) => key === repeatKey).length : 0;
      if (repeatable && count >= 6) return { life: previous };
      if (repeatable && count < 6) life.usedActions.push(repeatKey);
      if (activity === 'go-to-library' && count < 4) incidentalPractice(life, 'writing', 1, 25);
      const effects = activity === 'walk' ? { health: Math.max(0, 3 - Math.floor(count / 2)), stress: -Math.max(0, 3 - Math.floor(count / 2)) } :
        activity === 'go-to-library' ? { smarts: Math.max(0, 2 - Math.floor(count / 2)), happiness: count < 4 ? 1 : 0 } :
          activity === 'rest' ? { stress: -Math.max(0, 8 - count * 2) } : item.effects;
      record(life, academic ? 'school' : 'life', activityStory(life, activity, adviser?.name), effects);
      if (activity !== 'go-to-library' || !visitLibrary(life)) {
        enqueueNotice(life, item.title, resultMeter(eventTitle(item.meter), before, life.character.attributes[item.meter]));
      }
      break;
    }
    case 'talk': {
      const issue = talkIssue(life, action.person);
      if (issue) return { error: issue };
      const person = findContact(life, action.person)!;
      const previousAffection = person.bond.affection;
      const shared = sharedHobbies(life, person)[0];
      const occasion = { key: 'conversation', location: 'remote' } as const;
      const unavailable = availability(life, person, occasion);
      const outcome = contextualOutcome(life, person, occasion);
      const reception = unavailable ? 0 : outcome.weight;
      trackConnection(life, person.id);
      person.bond.affection = clamp(person.bond.affection + Math.round((shared ? 4 : 3) * reception));
      person.bond.trust = clamp(person.bond.trust + Math.round(2 * reception));
      if (!unavailable) person.bond.familiarity = clamp(person.bond.familiarity + Math.max(1, Math.round(4 * reception)));
      if (reception <= -.60) openConcern(life, person.id, 'argument', 31);
      if (reception > 0) meaningfulTime(life, person, 'time', 4);
      const intro = conversationStory(life, person);
      const remote = inPersonIssue(life, person) ? ' We caught up by phone.' : '';
      const story = unavailable ? `I checked in with ${person.name}. ${unavailable.reason}` :
        `${intro}${remote} ${outcome.note}${shared && reception > 0 ? ` We also traded ideas about ${skills[shared].name}.` : ''}`;
      remember(life, person, story, reception <= -.60);
      friendshipExperience(life, person, reception);
      const notice = recordNotice(life, isWorkContact(person) ? 'career' : 'friend' in person ? 'community' : 'family',
        'A Conversation', story, { happiness: Math.round(3 * reception) });
      notice.meter = resultMeter('Affection', previousAffection, person.bond.affection);
      break;
    }
    case 'befriend': {
      const issue = befriendIssue(life, action.person);
      if (issue) return { error: issue };
      const person = findContact(life, action.person)!;
      friendshipResponse(life, person);
      break;
    }
    case 'seek-work': case 'work-harder': case 'request-raise': case 'resign': case 'retire':
    case 'apply-job': case 'accept-job': case 'decline-job': case 'work-hours': {
      const issue = performCareerAction(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'spend-time-all': {
      const issue = spendTimeWithAll(life);
      if (issue) return { error: issue };
      break;
    }
    case 'interact': {
      const issue = performRelationshipActivity(life, action.person, action.activity);
      if (issue) return { error: issue };
      break;
    }
    case 'change-accessories': {
      const issue = accessoryIssue(life, action.choices);
      if (issue) return { error: issue };
      life.character.appearance = { ...life.character.appearance, accessories: { ...action.choices } };
      break;
    }
    case 'change-appearance':
    case 'change-hair': {
      const hairOnly = action.type === 'change-hair';
      const issue = appearanceIssue(life, hairOnly);
      if (issue) return { error: issue };
      if (hairOnly ? !validHair(action.choices) : !validFace(action.choices)) return { error: 'Choose valid appearance options.' };
      const current = life.character.appearance;
      const next = mergeAppearance(current, hairOnly ? { hair: action.choices.hair, hairColor: action.choices.hairColor } : action.choices);
      if (!appearanceChanged(current, next, hairOnly)) return { error: 'Your appearance is already set to these options.' };
      life.character.appearance = next;
      record(life, 'life', hairOnly ? `I changed my hairstyle to ${next.hair.toLowerCase()} with ${next.hairColor.toLowerCase()} hair.` :
        'My appearance was set at the start of my life.');
      break;
    }
    default: {
      const issue = performAcademicAction(life, action);
      if (issue) return { error: issue };
    }
  }
  syncNpcs(life);
  return { life };
}

function structuredCloneLife(life: Life): Life {
  return {
    ...life,
    character: { ...life.character, attributes: { ...life.character.attributes } },
    family: life.family.map((person) => ({ ...person, bond: { ...person.bond } })),
    schoolContacts: life.schoolContacts.map((person) => ({ ...person, bond: { ...person.bond } })),
    communityFriends: life.communityFriends.map((person) => ({ ...person, bond: { ...person.bond } })),
    social: cloneSocial(life.social),
    property: { ...life.property, owned: [...life.property.owned] },
    wealth: cloneWealth(life.wealth),
    career: {
      ...life.career,
      current: life.career.current ? { ...life.career.current, salaryHistory: [...life.career.current.salaryHistory], promotions: [...life.career.current.promotions] } : null,
      history: [...life.career.history], industryExperience: { ...life.career.industryExperience },
      applications: life.career.applications.map((item) => ({ ...item })),
      contacts: life.career.contacts.map((person) => ({ ...person, bond: { ...person.bond } })),
    },
    finance: { ...life.finance, arrears: { ...life.finance.arrears } },
    skills: cloneSkills(life.skills),
    academic: {
      ...life.academic,
      enrollment: life.academic.enrollment ? { ...life.academic.enrollment } : null,
      history: [...life.academic.history],
      qualifications: [...life.academic.qualifications],
      applications: life.academic.applications.map((item) => ({ ...item })),
      scholarships: life.academic.scholarships.map((item) => ({ ...item })),
    },
    journal: [...life.journal],
    notices: [...life.notices],
    illnesses: life.illnesses.map((condition) => ({ ...condition })),
    ...(life.reproductive ? { reproductive: cloneReproductiveHealth(life.reproductive) } : {}),
    seen: [...life.seen],
    scheduled: [...life.scheduled],
    usedActions: [...life.usedActions],
    transactions: [...life.transactions],
  };
}
