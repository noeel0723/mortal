import { skillsForInterest } from './hobbies.ts';
import { clamp } from './journal.ts';
import { npcProfile, npcRandom } from './npcs.ts';
import { localExpense } from './pricing.ts';
import { attraction } from './relationships.ts';
import type { Contact, Life } from './types.ts';

export const firstDateVenues = {
  coffee: { label: 'Coffee Date', icon: 'coffee', price: 240, health: 15, interests: ['cooking', 'reading'], social: 45,
    scene: 'met for coffee at a small café' },
  park: { label: 'Walk in the Park', icon: 'park', price: 0, health: 25, interests: ['hiking', 'gardening', 'photography'], social: 38,
    scene: 'walked through the park together' },
  cinema: { label: 'Cinema', icon: 'cinema', price: 480, health: 18, interests: ['acting', 'writing', 'photography'], social: 35,
    scene: 'caught a film at the cinema' },
  restaurant: { label: 'Restaurant', icon: 'restaurant', price: 900, health: 20, interests: ['cooking', 'foreign-languages'], social: 56,
    scene: 'shared a table at a local restaurant' },
  museum: { label: 'Art Museum', icon: 'art', price: 380, health: 25, interests: ['sketching', 'photography', 'reading'], social: 42,
    scene: 'browsed the galleries at the art museum' },
  concert: { label: 'Music Concert', icon: 'music', price: 1250, health: 35, interests: ['music', 'singing'], social: 72,
    scene: 'went to a live music concert' },
} as const;
export type FirstDateVenue = keyof typeof firstDateVenues;

export function firstDatePrice(life: Life, person: Contact, venue: FirstDateVenue) {
  return localExpense(life.world, person.city, firstDateVenues[venue].price);
}

export function firstDateIssue(life: Life, person: Contact, venue: FirstDateVenue) {
  if (!Object.hasOwn(firstDateVenues, venue)) return 'Choose an available date venue.';
  const item = firstDateVenues[venue];
  if (Math.min(life.character.attributes.health, person.health) < item.health) return 'You both need to feel well enough for this venue.';
  return life.character.bank < firstDatePrice(life, person, venue) ? 'Your balance does not cover this date.' : null;
}

export function firstDateOutcome(life: Life, person: Contact, venue: FirstDateVenue) {
  const item = firstDateVenues[venue];
  const profile = npcProfile(life, person);
  const interests = new Set<string>(item.interests.flatMap((interest) => [interest, ...skillsForInterest(interest)]));
  const enjoys = profile.interests.some((interest) => interests.has(interest) || skillsForInterest(interest).some((skill) => interests.has(skill)));
  const sharedVenue = enjoys && life.skills.hobbies.some((interest) => interests.has(interest));
  const random = npcRandom(life, `first-date:${person.id}:${venue}`, life.year);
  const { health, stress } = life.character.attributes;
  const { familiarity, trust, resentment } = person.bond;
  const sceneDetail = random.integer(0, 1);
  const timing = random.integer(-18, 18);
  const surroundings = (timing < -5 ? ['A delay threw off our plans.', 'It was louder than we expected.'] :
    timing > 5 ? ['We found a quiet spot away from the crowd.', 'The timing worked out better than we expected.'] :
      ['We settled into the evening at our own pace.', 'Things ran about as we had expected.'])[sceneDetail];
  const quality = clamp(Math.round(18 + attraction(life, person) * .36 + trust * .14 + familiarity * .11 +
    profile.traits.empathy * .10 + (health + person.health) * .07 - stress * .17 - resentment * .20 -
    Math.abs(profile.traits.sociability - item.social) * .18 + (sharedVenue ? 15 : enjoys ? 8 : 0) + timing));
  const outcome = quality >= 65 ? 'positive' : quality >= 42 ? 'neutral' : 'disappointing';
  const ending = outcome === 'positive' ? 'We clicked, and both wanted to see each other again.' :
    outcome === 'neutral' ? 'It was pleasant, though we were still figuring out how we felt.' :
      'Conversation struggled, and we ended the date without making another plan.';
  return { outcome, quality, story: `${person.name} and I ${item.scene}. ${surroundings} ${ending}` };
}
