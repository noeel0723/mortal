import { eventById } from './data/events.ts';
import { eventTitle } from './engine/eventNotices.ts';
import { eventStory } from './engine/library.ts';
import { isSocialEvent, socialEventText } from './engine/socialEvents.ts';
import { visibleConcerns } from './engine/relationships.ts';
import { findContact } from './engine/school.ts';
import type { Appearance } from './engine/appearance.ts';
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
  actions: { label: string; icon: Emoji; action: Action; tone?: 'primary' | 'quiet'; destination?: 'summary' | 'journal' }[];
  dismiss?: Action;
  meter?: ResultMeter;
  special?: 'enjoyment' | 'death';
  enjoyment?: { key: string; label: string; value: number }[];
  portrait?: { appearance: Appearance; name: string; age: number; role: string };
  cause?: string;
};

export function eventPopup(life: Life): EventPopup | undefined {
  const event = life.pending ? eventById.get(life.pending) : undefined;
  if (event?.choices?.length) return {
    key: `decision-${event.id}`, title: event.id === 'social-affair' ? 'Caught Dating' :
      event.id === 'social-hookup' ? 'Hook Up' : eventTitle(event.id.replace(/^social-/, '')),
    text: isSocialEvent(event.id) ? socialEventText(life, event) : eventStory(life, event), category: categories[event.category],
    actions: event.choices.filter((choice) => event.id !== 'social-affair' || choice.id !== 'space' ||
      visibleConcerns(life, life.social.pendingPerson ?? '').some((entry) => entry.breach?.discovered)).map((choice) => ({ label: choice.label, icon: choice.emoji,
      action: { type: 'choose', event: event.id, choice: choice.id } })),
  };

  const notice = life.notices[0];
  if (!notice) return;
  const entry = life.journal[notice.entry]!;
  const dismiss = { type: 'acknowledge-event', entry: notice.entry } as const;
  const detail = notice.details;
  const death = detail?.kind === 'death' ? detail : notice.title === 'End of Life' && life.character.causeOfDeath ?
    { person: 'self', age: life.character.age, role: 'Your Character', cause: life.character.causeOfDeath } : undefined;
  if (death) {
    const player = death.person === 'self';
    const person = player ? life.character : findContact(life, death.person);
    if (person) {
      const name = 'name' in person ? person.name : `${person.firstName} ${person.lastName}`;
      const response = (response: 'honor' | 'skip' | 'surprise'): Action => ({ type: 'respond-death', entry: notice.entry, response });
      return {
        key: `notice-${notice.entry}`, title: notice.title, special: 'death', category: categories[entry.category], cause: death.cause,
        portrait: { appearance: person.appearance, name, age: death.age, role: death.role },
        text: player ? `Your life ended at age ${death.age}.` : `${name} passed away at age ${death.age}.`,
        actions: player ? [
          { label: 'View Life Summary', icon: 'history', tone: 'primary', action: dismiss, destination: 'summary' },
          { label: 'Review Life Journal', icon: 'life', action: dismiss, destination: 'journal' },
        ] : life.character.causeOfDeath ? [{ label: 'Continue', icon: 'next', tone: 'primary', action: dismiss }] : [
          { label: person.city === life.character.city ? 'Attend Funeral' : 'Send Condolences', icon: 'remembrance', tone: 'primary', action: response('honor') },
          { label: 'Skip Funeral', icon: 'decline', action: response('skip') },
          { label: 'Surprise Me', icon: 'random', tone: 'quiet', action: response('surprise') },
        ],
      };
    }
  }
  if (detail?.kind === 'enjoyment') {
    return {
      key: `notice-${notice.entry}`, title: notice.title, special: 'enjoyment', text: entry.text, category: categories[entry.category],
      enjoyment: detail.scores.map(({ person, value }) => ({ key: person, value,
        label: person === 'self' ? 'Your Enjoyment' : `${findContact(life, person)?.name ?? 'Guest'}’s Enjoyment` })),
      dismiss, actions: [{ label: 'Continue', icon: 'next', tone: 'primary', action: dismiss }],
    };
  }
  return { key: `notice-${notice.entry}`, title: notice.title, text: entry.text, category: categories[entry.category],
    meter: notice.meter, dismiss, actions: [{ label: 'Continue', icon: 'next', action: dismiss }] };
}

export function resultChange(change: number) {
  if (!change) return '0 pts';
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} pts`;
}
