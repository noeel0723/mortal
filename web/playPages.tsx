import { useEffect, useId, useRef } from 'react';
import type { ReactNode } from 'react';
import { backgroundLabels, cities, cityDescriptions, talentLabels } from '../src/data/veyra';
import { programById } from '../src/data/academics';
import { academicProgramName, educationStatus } from '../src/engine/academics';
import { currentClass, isPeer, isSchoolStage } from '../src/engine/school';
import { activities, activityIssue, befriendIssue, friendshipEnergyCost, talkIssue } from '../src/engine/simulation';
import {
  academicActivities, academicControl, academicRecordGroups, availableProgramGroups, educationOverview, enrollmentControls,
  enrollmentRows, gradeLabel, programControls, programRows,
} from '../src/educationView';
import type { EducationControl } from '../src/educationView';
import { stats } from '../src/engine/types';
import type { Contact, Life } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { Achievements, Settings } from './menu';
import { Icon, Rows } from './ui';

export const pageTitles = {
  journal: en.lifeJournal,
  career: 'Career',
  education: 'Education',
  programs: 'Programs',
  program: 'Program Details',
  records: 'Academic Records',
  withdraw: 'Leave Education',
  class: 'Class',
  'class-person': 'Class Member',
  'class-person-info': 'Character Profile',
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
  programs: 'education',
  program: 'programs',
  records: 'education',
  withdraw: 'education',
  class: 'education',
  'class-person': 'class',
  'class-person-info': 'class-person',
  person: 'relationships',
  'person-info': 'person',
  'family-tree': 'relationships',
  finances: 'assets',
  settings: 'menu',
  achievements: 'menu',
};

export function PlayPageHeader({ page, person, schoolTitle, go }: { page: DetailPage; person?: Contact; schoolTitle?: string; go: Navigate }) {
  let parent = parentPages[page] ?? 'journal';
  if (page === 'education' && schoolTitle) parent = 'journal';
  if (!person && page === 'person-info') parent = 'relationships';
  if (!person && page === 'class-person-info') parent = 'class';
  const titleFor = (target: GamePage) => {
    if (target === 'education' && schoolTitle) return schoolTitle;
    if ((target === 'person' || target === 'class-person') && person) {
      return target === 'person' && 'stage' in person && person.friend ? 'Friend' : person.role;
    }
    return pageTitles[target];
  };
  const title = titleFor(page);
  const isRoot = parent === 'journal';
  const returnToPerson = parent === 'person' || parent === 'class-person';
  const heading = useRef<HTMLHeadingElement>(null);
  const personId = person?.id;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [page, personId]);
  return (
    <header className="play-page-header">
      <button type="button" className={`play-page-return ${isRoot ? 'play-page-return--close' : ''}`}
        aria-label={isRoot ? `Close ${title}` : `Back to ${titleFor(parent)}`}
        onClick={() => go(parent, returnToPerson ? person?.id : undefined)}>
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
  const extraId = `${id}-extra`;
  const description = [detail && detailId, children && extraId].filter(Boolean).join(' ');
  const content = <>
    {avatar ? <span className="play-row-avatar" aria-hidden="true">{avatar}</span> :
      icon ? <span className="play-row-icon"><Icon name={icon} /></span> : null}
    <span className="play-row-main">
      <strong id={titleId}>{title}</strong>
      {detail && <span id={detailId} className="play-row-detail">{detail}</span>}
      {children && <span id={extraId}>{children}</span>}
    </span>
    {value && <span className="play-row-value">{value}</span>}
  </>;
  const className = `play-row${!icon && !avatar ? ' play-row--unadorned' : ''}`;
  return onClick
    ? <button type="button" className={className} disabled={disabled} onClick={onClick} aria-labelledby={titleId}
        aria-describedby={description || undefined}>{content}</button>
    : <div className={className}>{content}</div>;
}

function PageMeter({ label, value }: { label: string; value: number }) {
  return <span className="play-meter">
    <span>{label}</span>
    <progress aria-label={label} max={100} value={value} />
    <span>{value}%</span>
  </span>;
}

function PersonRow({ person, onClick }: { person: Contact; onClick?: () => void }) {
  const initials = person.name.split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0]).join('').toUpperCase();
  const role = 'stage' in person && person.friend ? 'Friend' : person.role;
  return <MenuRow title={person.name} avatar={initials} onClick={onClick}
    detail={`${role} · ${person.alive ? en.age(person.age) : 'Deceased'}`}>
    <PageMeter label="Affection" value={person.bond.affection} />
  </MenuRow>;
}

