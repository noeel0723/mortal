import { isSkillId, physicalSkill, skills, trainingMethods } from '../data/skills.ts';
import type { SkillId, TrainingMethod } from '../data/skills.ts';
import { money } from '../i18n/en.ts';
import { recordNotice, resultMeter } from './eventNotices.ts';
import { seededRandom } from './random.ts';
import { skillLimits } from './skillTypes.ts';
import type { SkillProgress, SkillState } from './skillTypes.ts';
import type { Life } from './types.ts';

const mastery = { startsAt: 55, maximumSlowdown: .98, curve: .72, routine: .43, varied: .22, applied: .18 } as const;

function masteryFactor(life: Life, id: SkillId, method: TrainingMethod, progress: SkillProgress) {
  if (progress.proficiency <= mastery.startsAt) return 1;
  const fraction = (progress.proficiency - mastery.startsAt) / (100 - mastery.startsAt);
  const varied = Object.keys(trainingMethods).some((other) => other !== method && life.usedActions.includes(`training:${id}:${other}`));
  const applied = progress.lastShowcase !== null && life.year - progress.lastShowcase <= 1;
  const aptitude = .82 + progress.aptitude * .0032;
  const depth = mastery.routine + Number(varied) * mastery.varied + Number(applied) * mastery.applied;
  const resistance = 1 - mastery.maximumSlowdown * fraction ** mastery.curve;
  return resistance * (1 - fraction * (1 - depth * aptitude));
}

function newSkillYear(): SkillState['annual'] {
  return { sessions: {}, gains: {}, lifestyle: {}, showcased: false };
}

export function newSkills(): SkillState {
  return { entries: {}, hobbies: [], children: {}, annual: newSkillYear() };
}

export function cloneSkills(state: SkillState): SkillState {
  return { entries: { ...state.entries }, hobbies: [...state.hobbies], children: { ...state.children },
    annual: { ...state.annual, sessions: { ...state.annual.sessions }, gains: { ...state.annual.gains }, lifestyle: { ...state.annual.lifestyle } } };
}

export function skillRandom(seed: number, key: string) {
  for (const letter of key) seed = Math.imul(seed ^ letter.charCodeAt(0), 16777619);
  return seededRandom(seed >>> 0);
}

export function skillAt(life: Life, id: SkillId): SkillProgress {
  const talent = life.character.talent;
  const bonus = talent && skills[id].talents.includes(talent) ? 16 : 0;
  return life.skills.entries[id] ?? {
    proficiency: 0, aptitude: skillRandom(life.seed, `skill:${id}`).integer(26, 84) + bonus,
    experience: 0, practiceProgress: 0, firstYear: null, lastYear: null, sessions: 0, best: 0, lastChange: 0,
    discovered: null, lastShowcase: null, showcases: [], awards: 0,
  };
}

export function skillTier(value: number) {
  if (value >= 90) return 'Elite';
  if (value >= 75) return 'Expert';
  if (value >= 55) return 'Advanced';
  if (value >= 30) return 'Intermediate';
  if (value >= 15) return 'Beginner';
  return 'Novice';
}

export function openingIssue(life: Life) {
  if (life.character.causeOfDeath) return 'This life has ended.';
  if (life.pending) return 'Resolve the pending decision first.';
  return null;
}

export function trainingUsed(life: Life) {
  return Object.values(life.skills.annual.sessions).reduce((sum, count) => sum + count, 0);
}

export function trainingIssue(life: Life, id: SkillId, method: TrainingMethod) {
  const blocked = openingIssue(life);
  if (blocked) return blocked;
  if (!isSkillId(id) || !Object.hasOwn(trainingMethods, method)) return 'Choose a valid skill and training method.';
  const training = trainingMethods[method];
  const age = Math.max(skills[id].age, training.age);
  if (life.character.age < age) return `Available from age ${age}.`;
  if (physicalSkill(id) && life.character.attributes.health < 30) return 'You need better health to train safely.';
  if (trainingUsed(life) >= skillLimits.yearlySessions) return 'Your training schedule is full this year.';
  if ((life.skills.annual.sessions[id] ?? 0) >= skillLimits.yearlyPerSkill) return 'You have finished your sessions for this skill this year.';
  if (life.character.bank < training.fee) return `You need ${money(training.fee)} for this session.`;
  return null;
}

function rememberPractice(life: Life, id: SkillId, gain: number, experience: number, sessions: number, remainder?: number) {
  const before = skillAt(life, id);
  const annual = life.skills.annual;
  const previousGain = annual.gains[id] ?? 0;
  const actualGain = Math.max(0, Math.min(100 - before.proficiency, skillLimits.yearlyGain - previousGain, gain));
  if (actualGain) annual.gains[id] = previousGain + actualGain;
  if (sessions) annual.sessions[id] = (annual.sessions[id] ?? 0) + sessions;
  const proficiency = before.proficiency + actualGain;
  const discovered = before.discovered ?? (before.experience + experience >= 24 ? life.year : null);
  const after = { ...before, proficiency, best: Math.max(before.best, proficiency),
    firstYear: before.firstYear ?? life.year, lastYear: life.year, sessions: before.sessions + sessions,
    experience: before.experience + experience, practiceProgress: proficiency === 100 ? 0 : remainder ?? before.practiceProgress,
    lastChange: actualGain, discovered };
  life.skills.entries[id] = after;
  return after;
}

