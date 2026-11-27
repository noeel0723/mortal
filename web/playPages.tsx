import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { backgroundLabels, cities, cityDescriptions, educationLabels, talentLabels } from '../src/data/veyra';
import { activities, activityIssue, talkIssue } from '../src/engine/simulation';
import { stats } from '../src/engine/types';
import type { Life, Person } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { Achievements, Settings } from './menu';
import { Icon, Rows } from './ui';

export const pageTitles = {
  journal: en.lifeJournal,
  career: 'Career',
  education: 'Education',
  relationships: 'Relationships',
  person: 'Family Member',
  'person-info': 'Character Profile',
  'family-tree': 'Family Tree',
  assets: 'Assets',
  finances: 'Finances',
  activities: 'Activities',
  statistics: 'Life Statistics',
  world: 'World',
  menu: 'Life Menu',
  settings: 'Settings',
  achievements: 'Achievements',
  summary: 'Life Summary',
} as const;

export type GamePage = keyof typeof pageTitles;
export type Navigate = (page: GamePage, detail?: string) => void;
type DetailPage = Exclude<GamePage, 'journal'>;

const parentPages: Partial<Record<DetailPage, GamePage>> = {
  education: 'career',
  person: 'relationships',
  'person-info': 'person',
  'family-tree': 'relationships',
  finances: 'assets',
  settings: 'menu',
  achievements: 'menu',
};

export function PlayPageHeader({ page, person, go }: { page: DetailPage; person?: Person; go: Navigate }) {
  const parent = page === 'person-info' && !person ? 'relationships' : parentPages[page] ?? 'journal';
  const title = page === 'person' && person ? person.role : pageTitles[page];
  const isRoot = parent === 'journal';
  const parentTitle = parent === 'person' && person ? person.role : pageTitles[parent];
  const heading = useRef<HTMLHeadingElement>(null);
  const personId = person?.id;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [page, personId]);
  return (
    <header className="play-page-header">
      <button type="button" className={`play-page-return ${isRoot ? 'play-page-return--close' : ''}`}
        aria-label={isRoot ? `Close ${title}` : `Back to ${parentTitle}`}
        onClick={() => go(parent, parent === 'person' ? person?.id : undefined)}>
        <span aria-hidden="true">{isRoot ? '×' : 'Back'}</span>
      </button>
      <h1 id="play-page-title" ref={heading} tabIndex={-1}>{title}</h1>
    </header>
  );
}

function PageGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="play-group"><h2>{title}</h2><div className="play-group-content">{children}</div></section>;
}

function MenuRow({ title, detail, icon, avatar, value, children, onClick, disabled }: {
  title: string; detail?: string; icon?: Emoji; avatar?: string; value?: string;
  children?: ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const detailId = `${id}-detail`;
  const content = <>
    {avatar ? <span className="play-row-avatar" aria-hidden="true">{avatar}</span> :
      icon ? <span className="play-row-icon"><Icon name={icon} /></span> : null}
    <span className="play-row-main">
      <strong id={titleId}>{title}</strong>
      {detail && <span id={detailId} className="play-row-detail">{detail}</span>}
      {children}
    </span>
    {value && <span className="play-row-value">{value}</span>}
  </>;
  const className = `play-row${!icon && !avatar ? ' play-row--unadorned' : ''}`;
  return onClick
    ? <button type="button" className={className} disabled={disabled} onClick={onClick} aria-labelledby={titleId}
        aria-describedby={detail ? detailId : undefined}>{content}</button>
    : <div className={className}>{content}</div>;
}

function PersonRow({ person, onClick }: { person: Person; onClick?: () => void }) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
  return <MenuRow title={person.name} avatar={initials} onClick={onClick}
    detail={`${person.role} · ${person.alive ? en.age(person.age) : 'Deceased'}`}>
    <span className="bond-preview">
      <span>Affection</span>
      <progress aria-label="Affection" max={100} value={person.bond.affection} />
      <span>{person.bond.affection}%</span>
    </span>
  </MenuRow>;
}

