import { activityIssue } from './engine/simulation.ts';
import { lifestyle, lifestyleIssue } from './engine/lifestyle.ts';
import { lifestyleIds, skillLimits } from './engine/skillTypes.ts';
import type { Action, Life } from './engine/types.ts';
import type { Emoji } from './theme/tokens.ts';
import { money } from './i18n/en.ts';

export type ActivityControl = { label: string; icon: Emoji; detail?: string; issue: string | null; action: Action };

const wellbeing = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', detail: 'Get moving and ease stress' },
  { id: 'rest', icon: 'rest', label: 'Rest', detail: 'Reduce stress' },
] as const;

function personalActivity(life: Life, item: typeof wellbeing[number]) {
  return {
    label: item.label, icon: item.icon, detail: item.detail,
    issue: life.character.causeOfDeath ? 'This life has ended.' : life.pending ? 'Resolve the pending decision first.' : activityIssue(life, item.id),
    action: { type: 'activity', activity: item.id } as const,
  };
}

export function mindAndBodyActivities(life: Life): ActivityControl[] {
  return [...wellbeing.map((item) => personalActivity(life, item)), ...lifestyleActivities(life, 'Mind & Body')];
}

export function lifestyleActivities(life: Life, section: 'Mind & Body' | 'Travel'): ActivityControl[] {
  return lifestyleIds.filter((id) => lifestyle[id].section === section).map((id) => {
    const { label, icon, cost, description } = lifestyle[id];
    const tapered = (life.skills.annual.lifestyle[id] ?? 0) >= skillLimits.lifestyleBenefits;
    return { label, icon, detail: tapered ? 'No more benefits this year' : cost ? `${description} · ${money(cost)}` : description,
      issue: lifestyleIssue(life, id), action: { type: 'lifestyle', activity: id } };
  });
}
