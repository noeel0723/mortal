import { skillCategories, skillIds, skills, trainingMethods } from './data/skills.ts';
import type { SkillId, TrainingMethod } from './data/skills.ts';
import { hobbyIssue, skillAt, skillTier, trainingIssue, trainingUsed } from './engine/skills.ts';
import { showcaseIssue, showcasePlan } from './engine/skillShowcases.ts';
import { skillLimits } from './engine/skillTypes.ts';
import type { Life } from './engine/types.ts';
import type { ActivityControl } from './activityView.ts';
import { money } from './i18n/en.ts';
import type { Emoji } from './theme/tokens.ts';

export type SkillCategory = keyof typeof skillCategories;
export const activitySkillCategories: { category: SkillCategory; label: string; icon: Emoji }[] = [
  { category: 'sports', label: skillCategories.sports, icon: 'football' },
  { category: 'music', label: skillCategories.music, icon: 'music' },
  { category: 'creative', label: skillCategories.creative, icon: 'art' },
  { category: 'knowledge', label: skillCategories.knowledge, icon: 'study' },
  { category: 'practical', label: skillCategories.practical, icon: 'vocational' },
];

export function skillCategory(value: string | undefined): SkillCategory | undefined {
  return activitySkillCategories.find(({ category }) => category === value)?.category;
}

function skillRow(life: Life, id: SkillId) {
  const { name, icon, age } = skills[id];
  const { proficiency } = skillAt(life, id);
  const tier = skillTier(proficiency);
  return { id, name, icon, proficiency, detail: `${tier}${life.character.age < age ? ` · From age ${age}` : ''}` };
}

export function skillGroups(life: Life, only?: SkillCategory) {
  return activitySkillCategories.filter(({ category }) => !only || category === only).map(({ category, label }) => ({
    label, rows: skillIds.filter((id) => skills[id].category === category).map((id) => skillRow(life, id)),
  }));
}

export function annualTrainingSummary(life: Life) {
  return `${trainingUsed(life)} / ${skillLimits.yearlySessions} sessions used`;
}

export function skillDetails(life: Life, id: SkillId) {
  const progress = skillAt(life, id);
  const favorite = life.skills.hobbies.includes(id);
  const change = progress.lastChange;
  const rows = [
    { label: 'Tier', value: skillTier(progress.proficiency) },
    { label: 'Experience', value: `${progress.experience} XP` },
    { label: 'Sessions this year', value: `${life.skills.annual.sessions[id] ?? 0} / ${skillLimits.yearlyPerSkill}` },
    { label: 'Last practiced', value: progress.lastYear ?? 'Never' },
    { label: 'Latest change', value: change ? `${change > 0 ? '+' : ''}${change} points` : '—' },
  ];
  if (progress.discovered !== null) rows.push({ label: 'Natural aptitude', value: `${progress.aptitude}%` });
  const controls: ActivityControl[] = (Object.keys(trainingMethods) as TrainingMethod[]).map((method) => {
    const item = trainingMethods[method];
    return { label: item.name, icon: item.icon, detail: `${item.fee ? money(item.fee) : 'Free'}`,
      issue: trainingIssue(life, id, method), action: { type: 'train-skill', skill: id, method } };
  });
  const publicEvent = showcasePlan(life, id);
  if (publicEvent) controls.push({ label: publicEvent.label, icon: 'trophy',
    detail: `${publicEvent.fee ? money(publicEvent.fee) : 'Free'} · Once per year across all skills`,
    issue: showcaseIssue(life, id), action: { type: 'skill-showcase', skill: id } });
  const hobby: ActivityControl = { label: favorite ? 'Remove Hobby' : 'Add as Hobby', icon: favorite ? 'close' : 'accept',
    issue: hobbyIssue(life, id, !favorite), action: { type: 'set-hobby', skill: id, enabled: !favorite } };
  const achievements = [
    { label: 'Personal best', value: `${progress.best}% · ${skillTier(progress.best)}` },
    ...(progress.awards ? [{ label: 'Awards earned', value: progress.awards }] : []),
    ...[...progress.showcases].reverse().map(({ year, outcome, score }) => ({ label: `${outcome} · ${year}`, value: `${score} / 100` })),
  ];
  return { rows, controls, hobby, achievements, proficiency: progress.proficiency };
}
