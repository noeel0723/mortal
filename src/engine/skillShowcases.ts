import { isSkillId, physicalSkill, skills } from '../data/skills.ts';
import type { SkillId } from '../data/skills.ts';
import { money } from '../i18n/en.ts';
import { recordNotice, resultMeter } from './eventNotices.ts';
import { clamp } from './journal.ts';
import { openingIssue, skillAt, skillRandom } from './skills.ts';
import { skillLimits } from './skillTypes.ts';
import type { Showcase } from './skillTypes.ts';
import type { Life } from './types.ts';

export function showcasePlan(life: Life, id: SkillId) {
  const skill = skills[id];
  if (skill.category === 'sports' || id === 'chess') {
    const school = life.character.age < 18 && !!life.academic.enrollment;
    return { label: school ? 'Enter a School Competition' : 'Enter a Community Competition', fee: school ? 0 : 450, competition: true };
  }
  if (skill.category === 'music') return { label: 'Perform at a Recital', fee: 300, competition: false };
  if (skill.category === 'creative') return { label: 'Complete a Creative Project', fee: 0, competition: false };
  return null;
}

export function showcaseIssue(life: Life, id: SkillId) {
  const blocked = openingIssue(life);
  if (blocked) return blocked;
  const plan = isSkillId(id) ? showcasePlan(life, id) : null;
  if (!plan) return 'This skill has no public event.';
  if (life.character.age < Math.max(8, skills[id].age)) return `Available from age ${Math.max(8, skills[id].age)}.`;
  if (life.skills.annual.showcased) return 'You already took part in an event this year.';
  const progress = skillAt(life, id);
  if (progress.proficiency < 25 || progress.sessions < 3) return 'Reach 25% proficiency and complete three training sessions.';
  if (progress.lastYear == null || life.year - progress.lastYear > 1) return 'Practice again before entering an event.';
  if (physicalSkill(id) && life.character.attributes.health < 40) return 'You need better health for this competition.';
  if (life.character.bank < plan.fee) return `You need ${money(plan.fee)} for entry.`;
  if (life.character.attributes.energy < 10) return 'You need more energy.';
  return null;
}

export function holdShowcase(life: Life, id: SkillId) {
  const issue = showcaseIssue(life, id);
  if (issue) return issue;
  const skill = skills[id];
  const plan = showcasePlan(life, id)!;
  const progress = skillAt(life, id);
  const { age, city, attributes } = life.character;
  const physical = physicalSkill(id);
  const conditioning = physical ? attributes.athleticism : attributes[skill.attributes[0]!];
  const ageModifier = physical ? (age < 12 ? -5 : Math.max(-12, Math.min(5, (60 - age) / 5))) : 0;
  const experience = Math.min(9, progress.sessions / 3) + (life.skills.annual.sessions[id] ?? 0);
  const random = skillRandom(life.seed, `showcase:${id}:${life.year}`);
  const score = clamp(Math.round(progress.proficiency * .63 + conditioning * .14 + attributes.health * .1 +
    experience + ageModifier + random.integer(-12, 14)));
  const outcome: Showcase['outcome'] = plan.competition ? score >= 72 ? 'Winner' : score >= 54 ? 'Finalist' : 'Participated' :
    score >= 63 ? 'Recognized' : 'Completed';
  const award = outcome === 'Winner' || outcome === 'Recognized';
  const event = plan.competition ? `${city} ${skill.name} ${plan.fee ? 'Community Cup' : 'School Meet'}` :
    skill.category === 'music' ? `${city} Open Recital` : `${city} Creative Showcase`;
  const story = outcome === 'Winner' ? `I won the ${event} after putting my practice to use.` : outcome === 'Finalist' ?
    `I reached the final at the ${event}.` : plan.competition ? `I competed at the ${event} and saw what I could work on next.` :
      award ? `My ${skill.name} work received special recognition at the ${event}.` : `I presented my ${skill.name} work at the ${event}.`;
  life.skills.annual.showcased = true;
  life.skills.entries[id] = { ...progress, lastShowcase: life.year, awards: progress.awards + Number(award),
    experience: progress.experience + 12, showcases: [...progress.showcases, { year: life.year, outcome, score }].slice(-skillLimits.recentShowcases) };
  recordNotice(life, 'community', award ? (plan.competition ? 'Amateur Champion' : 'Local Recognition') : 'A Public Performance',
    story, { bank: -plan.fee, energy: -10, happiness: award ? 5 : 2, reputation: award ? 3 : 0 }, 'training').meter =
    resultMeter(skill.name, progress.proficiency, progress.proficiency);
  return null;
}
