import { assetById } from '../data/shops.ts';
import { recordNotice } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { remember } from './npcs.ts';
import { ownedAssets } from './property.ts';
import { findContact } from './school.ts';
import { pickStory } from './stories.ts';
import type { Action, Life } from './types.ts';

type DrivingAction = Extract<Action, { type: 'family-driving' }>;

function drivingContext(life: Life, action: DrivingAction) {
  const asset = ownedAssets(life).find(({ ownershipId }) => ownershipId === action.asset);
  const listing = asset && assetById.get(asset.id);
  const child = findContact(life, action.person);
  return { asset, listing, child, record: life.social.children[action.person] };
}

export function drivingIssue(life: Life, action: DrivingAction, fromNotice = false) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  const { asset, listing, child, record } = drivingContext(life, action);
  if (!child?.alive || !record || child.age < 15) return 'Available to your children from age 15.';
  if (!asset || !listing || listing.kind === 'houses') return 'Choose an owned vehicle.';
  if (asset.city !== life.character.city || child.city !== life.character.city) return 'You, your child, and the vehicle need to be in the same city.';
  if (asset.condition < 35 || (asset.reliability ?? 0) < 35) return 'Service or repair the vehicle first.';
  const trained = record.driving?.includes(listing.kind);
  if (action.mode === 'teach') {
    if (trained) return 'They already learned to drive this type of vehicle.';
    if (!fromNotice && life.notices.some(({ details }) => details?.kind === 'driving-lesson' && details.person === action.person)) {
      return 'A driving lesson is already waiting for your answer.';
    }
  } else if (!trained) return 'Teach them to drive this type of vehicle first.';
  return null;
}

function offerLesson(life: Life, action: DrivingAction) {
  const child = findContact(life, action.person)!;
  const { listing } = drivingContext(life, action);
  const notice = recordNotice(life, 'family', 'Driving Lesson',
    `${child.name} asked if I could teach them how to drive my ${listing!.name}.`);
  notice.details = { kind: 'driving-lesson', person: action.person, asset: action.asset };
}

export function offerFirstDrivingLessons(life: Life) {
  const vehicles = ownedAssets(life).filter(({ reliability }) => reliability !== null);
  for (const child of life.social.people) {
    if (child.age !== 15 || !child.alive || !life.social.children[child.id]) continue;
    const action = vehicles.map(({ ownershipId }) => ({ type: 'family-driving', mode: 'teach', person: child.id, asset: ownershipId }) as const)
      .find((item) => !drivingIssue(life, item));
    if (action) offerLesson(life, action);
  }
}

export function applyFamilyDriving(life: Life, action: DrivingAction, fromNotice = false) {
  const issue = drivingIssue(life, action, fromNotice);
  if (issue) return issue;
  const { asset, listing, child, record } = drivingContext(life, action);
  if (!asset || !listing || listing.kind === 'houses' || !child || !record) return 'This vehicle or driver is unavailable.';
  if (action.mode === 'teach' && !fromNotice) {
    offerLesson(life, action);
    return null;
  }
  if (action.mode === 'teach') {
    record.driving = [...(record.driving ?? []), listing.kind];
    child.bond.trust = clamp(child.bond.trust + 4);
    const story = `I took ${child.name} to a practice area in my ${listing.name}. By the end of the lesson, they felt confident driving it.`;
    remember(life, child, story);
    recordNotice(life, 'family', 'Lesson Complete', story);
  } else {
    const condition = clamp(asset.condition - 2);
    const history = [...asset.history, { year: life.year, action: 'borrow' as const, amount: 0, condition }].slice(-40);
    life.property.owned = life.property.owned.map((item) => item === asset ? { ...item, condition,
      reliability: clamp((asset.reliability ?? 0) - 1), history } : item);
    const story = pickStory(life, `borrow:${child.id}`, [
      `${child.name} borrowed my ${listing.name} to visit a friend and brought it back before dinner.`,
      `I lent ${child.name} my ${listing.name} for an afternoon outing. They returned it that evening.`,
      `${child.name} took my ${listing.name} to pick up a few things and handed me the keys when they got home.`,
    ]);
    remember(life, child, story);
    recordNotice(life, 'family', 'Vehicle Returned', story);
  }
  return null;
}
