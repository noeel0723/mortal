import { useLayoutEffect, useRef } from 'react';
import { eventById } from '../src/data/events';
import { educationLabels } from '../src/data/veyra';
import { findContact, isSchoolStage } from '../src/engine/school';
import type { Character, JournalEntry, Life, Stat } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { PlayPage, PlayPageHeader } from './playPages';
import type { GamePage, Navigate } from './playPages';
import { Button, Feedback } from './ui';

const primaryStats = ['happiness', 'health', 'smarts', 'looks'] as const;

function Profile({ character }: { character: Character }) {
  const name = `${character.firstName} ${character.lastName}`;
  const initials = [character.firstName, character.lastName].map((value) => Array.from(value)[0]).join('').toUpperCase();
  const education = educationLabels[character.education];
  const status = isSchoolStage(character.education) ? `${education} student` : education;
  return (
    <section className="character" aria-label="Life overview">
      <div className="profile-identity">
        <div className="initials" aria-hidden="true">{initials}</div>
        <div><h2>{name}</h2><p>{en.age(character.age)} · {status}</p></div>
      </div>
      <div className="profile-balance">
        <strong>{money(character.bank)}</strong>
        <span>Balance</span>
      </div>
    </section>
  );
}

function LifeStats({ character, go }: { character: Character; go: Navigate }) {
  return (
    <section className="life-stats" aria-label="Life statistics">
      <div className="stats-heading">
        <h2>Life Stats</h2>
        <Button icon="stats" kind="quiet" onClick={() => go('statistics')}>Details</Button>
      </div>
      <div className="profile-stats">{primaryStats.map((stat) => (
        <div className={`stat stat--${stat}`} key={stat}>
          <span>{statLabels[stat]}</span>
          <progress aria-label={statLabels[stat]} max={100} value={character.attributes[stat]} />
          <strong>{character.attributes[stat]}%</strong>
        </div>
      ))}</div>
    </section>
  );
}

function Journal({ life, go }: { life: Life; go: Navigate }) {
  const { busy, dispatch } = useGame();
  const groups = new Map<number, JournalEntry[]>();
  for (const entry of life.journal) {
    const entries = groups.get(entry.age);
    if (entries) entries.push(entry);
    else groups.set(entry.age, [entry]);
  }
  const latestId = life.pending;
  const pending = latestId ? eventById.get(latestId) : undefined;
  return (
    <section className="journal" aria-labelledby="journal-heading">
      <header className="journal-header">
        <div className="journal-title">
          <h1 id="journal-heading">{en.lifeJournal}</h1>
          <p>{life.character.city} · {life.year}</p>
        </div>
        <Button icon="world" kind="quiet" onClick={() => go('world')}>World</Button>
      </header>
      <div className="timeline">
        {Array.from(groups, ([age, entries]) => (
          <section key={age} className="timeline-group">
            <h2><span>{en.age(age)}</span>{' '}<span className="journal-year">{life.character.birthYear + age}</span></h2>
            {entries.map((entry, index) => {
              const changes = Object.entries(entry.changes);
              return <article className="timeline-event" key={index}>
                <p id={pending?.text === entry.text ? 'pending-event' : undefined}>{entry.text}</p>
                {changes.length > 0 && <div className="event-changes">{changes.map(([stat, amount]) =>
                  <span key={stat}>{stat === 'bank' ? `${amount > 0 ? '+' : ''}${money(amount)}` : `${statLabels[stat as Stat]} ${amount > 0 ? '+' : ''}${amount}`}</span>
                )}</div>}
              </article>;
            })}
          </section>
        ))}
      </div>
      {pending && pending.choices && <section className="decision" aria-labelledby="decision-heading" aria-describedby="pending-event">
        <h2 id="decision-heading">What will you do?</h2>
        <div className="decision-actions">{pending.choices.map((choice) => <Button key={choice.id} icon={choice.emoji} disabled={busy}
          onClick={() => void dispatch({ type: 'choose', event: pending.id, choice: choice.id })}>{choice.label}</Button>)}</div>
      </section>}
      {life.character.causeOfDeath && <div className="journal-footer">
        <Button icon="history" onClick={() => go('summary')}>Life Summary</Button>
      </div>}
    </section>
  );
}

const navigation = [
  { page: 'career', icon: 'career', label: 'Career' },
  { page: 'assets', icon: 'assets', label: 'Assets' },
  { page: 'age', icon: 'age', label: 'Age Up' },
  { page: 'relationships', icon: 'relationships', label: 'Family' },
  { page: 'activities', icon: 'activities', label: 'Activities' },
] as const satisfies readonly { page: GamePage | 'age'; icon: Emoji; label: string }[];

export function Play({ life, page, personId, go, home, newLife }: {
  life: Life; page: GamePage; personId?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, problem, notice, haptics, dispatch } = useGame();
  const viewport = useRef<HTMLDivElement>(null);
  const journalLength = page === 'journal' ? life.journal.length : 0;
  const journalAge = page === 'journal' ? life.character.age : 0;
  useLayoutEffect(() => {
    const region = viewport.current;
    if (region) region.scrollTop = page === 'journal' ? region.scrollHeight : 0;
  }, [page, personId, journalLength, journalAge]);

  async function age() {
    if (await dispatch({ type: 'age' })) {
      if (haptics) navigator.vibrate?.(26);
      const ended = useGame.getState().slot?.life.character.causeOfDeath;
      if (ended) go('summary');
    }
  }
  const isJournal = page === 'journal';
  const enrolled = isSchoolStage(life.character.education);
  const person = findContact(life, personId);
  return (
    <main className="game" id="main">
      <Profile character={life.character} />
      {!isJournal && <PlayPageHeader page={page} person={person} enrolled={enrolled} go={go} />}
      <div className={`game-content${isJournal ? '' : ' game-content--page'}`} ref={viewport} tabIndex={0} role="region"
        aria-label={isJournal ? 'Journal entries' : undefined} aria-labelledby={isJournal ? undefined : 'play-page-title'}>
        {isJournal ? <Journal life={life} go={go} /> :
          <PlayPage life={life} page={page} person={person} go={go} home={home} newLife={newLife} />}
        {life.pending && !isJournal && <Button className="game-message" icon="life" onClick={() => go('journal')}>Resolve decision in journal</Button>}
        {page !== 'settings' && <Feedback error={problem} notice={notice} />}
      </div>
      {isJournal && !life.character.causeOfDeath && <nav className="bottom-nav" aria-label="Life actions">
        {navigation.map((item) => {
          if (item.page === 'age') return <Button key={item.page} icon={item.icon} kind="primary" className="age-button"
            disabled={busy || !!life.pending} onClick={() => void age()}>{item.label}</Button>;
          const isSchool = item.page === 'career' && enrolled;
          const destination = isSchool ? 'education' : item.page;
          return <Button key={item.page} icon={isSchool ? 'school' : item.icon} kind="quiet"
            onClick={() => go(destination)}>{isSchool ? 'School' : item.label}</Button>;
        })}
      </nav>}
      {isJournal && <LifeStats character={life.character} go={go} />}
    </main>
  );
}