const schoolNames = { primary: 'Primary School', secondary: 'Secondary School', high: 'High School' } as const;

function ControlRows({ controls, go }: { controls: EducationControl[]; go: Navigate }) {
  const { busy, dispatch } = useGame();
  return controls.map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => {
      void dispatch(item.action).then((success) => {
        if (success && (item.action.type === 'enroll-program' || item.action.type === 'drop-out')) go('education');
      });
    }} />);
}

const activityOptions = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', description: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', description: 'Restores energy and reduces stress.' },
  { id: 'read', icon: 'study', label: 'Read a Book', description: 'Improves smarts and happiness.' },
] as const;

export function PlayPage({ life, page, person, detail, go, home, newLife }: {
  life: Life; page: DetailPage; person?: Contact; detail?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, dispatch, save } = useGame();
  const { character, family } = life;
  const blocked = life.pending ? 'Resolve the open decision in your journal.' : character.causeOfDeath ? 'This life has ended.' : null;
  const energy = `${character.attributes.energy}%`;

  switch (page) {
    case 'career':
      return <>
        <PageGroup title="Education"><Rows items={educationOverview(life)} /></PageGroup>
        <PageGroup title="Education actions">
          <MenuRow icon="school" title="View Education" onClick={() => go('education')} />
        </PageGroup>
      </>;
    case 'education': {
      const enrollment = life.academic.enrollment;
      const school = enrollment && isSchoolStage(enrollment.level);
      const classmates = currentClass(life).filter(isPeer);
      const popularity = Math.round(classmates.reduce((total, contact) => total + contact.bond.affection, 0) / (classmates.length || 1));
      const fees = enrollmentControls(life);
      return <>
        {enrollment ? <>
          <PageGroup title="Enrollment">
            <MenuRow icon={school ? 'school' : 'university'} title={isSchoolStage(enrollment.level) ?
              `${character.city} ${schoolNames[enrollment.level]}` : academicProgramName(enrollment.programId)}>
              {enrollment.performanceRecorded ? <PageMeter label="Grades" value={enrollment.performance} /> : gradeLabel(enrollment)}
            </MenuRow>
            <Rows items={enrollmentRows(life)} />
          </PageGroup>
          <PageGroup title={school ? 'School activities' : 'Program activities'}>
            <MenuRow icon="classroom" title="Class" detail={school ? 'Meet your teacher and classmates.' : 'Meet your professor and fellow students.'} onClick={() => go('class')}>
              <PageMeter label="Popularity" value={popularity} />
            </MenuRow>
            <ControlRows controls={academicActivities(life)} go={go} />
          </PageGroup>
          {fees.length > 0 && <PageGroup title="Funding"><ControlRows controls={fees} go={go} /></PageGroup>}
        </> : <PageGroup title="Education status"><Rows items={educationOverview(life)} /></PageGroup>}
        <PageGroup title="Academic options">
          {!enrollment && character.age >= 18 && <MenuRow icon="university" title="Browse Programs" onClick={() => go('programs')} />}
          <MenuRow icon="history" title="Academic Records" onClick={() => go('records')} />
          {enrollment && <MenuRow icon="decline" title="Drop Out" onClick={() => go('withdraw')} />}
        </PageGroup>
      </>;
    }
    case 'withdraw':
      return <PageGroup title="Confirm withdrawal">
        <p className="play-empty">Leaving ends this enrollment. Tuition already paid stays in your transaction history.</p>
        <ControlRows controls={[academicControl(life, { type: 'drop-out' }, 'Confirm Dropout', 'decline')]} go={go} />
      </PageGroup>;
    case 'programs': {
      const groups = availableProgramGroups(life);
      if (!groups.length) return <p className="play-empty">Programs open at age 18.</p>;
      return groups.map(({ level, title, programs }) => (
        <PageGroup key={level} title={title}>{programs.map((item) => (
          <MenuRow key={item.id} icon={level === 'vocational' ? 'vocational' : 'university'} title={item.title}
            detail={`${item.duration} yr · ${money(item.tuition)}/year`} onClick={() => go('program', item.id)} />
        ))}</PageGroup>
      ));
    }
    case 'program': {
      const program = programById.get(detail ?? '');
      if (!program) return <p className="play-empty">This program is unavailable.</p>;
      return <>
        <PageGroup title={program.title}><Rows items={programRows(life, program)} /></PageGroup>
        <PageGroup title="Application"><ControlRows controls={programControls(life, program)} go={go} /></PageGroup>
      </>;
    }
    case 'records':
      return academicRecordGroups(life).map(({ title, rows }) => (
        <PageGroup key={title} title={title}>
          {rows.length ? <Rows items={rows} /> : <p className="play-empty">No records yet.</p>}
        </PageGroup>
      ));
    case 'class': {
      const contacts = currentClass(life);
      if (!contacts.length) return <p className="play-empty">You are not enrolled in a class.</p>;
      const school = life.academic.enrollment && isSchoolStage(life.academic.enrollment.level);
      return <>
        <PageGroup title={school ? 'Teacher' : 'Professor'}>
          {contacts.filter((contact) => !isPeer(contact)).map((contact) =>
            <PersonRow key={contact.id} person={contact} onClick={() => go('class-person', contact.id)} />)}
        </PageGroup>
        <PageGroup title={school ? 'Classmates' : 'Students'}>
          {contacts.filter(isPeer).map((contact) =>
            <PersonRow key={contact.id} person={contact} onClick={() => go('class-person', contact.id)} />)}
        </PageGroup>
      </>;
    }
    case 'relationships':
    case 'family-tree': {
      const friends = life.schoolContacts.filter((contact) => contact.friend);
      return <>
        <PageGroup title="Parents">
          {family.map((relative) => <PersonRow key={relative.id} person={relative} onClick={() => go('person', relative.id)} />)}
        </PageGroup>
        {page === 'relationships' && friends.length > 0 && <PageGroup title="Friends">
          {friends.map((friend) => <PersonRow key={friend.id} person={friend} onClick={() => go('person', friend.id)} />)}
        </PageGroup>}
        {page === 'relationships'
          ? <PageGroup title="Family records"><MenuRow icon="tree" title="Family Tree" detail="See your place in the family." onClick={() => go('family-tree')} /></PageGroup>
          : <PageGroup title="You"><MenuRow icon="person" title={`${character.firstName} ${character.lastName}`} detail={`Born ${character.birthYear}`} /></PageGroup>}
      </>;
    }
    case 'person':
    case 'person-info':
    case 'class-person':
    case 'class-person-info': {
      if (!person) return <p className="play-empty">This character is unavailable.</p>;
      const contact = person;
      if (page === 'person-info' || page === 'class-person-info') return <>
        <PageGroup title="About"><PersonRow person={contact} />
          <Rows items={[
            { label: contact.alive ? 'Age' : 'Age at death', value: contact.age },
            { label: 'City', value: contact.city }, { label: 'Occupation', value: contact.occupation },
            { label: 'Health', value: `${contact.health}%` },
          ]} />
        </PageGroup>
        <PageGroup title="Your bond">
          <Rows items={Object.entries(contact.bond).map(([label, value]) => ({
            label: label.charAt(0).toUpperCase() + label.slice(1), value: `${value}%`,
          }))} />
        </PageGroup>
      </>;
      const issue = blocked ?? talkIssue(life, contact.id);
      const canBefriend = 'stage' in contact && isPeer(contact) && !contact.friend;
      const friendshipIssue = canBefriend ? blocked ?? befriendIssue(life, contact.id) : null;
      return <>
        <PageGroup title="Character">
          <PersonRow person={contact} />
          <MenuRow icon="person" title="View Profile" detail="See age, occupation, health, and your bond."
            onClick={() => go(page === 'class-person' ? 'class-person-info' : 'person-info', contact.id)} />
        </PageGroup>
        <PageGroup title="Interactions">
          <MenuRow icon="talk" title="Have a Conversation" detail={issue ?? 'Uses 8 energy. Strengthens affection and trust.'}
            disabled={busy || !!issue} onClick={() => void dispatch({ type: 'talk', person: contact.id })} />
          {canBefriend && <MenuRow icon="relationships" title="Become Friends"
            detail={friendshipIssue ?? `Uses ${friendshipEnergyCost} energy. Adds this person to Relationships.`}
            disabled={busy || !!friendshipIssue} onClick={() => void dispatch({ type: 'befriend', person: contact.id })} />}
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
            { label: 'Education', value: educationStatus(life) }, { label: 'Final bank balance', value: money(character.bank) },
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
