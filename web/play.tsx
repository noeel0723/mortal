import { useEffect, useRef } from 'react';
import { eventById } from '../src/data/events';
import { backgroundLabels, cities, cityDescriptions, educationLabels, talentLabels } from '../src/data/veyra';
import { activities, activityIssue, talkIssue } from '../src/engine/simulation';
import { stats } from '../src/engine/types';
import type { Character, JournalEntry, Life, Stat } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { Achievements, Settings } from './menu';
import { Button, Feedback, Heading, Icon, Rows } from './ui';

export const gamePages = [
  'journal', 'career', 'education', 'relationships', 'person', 'family-tree', 'assets', 'activities',
  'statistics', 'world', 'menu', 'settings', 'achievements', 'summary',
] as const;
export type GamePage = typeof gamePages[number];
type Navigate = (page: GamePage, detail?: string) => void;

const primaryStats = ['health', 'happiness', 'smarts', 'looks'] as const;
const categories: Record<JournalEntry['category'], string> = {
  life: 'Life', school: 'School', health: 'Health', family: 'Family', community: 'Community', decision: 'Decision',
};

function Profile({ character, year, go }: { character: Character; year: number; go: Navigate }) {
  const name = `${character.firstName} ${character.lastName}`;
  const initials = [character.firstName, character.lastName].map((value) => Array.from(value)[0]).join('').toUpperCase();
  return (
    <aside className="surface character" aria-label="Life overview">
      <div className="profile-identity">
        <div className="initials" aria-hidden="true">{initials}</div>
        <div><h2>{name}</h2><p>{en.age(character.age)} · {character.city}</p></div>
      </div>
      <div className="profile-meta"><span>{educationLabels[character.education]}</span><span>{year}</span></div>
      <div className="profile-stats">{primaryStats.map((stat) => <div className={`stat stat--${stat}`} key={stat}>
        <div><span>{statLabels[stat]}</span><strong>{character.attributes[stat]}%</strong></div>
        <progress aria-label={statLabels[stat]} max={100} value={character.attributes[stat]} />
      </div>)}</div>
      <div className="profile-footer">
        <span>Balance <strong>{money(character.bank)}</strong></span>
        <Button icon="stats" kind="quiet" onClick={() => go('statistics')}>Statistics</Button>
      </div>
    </aside>
  );
}

function Journal({ life, go }: { life: Life; go: Navigate }) {
  const { busy, dispatch } = useGame();
  const timeline = useRef<HTMLDivElement>(null);
  const groups = new Map<number, JournalEntry[]>();
  for (const entry of life.journal) {
    const entries = groups.get(entry.age);
    if (entries) entries.push(entry);
    else groups.set(entry.age, [entry]);
  }
  const latestId = life.pending;
  const pending = latestId ? eventById.get(latestId) : undefined;
  const latestLength = life.journal.length;
  const characterAge = life.character.age;
  useEffect(() => {
    const list = timeline.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [latestLength, characterAge]);
  return (
    <section className="surface journal" aria-labelledby="journal-heading">
      <header className="journal-header">
        <div><h1 id="journal-heading">{en.lifeJournal}</h1><p>{life.character.city}, Veyra</p></div>
        <Button icon="world" kind="quiet" onClick={() => go('world')}>World</Button>
      </header>
      <div className="timeline" ref={timeline} tabIndex={0} aria-label="Journal entries">
        {Array.from(groups, ([age, entries]) => (
          <section key={age} className="timeline-group">
            <h2><span>{age ? en.age(age) : en.birth}</span><time>{life.character.birthYear + age}</time></h2>
            {entries.map((entry, index) => {
              const changes = Object.entries(entry.changes);
              return <article className="timeline-event" key={index}>
                <small>{categories[entry.category]}</small>
                <p>{entry.text}</p>
                {changes.length > 0 && <div className="event-changes">{changes.map(([stat, amount]) =>
                  <span key={stat}>{stat === 'bank' ? `${amount > 0 ? '+' : ''}${money(amount)}` : `${statLabels[stat as Stat]} ${amount > 0 ? '+' : ''}${amount}`}</span>
                )}</div>}
              </article>;
            })}
          </section>
        ))}
      </div>
      {pending && pending.choices && <section className="decision" aria-labelledby="decision-heading">
        <h2 id="decision-heading">What will you do?</h2>
        <p>{pending.text}</p>
        <div className="decision-actions">{pending.choices.map((choice) => <Button key={choice.id} icon={choice.emoji} disabled={busy}
          onClick={() => void dispatch({ type: 'choose', event: pending.id, choice: choice.id })}>{choice.label}</Button>)}</div>
      </section>}
      {life.character.causeOfDeath && <div className="journal-footer">
        <Button icon="history" onClick={() => go('summary')}>Life Summary</Button>
      </div>}
    </section>
  );
}

const activityOptions = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', description: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', description: 'Restores energy and reduces stress.' },
  { id: 'read', icon: 'study', label: 'Read a Book', description: 'Improves smarts and happiness.' },
] as const;

