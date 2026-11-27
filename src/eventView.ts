import { eventById } from './data/events.ts';
import { eventTitle } from './engine/eventNotices.ts';
import { eventStory } from './engine/library.ts';
import { isSocialEvent, socialEventText } from './engine/socialEvents.ts';
import type { Action, Category, Life, ResultMeter } from './engine/types.ts';
import type { Emoji } from './theme/tokens.ts';

const categories: Record<Category, { label: string; icon: Emoji }> = {
  life: { label: 'Life Event', icon: 'life' }, family: { label: 'Family', icon: 'family' },
  school: { label: 'Education', icon: 'school' }, health: { label: 'Health', icon: 'medical' },
  community: { label: 'Community', icon: 'world' }, decision: { label: 'Consequences', icon: 'history' },
  career: { label: 'Career', icon: 'career' }, finance: { label: 'Finances', icon: 'bank' },
};

type EventPopup = {
  key: string;
  title: string;
  text: string;
  category: { label: string; icon: Emoji };
  actions: { label: string; icon: Emoji; action: Action }[];
  dismiss?: Action;
  meter?: ResultMeter;
};

export function eventPopup(life: Life): EventPopup | undefined {
  const event = life.pending ? eventById.get(life.pending) : undefined;
  if (event?.choices?.length) return {
    key: `decision-${event.id}`, title: eventTitle(event.id.replace(/^social-/, '')),
    text: isSocialEvent(event.id) ? socialEventText(life, event) : eventStory(life, event), category: categories[event.category],
    actions: event.choices.map((choice) => ({ label: choice.label, icon: choice.emoji,
      action: { type: 'choose', event: event.id, choice: choice.id } })),
  };

  const notice = life.notices[0];
  if (!notice) return;
  const entry = life.journal[notice.entry]!;
  const dismiss = { type: 'acknowledge-event', entry: notice.entry } as const;
  return { key: `notice-${notice.entry}`, title: notice.title, text: entry.text, category: categories[entry.category],
    meter: notice.meter, dismiss, actions: [{ label: 'Continue', icon: 'next', action: dismiss }] };
}

export function resultChange(change: number) {
  if (!change) return '0 pts';
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} pts`;
}
