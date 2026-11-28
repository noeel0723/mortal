import { useLayoutEffect, useRef } from 'react';
import { eventPopup, resultChange } from '../src/eventView';
import { educationStatus } from '../src/engine/academics';
import { findContact, isSchoolStage } from '../src/engine/school';
import type { Character, JournalEntry, Life, Stat } from '../src/engine/types';
import { educationTab } from '../src/educationView';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { PageMeter, PlayPage, PlayPageHeader, backgroundPage } from './playPages';
import type { GamePage, Navigate } from './playPages';
import { Button, Feedback, Icon, Rows } from './ui';
import { DetailDialog } from './detailDialog';
import { Portrait } from './portraits';

const primaryStats = ['happiness', 'health', 'smarts', 'looks'] as const;

function Profile({ life, open }: { life: Life; open: () => void }) {
  const { character } = life;
  const name = `${character.firstName} ${character.lastName}`;
  const education = educationStatus(life);
  const status = isSchoolStage(life.academic.enrollment?.level) ? `${education} student` : education;
  return (
    <section className="character" aria-label="Life overview">
      <div className="profile-identity">
        <button type="button" className="profile-portrait-button" aria-label="Open my profile" onClick={open}>
          <Portrait appearance={character.appearance} age={character.age} />
        </button>
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
  const groups = new Map<number, JournalEntry[]>();
  for (const entry of life.journal) {
    const entries = groups.get(entry.age);
    if (entries) entries.push(entry);
    else groups.set(entry.age, [entry]);
  }
  return (
    <section className="journal" aria-labelledby="journal-heading">
      <h1 id="journal-heading" className="journal-accessible-title">{en.lifeJournal}</h1>
      <div className="timeline">
        {Array.from(groups, ([age, entries]) => (
          <section key={age} className="timeline-group">
            <h2>{en.age(age)}</h2>
            {entries.map((entry, index) => {
              const changes = Object.entries(entry.changes);
              return <article className="timeline-event" key={index}>
                <p><span>{entry.text}</span>{changes.length > 0 && <span className="event-changes">{' · '}{changes.map(([stat, amount]) =>
                  stat === 'bank' ? `${amount > 0 ? '+' : ''}${money(amount)}` : `${statLabels[stat as Stat]} ${amount > 0 ? '+' : ''}${amount}`
                ).join(' · ')}</span>}</p>
              </article>;
            })}
          </section>
        ))}
      </div>
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
  const visiblePage = backgroundPage(page);
  const journalLength = page === 'journal' ? life.journal.length : 0;
  const journalAge = page === 'journal' ? life.character.age : 0;
  useLayoutEffect(() => {
    const region = viewport.current;
    if (region) region.scrollTop = visiblePage === 'journal' ? region.scrollHeight : 0;
  }, [visiblePage, personId, journalLength, journalAge]);

  async function age() {
    if (await dispatch({ type: 'age' })) {
      if (haptics) navigator.vibrate?.(26);
    }
  }
  const isJournal = page === 'journal';
  const schoolTitle = life.academic.enrollment ? educationTab(life) : undefined;
  const person = findContact(life, personId);
  const popup = eventPopup(life);
  const dismiss = popup?.dismiss;
  return (
    <main className="game" id="main">
      <Profile life={life} open={() => go('player-profile')} />
      {visiblePage !== 'journal' && <PlayPageHeader page={visiblePage} person={person} schoolTitle={schoolTitle} detail={personId} go={go} />}
      <div className={`game-content${isJournal ? '' : ' game-content--page'}`} data-play-page={visiblePage} ref={viewport} tabIndex={0} role="region"
        aria-label={isJournal ? 'Journal entries' : undefined} aria-labelledby={isJournal ? undefined : 'play-page-title'}>
        {isJournal ? <Journal life={life} go={go} /> :
          <PlayPage life={life} page={page} person={person} detail={personId} go={go} home={home} newLife={newLife} />}
        {page !== 'settings' && !popup && <Feedback error={problem} notice={notice} />}
      </div>
      {isJournal && !life.character.causeOfDeath && <nav className="bottom-nav" aria-label="Life actions">
        {navigation.map((item) => {
          if (item.page === 'age') return <Button key={item.page} icon={item.icon} kind="primary" className="age-button"
            disabled={busy || !!popup} onClick={() => void age()}>{item.label}</Button>;
          const isSchool = item.page === 'career' && !!schoolTitle;
          const destination = isSchool ? 'education' : item.page;
          return <Button key={item.page} icon={isSchool ? 'school' : item.icon} kind="quiet"
            onClick={() => go(destination)}>{isSchool ? schoolTitle : item.label}</Button>;
        })}
      </nav>}
      {isJournal && <LifeStats character={life.character} go={go} />}
      {popup && <DetailDialog key={popup.key} eventKey={popup.key} title={popup.title} special={popup.special}
        identity={popup.portrait && <div className="event-identity">
          <Portrait appearance={popup.portrait.appearance} age={popup.portrait.age} label={`Portrait of ${popup.portrait.name}`} />
          <div><strong>{popup.portrait.name}</strong><span>{popup.portrait.role}</span></div>
        </div>}
        onDismiss={dismiss ? () => { if (!busy) void dispatch(dismiss); } : undefined}>
        {(!popup.special || (popup.special === 'family' && !popup.portrait)) &&
          <div className="event-category"><Icon name={popup.category.icon} />{popup.meter ? 'Activity result' : popup.category.label}</div>}
        <p className="event-story">{popup.text}</p>
        {popup.cause && <p className="event-death-cause"><span>Cause of death</span><strong>{popup.cause}</strong></p>}
        {popup.match?.netWorth && <div className="event-match-stat">
          <Rows items={[{ label: 'Net Worth', value: popup.match.netWorth }]} />
        </div>}
        {popup.match?.looks !== undefined && <div className="event-result-meter">
          <PageMeter label="Looks" value={popup.match.looks} />
        </div>}
        {popup.profileMeters && <div className="detail-bond meeting-stats">{popup.profileMeters.map((row) => <PageMeter key={row.label} {...row} />)}</div>}
        {popup.enjoyment && <div className="event-enjoyment">
          {popup.enjoyment.map(({ key, label, value }) => <PageMeter key={key} label={label} value={value} />)}
        </div>}
        {popup.meter && <div className="event-result-meter">
          <PageMeter label={popup.meter.label} value={popup.meter.value} />
          <p className="event-result-change">{resultChange(popup.meter.change)}</p>
        </div>}
        {!dismiss && !popup.special && <p className="event-question">What will you do?</p>}
        <div className="event-options">{popup.actions.map(({ label, icon, action, tone, destination }) =>
          <Button key={label} icon={icon} kind={tone ?? (dismiss ? 'primary' : 'plain')} disabled={busy}
            onClick={() => void dispatch(action).then((saved) => { if (saved && destination) go(destination); })}>{label}</Button>)}
        </div>
        <Feedback error={problem} />
      </DetailDialog>}
    </main>
  );
}