function Details({ life, page, personId, go, home, newLife }: {
  life: Life; page: Exclude<GamePage, 'journal'>; personId?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, dispatch, save } = useGame();
  const { character, family } = life;
  const unavailable = busy || !!life.pending || !!character.causeOfDeath;
  const schoolAge = [6, 12, 15, 18].find((age) => age > character.age);
  const back = (path: GamePage = 'journal') => <Button icon={path === 'relationships' ? 'relationships' : path === 'career' ? 'career' : 'life'} kind="quiet" onClick={() => go(path)}>
    {path === 'relationships' ? 'Relationships' : path === 'career' ? 'Career' : 'Journal'}
  </Button>;
  switch (page) {
    case 'career':
    case 'education': {
      const issue = activityIssue(life, 'study');
      return <>
        <Heading title={page === 'career' ? 'Career' : 'Education'} action={back(page === 'career' ? 'journal' : 'career')} />
        <Rows items={[
          { label: 'Education', value: educationLabels[character.education] },
          ...(schoolAge ? [{ label: 'Next milestone', value: en.age(schoolAge) }] : []),
          { label: 'Energy', value: `${character.attributes.energy}%` },
        ]} />
        {page === 'career' ? <Button icon="school" onClick={() => go('education')}>View Education</Button> :
          <div className="inline-action"><Button icon="study" disabled={unavailable || !!issue} onClick={() => void dispatch({ type: 'activity', activity: 'study' })}>Study Harder</Button>
            <p>{issue ?? 'Uses 16 energy. Improves smarts and discipline.'}</p></div>}
      </>;
    }
    case 'relationships':
    case 'family-tree':
      return <>
        <Heading title={page === 'family-tree' ? 'Family Tree' : 'Relationships'} action={back(page === 'family-tree' ? 'relationships' : 'journal')} />
        <h2>{page === 'family-tree' ? 'Parents' : 'Family'}</h2>
        <div className="family-grid">{family.map((person) => <div key={person.id}>
          <Button icon="person" onClick={() => go('person', person.id)}>{person.name}</Button>
          <small>{person.role} · {person.alive ? en.age(person.age) : 'Deceased'}</small>
        </div>)}</div>
        {page === 'family-tree' ? <div className="tree-you"><Icon name="tree" /><strong>{character.firstName} {character.lastName}</strong><small>Born {character.birthYear}</small></div>
          : <Button icon="tree" onClick={() => go('family-tree')}>Family Tree</Button>}
      </>;
    case 'person': {
      const person = family.find((item) => item.id === personId);
      if (!person) return <Heading title="Family member unavailable" action={back('relationships')} />;
      const issue = talkIssue(life, person.id);
      return <>
        <Heading title={person.name} detail={person.role} action={back('relationships')} />
        <Rows items={[
          { label: person.alive ? 'Age' : 'Age at death', value: person.age },
          { label: 'City', value: person.city }, { label: 'Occupation', value: person.occupation },
        ]} />
        <h2>Your bond</h2>
        <Rows items={Object.entries(person.bond).map(([label, value]) => ({
          label: label.charAt(0).toUpperCase() + label.slice(1), value: `${value}%`,
        }))} />
        <div className="inline-action"><Button icon="talk" disabled={unavailable || !!issue} onClick={() => void dispatch({ type: 'talk', person: person.id })}>Have a Conversation</Button>
          <p>{issue ?? 'Uses 8 energy. Strengthens affection and trust.'}</p></div>
      </>;
    }
    case 'assets':
      return <>
        <Heading title="Assets" detail="Bank account and transaction history" action={back()} />
        <Rows items={[{ label: 'Balance', value: money(character.bank) }]} />
        <h2>Transactions</h2>
        {life.transactions.length ? <Rows items={[...life.transactions].reverse().map((item, index) => ({
          key: String(index), label: `${item.year} · ${item.label}`, value: money(item.amount),
        }))} /> : <p>No transactions yet.</p>}
      </>;
    case 'activities':
      return <>
        <Heading title="Activities" detail={`Energy ${character.attributes.energy}%`} action={back()} />
        <div className="activity-list">{activityOptions.map((item) => {
          const issue = activityIssue(life, item.id);
          const cost = activities[item.id].energy;
          return <div className="inline-action" key={item.id}><Button icon={item.icon} disabled={unavailable || !!issue}
            onClick={() => void dispatch({ type: 'activity', activity: item.id })}>{item.label}</Button>
            <p>{issue ?? `${item.description}${cost ? ` Uses ${cost} energy.` : ''}`}</p></div>;
        })}</div>
      </>;
    case 'statistics':
      return <>
        <Heading title="Life Statistics" action={back()} />
        <Rows items={stats.map((stat) => ({ label: statLabels[stat], value: `${character.attributes[stat]}%` }))} />
        <h2>Background</h2>
        <Rows items={[
          { label: 'Personality', value: character.personality },
          { label: 'Natural talent', value: character.talent ? talentLabels[character.talent] : 'None' },
          { label: 'Family background', value: backgroundLabels[character.background] },
        ]} />
      </>;
    case 'world':
      return <>
        <Heading title="World" detail="Veyra · Fictional world" action={back()} />
        <Rows items={[{ label: 'Simulation year', value: life.year }, { label: 'Your city', value: character.city }]} />
        <div className="city-list">{cities.map((city) => <article key={city}><h2>{city}</h2><p>{cityDescriptions[city]}</p></article>)}</div>
      </>;
    case 'menu':
      return <>
        <Heading title="Life Menu" detail="Progress saves after every action." action={back()} />
        <div className="action-stack">
          <Button icon="save" onClick={() => void save()} disabled={busy}>Save Life</Button>
          <Button icon="trophy" onClick={() => go('achievements')}>Achievements</Button>
          <Button icon="settings" onClick={() => go('settings')}>Settings</Button>
          <Button icon="home" onClick={home}>Main Menu</Button>
        </div>
      </>;
    case 'settings':
      return <><Heading title="Settings" action={back()} /><Settings /></>;
    case 'achievements':
      return <><Heading title="Achievements" detail="Milestones across your saved lives." action={back()} /><Achievements /></>;
    case 'summary': {
      if (!character.causeOfDeath) return <Heading title="Life in progress" action={back()} />;
      const turningPoints = life.journal.filter((entry) => entry.category === 'decision' || entry.category === 'school').slice(-4);
      return <>
        <Heading title="Life Summary" detail={`${character.firstName} ${character.lastName} · ${character.birthYear}–${life.year}`} />
        <Rows items={[
          { label: 'Age at death', value: character.age }, { label: 'Cause of death', value: character.causeOfDeath },
          { label: 'Education', value: educationLabels[character.education] }, { label: 'Final bank balance', value: money(character.bank) },
          ...family.map((person) => ({ label: person.role, value: person.name })),
        ]} />
        {turningPoints.length > 0 && <section><h2>Turning points</h2><ul className="turning-points">
          {turningPoints.map((entry, index) => <li key={index}>{en.age(entry.age)} · {entry.text}</li>)}</ul></section>}
        <div className="decision-actions">
          <Button icon="life" onClick={() => go('journal')}>Review Life Story</Button>
          <Button icon="new" kind="primary" onClick={newLife}>Start a New Life</Button>
          <Button icon="home" kind="quiet" onClick={home}>Main Menu</Button>
        </div>
      </>;
    }
  }
}

