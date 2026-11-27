import { skillIds, skills } from '../data/skills.ts';
import { skillsForInterest } from './hobbies.ts';
import { npcProfile } from './npcs.ts';
import { skillRandom } from './skills.ts';
import { skillLimits } from './skillTypes.ts';
import type { ChildInterest } from './skillTypes.ts';
import type { Contact, Life } from './types.ts';

function updateInterests(life: Life, child: Contact) {
  const existing = life.skills.children[child.id] ?? [];
  if (child.age < 4 || child.age >= 18) return existing;
  const slots = Math.min(skillLimits.childInterests, child.age < 9 ? 1 : child.age < 14 ? 2 : 3);
  if (existing.length >= slots) return existing;
  const eligible = skillIds.filter((id) => skills[id].age <= child.age && !existing.some((entry) => entry.skill === id));
  const preferences = npcProfile(life, child).interests.flatMap(skillsForInterest).filter((id) => eligible.includes(id));
  const random = skillRandom(life.seed, `child-hobby:${child.id}:${existing.length}`);
  const options = preferences.length ? preferences : eligible;
  const skill = options[random.integer(0, options.length - 1)]!;
  const interest: ChildInterest = { skill, proficiency: 0, lastSupported: null };
  const updated = [...existing, interest];
  life.skills.children[child.id] = updated;
  return updated;
}

export function developChildInterests(life: Life) {
  for (const child of life.social.people) {
    if (child.role !== 'Child' || !child.alive || child.age < 4 || child.age >= 18) continue;
    const record = life.social.children[child.id]!;
    const random = skillRandom(life.seed, `child-practice:${child.id}:${life.year}`);
    life.skills.children[child.id] = updateInterests(life, child).map((entry) => {
      const gain = random.integer(0, 2) + Number(record.learning > 55 || record.confidence >= 70);
      return { ...entry, proficiency: entry.proficiency >= 60 ? entry.proficiency : Math.min(60, entry.proficiency + gain) };
    });
  }
}

export function supportChildHobby(life: Life, child: Contact, lesson: boolean) {
  const interests = updateInterests(life, child);
  const chosen = interests.reduce<ChildInterest | undefined>((best, entry) => !best ||
    (entry.lastSupported ?? 0) < (best.lastSupported ?? 0) ? entry : best, undefined);
  if (!chosen) return undefined;
  const chosenId = chosen.skill;
  const proficiency = Math.min(75, chosen.proficiency + (lesson ? 5 : 2));
  life.skills.children[child.id] = interests.map((entry) => entry.skill === chosenId ? { ...entry, proficiency, lastSupported: life.year } : entry);
  return { name: skills[chosenId].name, before: chosen.proficiency, proficiency };
}
