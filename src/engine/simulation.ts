import { eventById, events } from '../data/events.ts';
import { libraryEvents, libraryFriendEvent } from '../data/libraryEvents.ts';
import { advanceAcademics, chooseEducationPath, isTuitionDue, performAcademicAction } from './academics.ts';
import { activityStory } from './activityStories.ts';
import { appearanceChanged, appearanceIssue, mergeAppearance, validFace, validHair } from './appearance.ts';
import { advanceCareer, applyCareerEffect, closeCareerYear, endEmployment, performCareerAction, studyWorkload } from './career.ts';
import { developChildInterests } from './childSkills.ts';
import { annualFinance } from './finance.ts';
import { enqueueNotice, eventTitle, recordNotice, resultMeter } from './eventNotices.ts';
import { ageFamilyOpportunities, applyFamily } from './familyLife.ts';
import { advanceIllnesses, startIllness, visitHealthcare } from './health.ts';
import { playerPatient } from './healthTypes.ts';
import { sharedHobbies, spendTimeOnHobby } from './hobbies.ts';
import { skills } from '../data/skills.ts';
import { contactIssue, performRelationshipActivity } from './interactions.ts';
import { clamp, record } from './journal.ts';
import { befriendLibraryGuest, visitLibrary } from './library.ts';
import { doLifestyle } from './lifestyle.ts';
import { applyLove } from './love.ts';
import { advanceNpcLives, ageNewPeople, cloneSocial, ensureNpc, remember, syncNpcs } from './npcs.ts';
import { applyPropertyAction, movingAge } from './property.ts';
import { seededRandom } from './random.ts';
import { relocate } from './relocation.ts';
import { conversationStory, friendshipStory } from './relationshipStories.ts';
import { answerSocialEvent, isSocialEvent, offerSocialEvent } from './socialEvents.ts';
import { advanceContactOccupation, currentClass, findContact, isPeer, isSchoolStage } from './school.ts';
import { ageSkills, cloneSkills, incidentalPractice, setHobby, trainSkill } from './skills.ts';
import { developAcademicSkills } from './skillIntegration.ts';
import { holdShowcase } from './skillShowcases.ts';
import { ageWorkplace, canMakeFriend, coworkerAcquaintanceThreshold, coworkerFriendAffection, isWorkAcquaintance, isWorkContact } from './workplace.ts';
import { advanceWorld } from './world.ts';
import { stats } from './types.ts';
import type { Action, Life } from './types.ts';

export const maxAge = 115;
export const friendshipEnergyCost = 6;