export function incidentalPractice(life: Life, id: SkillId, amount: number, ceiling: number) {
  if (life.character.age < skills[id].age) return;
  const progress = skillAt(life, id);
  const gain = Math.min(amount, ceiling - progress.proficiency);
  if (amount > 0) rememberPractice(life, id, Math.max(0, gain), amount * 2, 0);
}

export function trainSkill(life: Life, id: SkillId, method: TrainingMethod) {
  const issue = trainingIssue(life, id, method);
  if (issue) return issue;
  const definition = skills[id];
  const training = trainingMethods[method];
  const before = skillAt(life, id);
  const sessions = life.skills.annual.sessions[id] ?? 0;
  const { attributes, age } = life.character;
  const average = definition.attributes.reduce((total, key) => total + attributes[key], 0) / definition.attributes.length;
  const consistency = before.lastYear != null && life.year - before.lastYear <= 1 ? 1.08 : 1;
  const ageFactor = physicalSkill(id) && age > 45 ? Math.max(.55, 1 - (age - 45) / 100) : 1;
  const variation = .9 + skillRandom(life.seed, `${id}:${life.year}:${sessions}:${method}`).next() * .2;
  const readiness = .42 + average * .003 + attributes.discipline * .002 + attributes.health * .0015 - attributes.stress * .002;
  const diminishing = (1 - before.proficiency / 115) ** 1.36;
  const potential = 5 * (.7 + before.aptitude / 150) * readiness * diminishing;
  const growth = Math.max(1, Math.round(100 * potential * training.quality * consistency * ageFactor * variation *
    masteryFactor(life, id, method, before) / (definition.difficulty * (1 + sessions * .12))));
  const progress = before.practiceProgress + growth;
  const after = rememberPractice(life, id, Math.floor(progress / 100), training.experience, 1, progress % 100);
  const practiceKey = `training:${id}:${method}`;
  if (!life.usedActions.includes(practiceKey)) life.usedActions.push(practiceKey);
  const overtrained = physicalSkill(id) && (attributes.stress >= 65 || attributes.health < 48) && sessions >= 2;
  const discovery = before.discovered === null && after.discovered !== null && after.aptitude >= 73;
  const betterTier = skillTier(before.best) !== skillTier(after.best);
  const title = overtrained ? 'Pushing Too Hard' : discovery ? 'A Natural Aptitude' : betterTier ? `${definition.name}: ${skillTier(after.best)}` :
    method === 'course' ? 'Course Completed' : 'Training Session';
  const supportive = age < 18 && discovery ? life.family.find((parent) => parent.alive && parent.bond.affection >= 70) : undefined;
  const encouragement = supportive ? ` ${supportive.name} noticed and encouraged me to keep going.` : '';
  const context = overtrained ? ' I pushed harder than I could recover from.' : discovery ? ` The technique came especially naturally to me.${encouragement}` :
    sessions === 4 && after.lastChange <= 1 ? ' Progress felt slow, so I left myself a smaller goal for next time.' : '';
  const story = {
    practice: `I worked on ${definition.name} at my own pace.`,
    class: `I practiced ${definition.name} in a group and compared notes afterward.`,
    course: `I finished a short ${definition.name} course and tried the final exercise.`,
    coaching: `I took a private ${definition.name} lesson and worked on the coach’s feedback.`,
  }[method];
  recordNotice(life, 'life', title, `${story}${context}`, { bank: -training.fee,
    stress: overtrained ? 4 : method === 'practice' ? 0 : 1, health: overtrained ? -2 : 0 }, 'training').meter =
    resultMeter(definition.name, before.proficiency, after.proficiency);
  return null;
}

export function hobbyIssue(life: Life, id: SkillId, enabled: boolean) {
  const blocked = openingIssue(life);
  if (blocked) return blocked;
  if (!isSkillId(id) || typeof enabled !== 'boolean') return 'Choose a valid hobby.';
  if (life.skills.hobbies.includes(id) === enabled) return 'Your hobbies are already up to date.';
  if (!enabled) return null;
  if (skillAt(life, id).firstYear == null) return 'Try this skill before adding it as a hobby.';
  return life.skills.hobbies.length >= skillLimits.hobbies ? 'You can follow up to four hobbies.' : null;
}

export function setHobby(life: Life, id: SkillId, enabled: boolean) {
  const issue = hobbyIssue(life, id, enabled);
  if (issue) return issue;
  life.skills.hobbies = enabled ? [...life.skills.hobbies, id] : life.skills.hobbies.filter((hobby) => hobby !== id);
  return null;
}

export function ageSkills(life: Life) {
  life.skills.annual = newSkillYear();
  for (const id of Object.keys(life.skills.entries) as SkillId[]) {
    const progress = life.skills.entries[id]!;
    if (!progress.proficiency || progress.lastYear == null) continue;
    const physical = physicalSkill(id);
    const inactivity = life.year - progress.lastYear;
    if (inactivity < (physical ? 4 : 6)) continue;
    const loss = physical && life.character.age >= 60 ? 2 : 1;
    const retained = Math.round(progress.best * (physical ? .3 : .55));
    const proficiency = Math.max(retained, progress.proficiency - loss);
    if (proficiency !== progress.proficiency) {
      life.skills.entries[id] = { ...progress, proficiency, lastChange: proficiency - progress.proficiency };
    }
  }
}