const navigation = [
  { page: 'career', icon: 'career', label: 'Career' },
  { page: 'relationships', icon: 'relationships', label: 'Relationships' },
  { page: 'age', icon: 'age', label: 'Age Up' },
  { page: 'assets', icon: 'assets', label: 'Assets' },
  { page: 'activities', icon: 'activities', label: 'Activities' },
] as const satisfies readonly { page: GamePage | 'age'; icon: Emoji; label: string }[];

export function Play({ life, page, personId, go, home, newLife }: {
  life: Life; page: GamePage; personId?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, problem, notice, haptics, dispatch } = useGame();
  async function age() {
    if (await dispatch({ type: 'age' })) {
      if (haptics) navigator.vibrate?.(26);
      const ended = useGame.getState().slot?.life.character.causeOfDeath;
      if (ended || page !== 'journal') go(ended ? 'summary' : 'journal');
    }
  }
  const selectedPage = page === 'education' ? 'career' : page === 'family-tree' || page === 'person' ? 'relationships' : page;
  return (
    <main className="game" id="main">
      <div className="game-grid">
        <Profile character={life.character} year={life.year} go={go} />
        <div className="game-content">
          {page === 'journal' ? <Journal life={life} go={go} /> :
            <section className="surface panel"><Details life={life} page={page} personId={personId} go={go} home={home} newLife={newLife} /></section>}
          {life.pending && page !== 'journal' && <Button icon="life" onClick={() => go('journal')}>Resolve decision in journal</Button>}
          {page !== 'settings' && <Feedback error={problem} notice={notice} />}
        </div>
      </div>
      {!life.character.causeOfDeath && <nav className="bottom-nav" aria-label="Life actions">
        {navigation.map(({ page: destination, icon, label }) => destination === 'age' ?
          <Button key={destination} icon={icon} kind="primary" className="age-button" disabled={busy || !!life.pending} onClick={() => void age()}>{label}</Button> :
          <Button key={destination} icon={icon} kind="quiet" aria-current={selectedPage === destination ? 'page' : undefined}
            onClick={() => go(page === destination ? 'journal' : destination)}>{label}</Button>)}
      </nav>}
    </main>
  );
}
