import { eventById } from './data/events.ts';
import { libraryFriendEvent } from './data/libraryEvents.ts';
import { genderLabels } from './data/veyra.ts';
import { eventTitle } from './engine/eventNotices.ts';
import { drivingIssue } from './engine/familyDriving.ts';
import { birthParents, surname } from './engine/familyNames.ts';
import { eventStory, libraryGuest } from './engine/library.ts';
import { pendingMeeting } from './engine/meetings.ts';
import { datingGoals, npcLooks, npcNetWorth } from './engine/dating.ts';
import { discoveryEvent, pendingDatingProfile } from './engine/datingDiscovery.ts';
import { candidateNetWorth } from './engine/datingPool.ts';
import { barrierFee, birthControlActive, protectionEvent } from './engine/reproductiveHealth.ts';
import { isSocialEvent, socialEventText } from './engine/socialEvents.ts';
import { visibleConcerns } from './engine/relationships.ts';
import { findContact } from './engine/school.ts';
import type { Appearance } from './engine/appearance.ts';
import type { Action, CasualResponse, Category, FamilyResponse, Life, ResultMeter } from './engine/types.ts';
import type { Emoji } from './theme/tokens.ts';
import { en, money } from './i18n/en.ts';

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
  actions: { label: string; icon: Emoji; action: Action; disabled?: boolean; tone?: 'primary' | 'quiet'; destination?: 'summary' | 'journal' }[];
  dismiss?: Action;
  meter?: ResultMeter;
  special?: 'enjoyment' | 'death' | 'match' | 'family';
  enjoyment?: { key: string; label: string; value: number }[];
  portrait?: { appearance: Appearance; name: string; age: number; role: string };
  cause?: string;
  match?: { looks?: number; netWorth?: string };
  profileMeters?: { label: string; value: number }[];
  profileRows?: { label: string; value: string }[];
};