const activityOptions = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', description: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', description: 'Restores energy and reduces stress.' },
  { id: 'read', icon: 'study', label: 'Read a Book', description: 'Improves smarts and happiness.' },
] as const;

export function PlayPage({ life, page, person, go, home, newLife }: {
  life: Life; page: DetailPage; person?: Person; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, dispatch, save } = useGame();
  const { character, family } = life;
  const blocked = life.pending ? 'Resolve the open decision in your journal.' : character.causeOfDeath ? 'This life has ended.' : null;
  const energy = `${character.attributes.energy}%`;

  switch (page) {
    case 'career':
      return <PageGroup title="Education">
        <MenuRow icon="school" title="View Education" detail={educationLabels[character.education]} onClick={() => go('education')} />
      </PageGroup>;
    case 'education': {
      const issue = blocked ?? activityIssue(life, 'study');
      const schoolAge = [6, 12, 15, 18].find((age) => age > character.age);
      return <>
        <PageGroup title="School progress"><Rows items={[
          { label: 'Education', value: educationLabels[character.education] },
          ...(schoolAge ? [{ label: 'Next milestone', value: en.age(schoolAge) }] : []),
          { label: 'Energy', value: energy },
        ]} /></PageGroup>
        <PageGroup title="School activities"><MenuRow icon="study" title="Study Harder"
          detail={issue ?? 'Uses 16 energy. Improves smarts and discipline.'} disabled={busy || !!issue}
          onClick={() => void dispatch({ type: 'activity', activity: 'study' })} /></PageGroup>
      </>;
    }
    case 'relationships':
    case 'family-tree':
      return <>
        <PageGroup title="Parents">
          {family.map((relative) => <PersonRow key={relative.id} person={relative} onClick={() => go('person', relative.id)} />)}
        </PageGroup>
        {page === 'relationships'
          ? <PageGroup title="Family records"><MenuRow icon="tree" title="Family Tree" detail="See your place in the family." onClick={() => go('family-tree')} /></PageGroup>
          : <PageGroup title="You"><MenuRow icon="person" title={`${character.firstName} ${character.lastName}`} detail={`Born ${character.birthYear}`} /></PageGroup>}
      </>;
    case 'person':
    case 'person-info': {
      if (!person) return <p className="play-empty">This family member is unavailable.</p>;
      const parent = person;
      if (page === 'person-info') return <>
        <PageGroup title="About"><PersonRow person={parent} />
          <Rows items={[
            { label: parent.alive ? 'Age' : 'Age at death', value: parent.age },
            { label: 'City', value: parent.city }, { label: 'Occupation', value: parent.occupation },
            { label: 'Health', value: `${parent.health}%` },
          ]} />
        </PageGroup>
        <PageGroup title="Your bond">
          <Rows items={Object.entries(parent.bond).map(([label, value]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1), value: `${value}%`,
          }))} />
        </PageGroup>
      </>;
      const issue = blocked ?? talkIssue(life, parent.id);
      return <>
        <PageGroup title="Character">
          <PersonRow person={parent} />
          <MenuRow icon="person" title="View Profile" detail="See age, occupation, health, and your bond." onClick={() => go('person-info', parent.id)} />
        </PageGroup>
        <PageGroup title="Interactions">
          <MenuRow icon="talk" title="Have a Conversation" detail={issue ?? 'Uses 8 energy. Strengthens affection and trust.'}
            disabled={busy || !!issue} onClick={() => void dispatch({ type: 'talk', person: parent.id })} />
        </PageGroup>
      </>;
    }
    case 'assets':
      return <PageGroup title="Banking">
        <MenuRow icon="bank" title="Finances" detail="Bank balance and transaction history."
          value={money(character.bank)} onClick={() => go('finances')} />
      </PageGroup>;
    case 'finances':
      return <>
        <PageGroup title="Bank account"><MenuRow icon="bank" title="Current balance" value={money(character.bank)} /></PageGroup>
        <PageGroup title="Transactions">
          {life.transactions.length ? [...life.transactions].reverse().map((item, index) => (
            <MenuRow key={index} title={item.label} detail={String(item.year)} value={money(item.amount)} />
          )) : <p className="play-empty">No transactions yet.</p>}
        </PageGroup>
      </>;
    case 'activities':
      return <>
        <PageGroup title="Energy"><MenuRow icon="health" title="Current energy" value={energy} /></PageGroup>
        <PageGroup title="Wellbeing">
          {activityOptions.map((item) => {
            const issue = blocked ?? activityIssue(life, item.id);
            const cost = activities[item.id].energy;
            return <MenuRow key={item.id} icon={item.icon} title={item.label}
              detail={issue ?? `${item.description}${cost ? ` Uses ${cost} energy.` : ''}`} disabled={busy || !!issue}
              onClick={() => void dispatch({ type: 'activity', activity: item.id })} />;
          })}
        </PageGroup>
      </>;
    case 'statistics':
      return <>
        <PageGroup title="Attributes"><Rows items={stats.map((stat) => ({ label: statLabels[stat], value: `${character.attributes[stat]}%` }))} /></PageGroup>
        <PageGroup title="Background"><Rows items={[
          { label: 'Personality', value: character.personality },
          { label: 'Natural talent', value: character.talent ? talentLabels[character.talent] : 'None' },
          { label: 'Family background', value: backgroundLabels[character.background] },
        ]} /></PageGroup>
      </>;
    case 'world':
      return <>
        <PageGroup title="Veyra"><Rows items={[
          { label: 'Simulation year', value: life.year }, { label: 'Your city', value: character.city },
        ]} /></PageGroup>
        <PageGroup title="Cities">
          {cities.map((city) => <MenuRow key={city} icon="location" title={city} detail={cityDescriptions[city]} />)}
        </PageGroup>
      </>;
    case 'menu':
      return <PageGroup title="This life">
        <MenuRow icon="save" title="Save Life" detail="Progress also saves after every action." onClick={() => void save()} disabled={busy} />
        <MenuRow icon="trophy" title="Achievements" onClick={() => go('achievements')} />
        <MenuRow icon="settings" title="Settings" onClick={() => go('settings')} />
        <MenuRow icon="home" title="Main Menu" onClick={home} />
      </PageGroup>;
    case 'settings':
      return <PageGroup title="Preferences"><div className="play-group-inset"><Settings /></div></PageGroup>;
    case 'achievements':
      return <PageGroup title="Milestones"><div className="play-group-inset"><Achievements /></div></PageGroup>;
    case 'summary': {
      if (!character.causeOfDeath) return <p className="play-empty">This life is still in progress.</p>;
      const turningPoints = life.journal.filter((entry) => entry.category === 'decision' || entry.category === 'school').slice(-4);
      return <>
        <PageGroup title="Biography">
          <MenuRow icon="person" title={`${character.firstName} ${character.lastName}`} detail={`${character.birthYear}–${life.year}`} />
          <Rows items={[
            { label: 'Age at death', value: character.age }, { label: 'Cause of death', value: character.causeOfDeath },
            { label: 'Education', value: educationLabels[character.education] }, { label: 'Final bank balance', value: money(character.bank) },
            ...family.map((relative) => ({ label: relative.role, value: relative.name })),
          ]} />
        </PageGroup>
        {turningPoints.length > 0 && <PageGroup title="Turning points">
          {turningPoints.map((entry, index) => <MenuRow key={index} title={en.age(entry.age)} detail={entry.text} />)}
        </PageGroup>}
        <PageGroup title="What next">
          <MenuRow icon="life" title="Review Life Story" onClick={() => go('journal')} />
          <MenuRow icon="new" title="Start a New Life" onClick={newLife} />
          <MenuRow icon="home" title="Main Menu" onClick={home} />
        </PageGroup>
      </>;
    }
  }
}