export const activities = {
  'go-to-library': { age: 5, effects: { smarts: 2, happiness: 1 }, title: 'Library Visit', meter: 'smarts' },
  rest: { age: 4, energy: 0, effects: { energy: 20, stress: -8 }, title: 'Time to Rest', meter: 'energy' },
  walk: { age: 4, effects: { health: 3, stress: -3 }, title: 'A Walk Outside', meter: 'health' },
  study: { age: 6, energy: 16, effects: { smarts: 4, discipline: 3, stress: 3 }, title: 'Study Session', meter: 'smarts' },
  library: { age: 6, energy: 8, effects: { smarts: 1 }, title: 'School Library Visit', meter: 'smarts' },
  socialize: { age: 6, energy: 8, effects: { happiness: 3 }, title: 'Time with Classmates', meter: 'happiness' },
  extracurricular: { age: 6, energy: 12, effects: { discipline: 2, happiness: 2 }, title: 'Club Activity', meter: 'discipline' },
  'academic-talk': { age: 6, energy: 7, effects: { stress: -2 }, title: 'Academic Feedback', meter: 'stress' },
  exams: { age: 6, energy: 14, effects: { discipline: 1, stress: 4 }, title: 'Exam Practice', meter: 'discipline' },
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
  ageSkills(life);
  character.attributes.energy = 100;
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
      person.alive = false;
      recordNotice(life, 'family', 'A Loss in the Family', `My ${person.role.toLowerCase()}, ${person.name}, died at age ${person.age}.`, { happiness: -10, stress: 10 });
    }
  }
  for (const person of life.schoolContacts) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) person.alive = false;
    if (person.alive && !life.social.profiles[person.id]?.job && life.social.profiles[person.id]?.status !== 'retired') advanceContactOccupation(person);
  }
  for (const person of life.communityFriends) {
    if (!person.alive) continue;
    person.age += 1;
    if (person.age === 18) person.occupation = 'Library member';
    if (person.age > 60) person.health = clamp(person.health - 2);
    if (person.age >= maxAge || person.health === 0) {
      person.alive = false;
      recordNotice(life, 'community', 'A Friend Remembered', `${person.name}, my friend from the library, died at age ${person.age}.`, { happiness: -5 });
    }
  }
  ageWorkplace(life, maxAge);
  ageNewPeople(life, maxAge);
  annualFinance(life, elapsedAge);
  closeCareerYear(life);
  const elapsedWorld = life.world;
  life.world = advanceWorld(life.world, life.year);
  advanceIllnesses(life);
  advanceNpcLives(life, elapsedWorld);
  developChildInterests(life);
  const dies = character.attributes.health === 0 || age >= maxAge ||
    (age >= 72 && random.next() < (age - 69) / 650 + (100 - character.attributes.health) / 1800);
  if (dies) {
    character.causeOfDeath = character.attributes.health === 0 ? 'Declining health' : 'Natural causes';
    life.illnesses = life.illnesses.filter(({ patient }) => patient !== playerPatient);
    life.academic.gapUntil = null;
    life.scheduled = [];
    endEmployment(life, 'died');
    recordNotice(life, 'life', 'End of Life', `My life ended at age ${age}.`);
    life.random = random.state;
    return;
  }
  studyWorkload(life);
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
  const eligible = events.filter((event) => age >= event.ages[0] && age <= event.ages[1] &&
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
  offerSocialEvent(life);
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
    if (life.usedActions.includes(activity)) return 'Already done this year.';
    if (life.character.attributes.energy < activities[activity].energy) return 'You need more energy.';
  }
  return null;
}

export function talkIssue(life: Life, id: string) {
  const person = findContact(life, id);
  if (!person) return 'This person is no longer available.';
  const issue = contactIssue(life, person);
  if (issue) return issue;
  if (life.character.age < 3) return 'Available from age 3.';
  if (person.age < 3) return 'They are too young for a conversation.';
  if (life.usedActions.includes(`talk:${id}`)) return 'Already done this year.';
  if (life.character.attributes.energy < 8) return 'You need more energy.';
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
  if (life.character.attributes.energy < friendshipEnergyCost) return 'You need more energy.';
  return null;
}