export function eventPopup(life: Life): EventPopup | undefined {
  const event = life.pending ? eventById.get(life.pending) : undefined;
  if (event?.choices?.length) {
    if (event.id === protectionEvent) {
      const quote = barrierFee(life);
      const canPay = life.character.bank >= quote;
      return {
        key: `decision-${event.id}`, title: 'Choose Protection', category: categories.health,
        text: 'Everyone must agree before continuing. Barrier protection reduces STI and pregnancy risk.' +
          (birthControlActive(life) ? ' My birth control plan reduces pregnancy risk only.' : '') +
          (canPay ? '' : ' My balance does not cover barrier protection.'),
        actions: event.choices.map(({ id, label, emoji }) => ({
          label: id === 'barrier' ? `${label} · ${money(quote)}` : label, icon: emoji,
          tone: id === 'barrier' ? 'primary' : 'quiet', disabled: id === 'barrier' && !canPay,
          action: { type: 'choose', event: protectionEvent, choice: id },
        })),
      };
    }
    const discovery = event.id === discoveryEvent ? pendingDatingProfile(life) : undefined;
    if (discovery) {
      const { person, profile, intro } = discovery;
      return {
        key: `decision-${event.id}-${person.id}`, title: 'Dating Profile', text: intro, special: 'match',
        category: categories.community,
        portrait: { appearance: person.appearance, name: person.name, age: person.age,
          role: `${en.age(person.age)} · ${genderLabels[person.gender]} · ${person.occupation}` },
        profileRows: [
          { label: 'Goal', value: datingGoals[profile.datingGoal].label },
          { label: 'Lives in', value: person.city },
          { label: 'Education', value: profile.education },
          { label: 'Interests', value: profile.interests.join(', ') },
          { label: 'Net Worth', value: money(candidateNetWorth(discovery)) },
        ],
        match: { looks: npcLooks(life, person) },
        actions: event.choices.map((choice) => ({ label: choice.label, icon: choice.emoji,
          tone: choice.id === 'like' ? 'primary' : 'quiet', action: { type: 'choose', event: event.id, choice: choice.id } })),
      };
    }
    const hookup = event.id === 'social-hookup';
    const meeting = event.id === 'social-meeting' ? pendingMeeting(life) : undefined;
    const guest = meeting?.person ?? (event.id === libraryFriendEvent ? libraryGuest(life) : undefined);
    const person = (hookup || event.id === 'social-dating-match') ? findContact(life, life.social.pendingPerson ?? undefined) : undefined;
    return {
      key: `decision-${event.id}`, title: meeting?.title ?? (event.id === 'social-affair' ? 'Caught Dating' :
        event.id === 'social-expectations' ? 'Relationship Expectations' : hookup ? 'Hook Up' : eventTitle(event.id.replace(/^social-/, ''))),
      text: meeting?.intro ?? (person ? `${person.name} ${event.text}` : isSocialEvent(event.id) ? socialEventText(life, event) : eventStory(life, event)),
      category: categories[event.category],
      ...(person && {
        special: 'match',
        portrait: { appearance: person.appearance, name: person.name, age: person.age, role: `${en.age(person.age)} · ${person.occupation}` },
        match: hookup ? { looks: npcLooks(life, person) } : { netWorth: money(npcNetWorth(life, person)) },
      }),
      ...(guest && {
        special: 'match',
        portrait: { appearance: guest.appearance, name: guest.name, age: guest.age, role: `${en.age(guest.age)} · ${genderLabels[guest.gender]}` },
        profileMeters: [{ label: 'Health', value: guest.health }, { label: 'Looks', value: npcLooks(life, guest) },
          { label: 'Compatibility', value: guest.bond.compatibility }],
      }),
      actions: event.choices.filter((choice) => event.id !== 'social-affair' || choice.id !== 'space' ||
        visibleConcerns(life, life.social.pendingPerson ?? '').some((entry) => entry.breach?.discovered)).map((choice) => ({
        label: choice.label, icon: choice.emoji, tone: (person || guest) && choice.id === 'accept' ? 'primary' : undefined,
        action: { type: 'choose', event: event.id, choice: choice.id },
      })),
    };
  }

  const notice = life.notices[0];
  if (!notice) return;
  const entry = life.journal[notice.entry]!;
  const dismiss = { type: 'acknowledge-event', entry: notice.entry } as const;
  const detail = notice.details;
  if (detail?.kind === 'casual-followup') {
    const person = findContact(life, detail.person);
    const answer = (response: CasualResponse): Action => ({ type: 'respond-casual', entry: notice.entry, response });
    return {
      key: `notice-${notice.entry}`, title: notice.title, text: entry.text, category: categories.community,
      ...(person && { special: 'match', portrait: { appearance: person.appearance, name: person.name,
        age: person.age, role: `${en.age(person.age)} · ${person.occupation}` } }),
      actions: life.character.causeOfDeath || !person?.alive ? [{ label: 'Continue', icon: 'next', action: dismiss }] : [
        { label: 'Stay in Touch', icon: 'phone', action: answer('keep-in-touch'), tone: 'primary' },
        { label: 'Remain Acquaintances', icon: 'person', action: answer('acquaintances') },
        { label: 'Express Romantic Interest', icon: 'rose', action: answer('romantic-interest') },
        { label: 'End Communication', icon: 'exit', action: answer('end-contact'), tone: 'quiet' },
      ],
    };
  }
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
  if (detail?.kind === 'birth' || detail?.kind === 'wedding-names' || detail?.kind === 'driving-lesson') {
    const person = findContact(life, detail.person);
    if (person) {
      const select = (label: string, icon: Emoji, response: FamilyResponse, tone?: 'primary' | 'quiet') =>
        ({ label, icon, action: { type: 'respond-family', entry: notice.entry, response } as const, tone });
      const actions: EventPopup['actions'] = [];
      let text = entry.text;
      let role = en.age(person.age);
      let icon: Emoji = 'car';
      if (detail.kind === 'birth') {
        icon = 'baby';
        role = `Newborn · ${genderLabels[person.gender]}`;
        text = 'Choose which parent’s surname the baby will take.';
        for (const [index, parent] of birthParents(life, person.id).entries()) {
          const owner = parent.label === 'You' ? 'Your' : `${parent.label}’s`;
          actions.push(select(`${owner} Surname · ${surname(life, parent.id)}`, 'custom', index === 0 ? 'first' : 'second', index === 0 ? 'primary' : undefined));
        }
      } else if (detail.kind === 'wedding-names') {
        icon = 'ring';
        role = 'Spouse';
        text += ' What surnames will we use after the wedding?';
        if (surname(life, person.id) !== life.character.lastName) {
          actions.push(select(`Take Their Surname · ${surname(life, person.id)}`, 'ring', 'first', 'primary'),
            select(`They Take My Surname · ${life.character.lastName}`, 'custom', 'second'));
        }
        actions.push(select('Keep Our Names', 'accept', 'keep', actions.length ? 'quiet' : 'primary'));
      } else {
        const issue = drivingIssue(life, { type: 'family-driving', mode: 'teach', person: person.id, asset: detail.asset }, true);
        if (issue) text += ` ${issue}`;
        else actions.push(select('Teach Them', 'car', 'teach', 'primary'));
        actions.push(select('Maybe Later', 'decline', 'later', 'quiet'));
      }
      return { key: `notice-${notice.entry}`, title: notice.title, text, special: 'family', category: { label: 'Family', icon },
        portrait: { appearance: person.appearance, name: person.name, age: detail.kind === 'birth' ? 0 : person.age, role },
        actions: life.character.causeOfDeath ? [{ label: 'Continue', icon: 'next', action: dismiss, tone: 'primary' }] : actions };
    }
  }
  if (notice.title === 'Pregnancy') {
    return { key: `notice-${notice.entry}`, title: notice.title, text: entry.text, special: 'family',
      category: { label: 'Family', icon: 'pregnancy' }, dismiss, actions: [{ label: 'Continue', icon: 'next', tone: 'primary', action: dismiss }] };
  }
  return { key: `notice-${notice.entry}`, title: notice.title, text: entry.text, category: categories[entry.category],
    meter: notice.meter, dismiss, actions: [{ label: 'Continue', icon: 'next', action: dismiss }] };
}

export function resultChange(change: number) {
  if (!change) return '0 pts';
  return `${change > 0 ? '+' : '−'}${Math.abs(change)} pts`;
}
