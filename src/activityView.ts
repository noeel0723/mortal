import { activityIssue } from './engine/simulation.ts';
import { lifestyle, lifestyleIssue } from './engine/lifestyle.ts';
import { lifestyleIds, skillLimits } from './engine/skillTypes.ts';
import type { Action, Life } from './engine/types.ts';
import { meetingControls } from './socialView.ts';
import type { Emoji } from './theme/tokens.ts';
import { money } from './i18n/en.ts';

export type ActivityControl = { label: string; icon: Emoji; detail?: string; issue: string | null; action: Action };

const library = { id: 'go-to-library', icon: 'library', label: 'Go to Library', detail: 'Read, explore the shelves, and meet other readers.' } as const;
const wellbeing = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', detail: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', detail: 'Restores energy and reduces stress.' },
] as const;

function personalActivity(life: Life, item: typeof library | typeof wellbeing[number]) {
  return {
    label: item.label, icon: item.icon, detail: item.detail,
    issue: life.character.causeOfDeath ? 'This life has ended.' : life.pending ? 'Resolve the pending decision first.' : activityIssue(life, item.id),
    action: { type: 'activity', activity: item.id } as const,
  };
}

export function wellbeingActivities(life: Life): ActivityControl[] {
  return wellbeing.map((item) => personalActivity(life, item));
}

export function socialActivities(life: Life): ActivityControl[] {
  return [...meetingControls(life, false), personalActivity(life, library)];
}

export function lifestyleActivities(life: Life, section: string): ActivityControl[] {
  return lifestyleIds.filter((id) => lifestyle[id].section === section).map((id) => {
    const { label, icon, cost } = lifestyle[id];
    const tapered = (life.skills.annual.lifestyle[id] ?? 0) >= skillLimits.lifestyleBenefits;
    return { label, icon, detail: tapered ? 'No further benefits this year' : cost ? money(cost) : undefined,
      issue: lifestyleIssue(life, id), action: { type: 'lifestyle', activity: id } };
  });
}
