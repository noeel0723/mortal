import { isSkillId } from '../data/skills.ts';
import { lifestyleIds, showcaseOutcomes, skillLimits } from '../engine/skillTypes.ts';
import type { Life } from '../engine/types.ts';

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const integer = (value: unknown, low: number, high: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= low && value <= high;

export function validateSkills(life: Life) {
  const state: unknown = life.skills;
  const validYear = (value: unknown): value is number => integer(value, life.character.birthYear, life.year);
  if (!record(state) || !record(state.entries) || !record(state.children) || !record(state.annual) ||
    !Array.isArray(state.hobbies) || state.hobbies.length > skillLimits.hobbies || new Set(state.hobbies).size !== state.hobbies.length) return false;
  const { entries, annual } = state;
  if (!state.hobbies.every((id) => isSkillId(id) && Object.hasOwn(entries, id))) return false;
  for (const [id, progress] of Object.entries(entries)) {
    if (!isSkillId(id) || !record(progress) || !integer(progress.proficiency, 0, 100) ||
      !integer(progress.aptitude, 0, 100) || !integer(progress.experience, 1, Number.MAX_SAFE_INTEGER) ||
      !integer(progress.practiceProgress, 0, 99) ||
      !integer(progress.sessions, 0, progress.experience) || !integer(progress.best, progress.proficiency, 100) ||
      !integer(progress.lastChange, progress.proficiency - 100, progress.proficiency) ||
      !validYear(progress.firstYear) || !validYear(progress.lastYear) || progress.firstYear > progress.lastYear ||
      !(progress.discovered === null || (validYear(progress.discovered) && progress.discovered >= progress.firstYear && progress.discovered <= progress.lastYear)) ||
      !integer(progress.awards, 0, life.character.age + 1) || !Array.isArray(progress.showcases) ||
      progress.showcases.length > skillLimits.recentShowcases) return false;
    let previousYear = progress.firstYear - 1;
    for (const event of progress.showcases) {
      if (!record(event) || !validYear(event.year) || event.year <= previousYear || !integer(event.score, 0, 100) ||
        !showcaseOutcomes.some((outcome) => outcome === event.outcome)) return false;
      previousYear = event.year;
    }
    if (progress.lastShowcase !== (progress.showcases.length ? previousYear : null)) return false;
  }
  for (const [id, interests] of Object.entries(state.children)) {
    if (!Object.hasOwn(life.social.children, id) || !Array.isArray(interests) || interests.length > skillLimits.childInterests) return false;
    const unique = new Set<string>();
    for (const entry of interests) {
      if (!record(entry) || !isSkillId(entry.skill) || unique.has(entry.skill) || !integer(entry.proficiency, 0, 100) ||
        !(entry.lastSupported === null || validYear(entry.lastSupported))) return false;
      unique.add(entry.skill);
    }
  }
  const countersValid = (value: unknown, maximum: number): value is Record<string, number> => record(value) &&
    Object.entries(value).every(([id, count]) => isSkillId(id) && Object.hasOwn(entries, id) && integer(count, 1, maximum));
  return typeof annual.showcased === 'boolean' && countersValid(annual.sessions, skillLimits.yearlyPerSkill) &&
    Object.values(annual.sessions).reduce((sum, count) => sum + count, 0) <= skillLimits.yearlySessions &&
    countersValid(annual.gains, skillLimits.yearlyGain) && record(annual.lifestyle) &&
    Object.entries(annual.lifestyle).every(([id, count]) => lifestyleIds.some((key) => key === id) && integer(count, 1, skillLimits.lifestyleBenefits));
}
