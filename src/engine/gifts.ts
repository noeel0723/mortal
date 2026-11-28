import { giftById, gifts } from '../data/gifts.ts';
import type { Gift } from '../data/gifts.ts';
import { recordNotice, resultMeter } from './eventNotices.ts';
import { interestsMatch } from './hobbies.ts';
import { clamp } from './journal.ts';
import { romanceHistory } from './love.ts';
import { isFamily, npcProfile, npcRandom, remember } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { activeFor, communicationEnded, meaningfulTime, takingSpace, trackConnection } from './relationships.ts';
import { findContact } from './school.ts';
import { pickStory } from './stories.ts';
import type { Contact, Life } from './types.ts';

export const giftPrice = (life: Life, person: Contact, gift: Gift) => localExpense(life.world, person.city, gift.basePrice);

const giftBands = [gifts.filter(({ basePrice }) => basePrice <= 1000),
  gifts.filter(({ basePrice }) => basePrice > 1000 && basePrice <= 7500), gifts.filter(({ basePrice }) => basePrice > 7500)];

export function giftOffers(life: Life, person: Contact, refresh: number) {
  const random = npcRandom(life, `gift-shop:${person.id}`, life.year);
  function rotate(pool: readonly Gift[], size: number) {
    const ordered = [...pool];
    for (let i = ordered.length - 1; i > 0; i--) {
      const swap = random.integer(0, i);
      [ordered[i], ordered[swap]] = [ordered[swap]!, ordered[i]!];
    }
    const start = refresh * size % ordered.length;
    return Array.from({ length: size }, (_, index) => ordered[(start + index) % ordered.length]!);
  }
  const offers = person.age < 6 ? rotate(gifts.filter(({ childFriendly }) => childFriendly), 7) :
    giftBands.flatMap((band, index) => rotate(band, index === 0 ? 3 : 2));
  return offers.map((gift) => ({ gift, price: giftPrice(life, person, gift) })).sort((a, b) => a.price - b.price);
}

export function giftIssue(life: Life, person: Contact, gift?: Gift) {
  if (life.character.causeOfDeath || life.pending) return 'Resolve the current life event first.';
  if (!person.alive || communicationEnded(life, person.id)) return 'This person is unavailable.';
  if (life.character.age < 3) return 'Available from age 3.';
  if (takingSpace(life, person.id)) return 'They’ve asked for time apart.';
  if (gift && life.character.bank < giftPrice(life, person, gift)) return 'Your balance does not cover this gift.';
  return null;
}

export function giftAppreciation(life: Life, person: Contact, gift: Gift) {
  const { traits, interests, memories } = npcProfile(life, person);
  const { affection, respect, resentment } = person.bond;
  const tuned = interestsMatch(interests, gift.interests);
  const preference = { sentimental: traits.empathy, practical: traits.discipline, playful: traits.sociability, premium: traits.materialism }[gift.style];
  const ageFit = person.age < 12 ? (gift.childFriendly ? 14 : -19) : gift.theme === 'toys' && !tuned ? -12 : 0;
  const repeated = memories.slice(-5).filter(({ text }) => text.includes(` ${gift.name}.`)).length;
  const variation = npcRandom(life, `gift-response:${person.id}:${gift.id}:${life.journal.length}`, life.year).integer(-11, 11);
  return clamp(Math.round(30 + (tuned ? 32 : 0) + ageFit + (preference - 45) * .22 + affection * .11 + respect * .05 -
    resentment * .28 - 7 * repeated + variation));
}

export function giveGift(life: Life, id: string, item: string) {
  const person = findContact(life, id);
  const gift = giftById.get(item);
  if (!person) return 'This person is unavailable.';
  if (!gift) return 'Choose a gift from the catalog.';
  const issue = giftIssue(life, person, gift);
  if (issue) return issue;
  const score = giftAppreciation(life, person, gift);
  const warmth = score >= 75 ? 6 : score >= 53 ? 3 : score >= 32 ? 0 : -2;
  const response = score >= 75 ? ['They lit up as soon as they opened it.', 'They told me it was exactly their sort of thing.'] :
    score >= 53 ? ['They thanked me and looked pleased.', 'They smiled and said they appreciated the thought.'] :
      score >= 32 ? ['They thanked me politely. It wasn’t quite their taste.', 'They appreciated the gesture more than the gift itself.'] :
        ['They thanked me, but it clearly missed the mark.', 'They looked unsure what to do with it.'];
  const intro = `${person.city === life.character.city ? 'I gave' : 'I sent'} ${person.name} ${gift.name}.`;
  const story = pickStory(life, `gift:${id}:${item}`, response.map((text) => `${intro} ${text}`));
  person.bond.affection = clamp(person.bond.affection + warmth);
  person.bond.trust = clamp(person.bond.trust + (score >= 75 ? 2 : 0));
  trackConnection(life, id);
  if (score >= 53) meaningfulTime(life, person, 'support', score >= 75 ? 4 : 2);
  remember(life, person, story);
  if (activeFor(life, id)) romanceHistory(life, id, story);
  const notice = recordNotice(life, isFamily(life, id) ? 'family' : 'community', 'Gift Given', story,
    { bank: -giftPrice(life, person, gift) }, 'relationships');
  notice.meter = resultMeter('Appreciation', score, score);
  return null;
}