export function advance(previous: Life, action: Action): { life: Life; error?: never } | { error: string; life?: never } {
  if (action.type === 'acknowledge-event') {
    if (previous.pending || previous.notices[0]?.entry !== action.entry) return { error: 'This event is no longer available.' };
    return { life: { ...previous, notices: previous.notices.slice(1) } };
  }
  if (previous.character.causeOfDeath) return { error: 'This life has already ended.' };
  if (previous.pending && action.type !== 'choose') return { error: 'Resolve the pending decision first.' };
  const life = structuredCloneLife(previous);
  switch (action.type) {
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
    case 'buy-asset': case 'rent-home': case 'ask-for-home': case 'move-into-home': {
      const issue = applyPropertyAction(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'meet': case 'romance': case 'wedding': {
      const issue = applyLove(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'plan-child': case 'parent-child': {
      const issue = applyFamily(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'choose': {
      const choice = eventById.get(action.event)?.choices?.find(({ id }) => id === action.choice);
      if (life.pending !== action.event || !choice) return { error: 'This decision is no longer available.' };
      life.pending = null;
      if (isSocialEvent(action.event)) {
        answerSocialEvent(life, action.event, action.choice);
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
        life.usedActions.push(activity);
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
      if (repeatable && count >= 6 && (activity !== 'rest' || life.character.attributes.energy >= 100)) return { life: previous };
      if (repeatable && count < 6) life.usedActions.push(repeatKey);
      if (activity === 'go-to-library' && count < 4) incidentalPractice(life, 'writing', 1, 25);
      const effects = activity === 'walk' ? { health: Math.max(0, 3 - Math.floor(count / 2)), stress: -Math.max(0, 3 - Math.floor(count / 2)) } :
        activity === 'go-to-library' ? { smarts: Math.max(0, 2 - Math.floor(count / 2)), happiness: count < 4 ? 1 : 0 } :
          activity === 'rest' ? { energy: 20, stress: -Math.max(0, 8 - count * 2) } : item.effects;
      record(life, academic ? 'school' : 'life', activityStory(life, activity, adviser?.name),
        academic ? { energy: -activities[activity].energy, ...effects } : effects);
      if (activity !== 'go-to-library' || !visitLibrary(life)) {
        enqueueNotice(life, item.title, resultMeter(eventTitle(item.meter), before, life.character.attributes[item.meter]));
      }
      break;
    }
    case 'talk': {
      const issue = talkIssue(life, action.person);
      if (issue) return { error: issue };
      const person = findContact(life, action.person)!;
      life.usedActions.push(`talk:${person.id}`);
      const previousAffection = person.bond.affection;
      const shared = sharedHobbies(life, person)[0];
      person.bond.affection = clamp(person.bond.affection + (shared ? 4 : 3));
      person.bond.trust = clamp(person.bond.trust + 2);
      person.bond.familiarity = clamp(person.bond.familiarity + 4);
      const story = shared ? `${conversationStory(life, person)} We also traded ideas about ${skills[shared].name}.` : conversationStory(life, person);
      remember(life, person, story);
      const notice = recordNotice(life, isWorkContact(person) ? 'career' : 'friend' in person ? 'community' : 'family',
        'A Conversation', story, { energy: -8, happiness: 3 });
      notice.meter = resultMeter('Affection', previousAffection, person.bond.affection);
      break;
    }
    case 'befriend': {
      const issue = befriendIssue(life, action.person);
      if (issue) return { error: issue };
      const person = findContact(life, action.person)!;
      if (!('friend' in person)) return { error: 'This contact cannot become a friend.' };
      const previousAffection = person.bond.affection;
      const work = isWorkContact(person);
      const newWorkFriend = work && !person.friend;
      const relationship = ensureNpc(life, person);
      relationship.formerFriend = false;
      relationship.friendsSince ??= life.year;
      person.friend = true;
      person.bond.affection = newWorkFriend ? coworkerFriendAffection : clamp(person.bond.affection + 8);
      person.bond.trust = clamp(person.bond.trust + 5);
      person.bond.familiarity = clamp(person.bond.familiarity + 6);
      const story = friendshipStory(life, person);
      remember(life, person, story);
      const notice = recordNotice(life, work ? 'career' : 'stage' in person ? 'school' : 'community', 'A New Friend', story,
        { energy: -friendshipEnergyCost, happiness: 5 });
      notice.meter = resultMeter('Affection', previousAffection, person.bond.affection);
      break;
    }
    case 'seek-work': case 'work-harder': case 'request-raise': case 'resign': case 'retire':
    case 'apply-job': case 'accept-job': case 'decline-job': case 'work-hours': {
      const issue = performCareerAction(life, action);
      if (issue) return { error: issue };
      break;
    }
    case 'interact': {
      const issue = performRelationshipActivity(life, action.person, action.activity);
      if (issue) return { error: issue };
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
    seen: [...life.seen],
    scheduled: [...life.scheduled],
    usedActions: [...life.usedActions],
    transactions: [...life.transactions],
  };
}
