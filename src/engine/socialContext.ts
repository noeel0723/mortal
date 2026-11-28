import { sharedHobbies } from './hobbies.ts';
import { npcProfile, npcRandom } from './npcs.ts';
import { inPersonIssue, recentConnections, visibleConcerns } from './relationships.ts';
import type { Contact, Life } from './types.ts';

export type SocialOccasion = { key: string; location?: 'local' | 'remote'; cost?: number; group?: readonly string[]; demanding?: boolean };
export type SocialAvailability = { reason: string; alternative?: string };

export function availability(life: Life, person: Contact, occasion: SocialOccasion): SocialAvailability | null {
  const profile = npcProfile(life, person);
  if (!person.alive) return { reason: 'They are no longer available.' };
  if (occasion.location === 'local' && inPersonIssue(life, person)) return {
    reason: 'They couldn’t meet in person right now.', alternative: 'We could catch up from a distance.',
  };
  const illness = life.illnesses.find(({ patient }) => patient === person.id);
  if (person.health < 40 || illness?.level === 'severe' || (occasion.demanding && illness?.level === 'moderate')) return {
    reason: 'They were recovering and needed to rest.', alternative: 'We could keep it brief another time.',
  };
  if ((occasion.cost ?? 0) > Math.max(0, profile.savings - profile.commitments)) return {
    reason: 'They said the outing was outside their budget.', alternative: 'They suggested doing something free next time.',
  };
  const company = occasion.group ?? [];
  if (life.social.graph?.some(({ people, type }) => type === 'rival' && people.includes(person.id) &&
    people.some((id) => id !== person.id && company.includes(id)))) return {
    reason: 'They decided to sit this one out because someone they’ve had a disagreement with was going.',
    alternative: 'They offered to meet one-on-one instead.',
  };
  if (company.length >= 2 && profile.traits.sociability < 32) return {
    reason: 'They wanted a quieter day instead of joining a group.', alternative: 'They suggested a smaller get-together.',
  };
  if (visibleConcerns(life, person.id).some(({ severity }) => severity >= 72) || person.bond.resentment >= 75) return {
    reason: 'They still felt hurt about what happened before.', alternative: 'They asked for time to cool off.',
  };
  if (!occasion.demanding) return null;
  const random = npcRandom(life, `availability:${person.id}:${occasion.key}`, life.year).next();
  const youngChild = Object.entries(life.social.children).some(([id, record]) =>
    !record.supportEnded && life.year - record.year < 6 && life.social.parents[id]?.includes(person.id));
  if ((youngChild || profile.localHousehold === 'family') && random < .16) return {
    reason: 'They had family responsibilities that day.', alternative: 'They suggested a shorter visit next time.',
  };
  if (profile.status === 'employed' && random < .16 + profile.traits.discipline / 650) return {
    reason: 'Their work schedule was full.', alternative: 'They suggested catching up on a quieter day.',
  };
  if (profile.status === 'student' && random < .23) return {
    reason: 'They had schoolwork to finish.', alternative: 'They suggested a different day.',
  };
  return null;
}

export const socialOutcomes = [
  { title: 'Conflict', note: 'We disagreed, and the conversation got tense.', weight: -.60 },
  { title: 'Unpleasant Experience', note: 'We parted on a sour note.', weight: -.35 },
  { title: 'Awkward Experience', note: 'There were a few long pauses, and neither of us knew what to say.', weight: -.15 },
  { title: 'Ordinary Interaction', note: 'We talked for a while and carried on with our day.', weight: .35 },
  { title: 'Enjoyable Experience', note: 'We lost track of time while talking and were glad we made the effort.', weight: .75 },
  { title: 'Memorable Experience', note: 'It turned into a moment we’d both talk about again.', weight: 1 },
] as const;
export type SocialOutcome = typeof socialOutcomes[number];

export function contextualOutcome(life: Life, person: Contact, occasion: SocialOccasion): SocialOutcome {
  const { affection, trust, respect, familiarity, compatibility, resentment } = person.bond;
  const profile = npcProfile(life, person);
  const { stress, health, charisma } = life.character.attributes;
  const concerns = visibleConcerns(life, person.id)[0]?.severity ?? 0;
  const past = profile.memories.slice(-4).reduce((total, { text }) =>
    total + (text.includes(socialOutcomes[5].note) ? 3 : text.includes(socialOutcomes[0].note) ? -4 : 0), 0);
  const shared = Math.min(12, sharedHobbies(life, person).length * 5);
  const recent = recentConnections(life, person.id);
  const context = occasion.group?.length ? profile.traits.sociability * .06 : profile.traits.empathy * .06;
  const score = 15 + affection * .10 + trust * .13 + respect * .09 + familiarity * .08 + compatibility * .12 +
    profile.traits.empathy * .09 + charisma * .04 + (health + person.health) * .065 + shared + context + past -
    resentment * .30 - stress * .17 - concerns * .27 - recent * 2 - (occasion.demanding ? (100 - person.health) * .10 : 0) +
    npcRandom(life, `social-quality:${person.id}:${occasion.key}`, life.year).integer(-18, 18);
  return socialOutcomes[score < 18 ? 0 : score < 31 ? 1 : score < 45 ? 2 : score < 62 ? 3 : score < 80 ? 4 : 5]!;
}
