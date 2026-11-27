import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { backgroundLabels, cities, cityDescriptions, genderLabels, talentLabels } from '../src/data/veyra';
import { contactBondRows, contactInteractions, contactProfileRows, contactRole } from '../src/contactView';
import {
  canShowRetirement, careerCard, careerControl, careerRows, careerSummary, careerTimeline, defaultJobFilters, employmentLabels,
  financeEntries, financeOverview, financeYears, jobIcon, jobListings, jobRatings, lifetimeEarnings, vacancyActions, vacancyRows,
} from '../src/careerView';
import type { JobFilters } from '../src/careerView';
import { programById } from '../src/data/academics';
import { jobById } from '../src/data/jobs';
import { educationStatus } from '../src/engine/academics';
import { workAge, workHours } from '../src/engine/career';
import { industries } from '../src/engine/careerTypes';
import { currentClass, isPeer, isSchoolStage } from '../src/engine/school';
import { canEditFace } from '../src/engine/appearance';
import { activities, activityIssue } from '../src/engine/simulation';
import { activeCoworkers } from '../src/engine/workplace';
import {
  academicActivities, academicControl, academicRecordGroups, availableProgramGroups, educationOverview, enrollmentControls,
  enrollmentRows, gradeLabel, institutionCard, programControls, programRows,
} from '../src/educationView';
import type { EducationControl } from '../src/educationView';
import { stats } from '../src/engine/types';
import type { Contact, Life } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { Achievements, Settings } from './menu';
import { AppearancePage, Portrait } from './portraits';
import { DetailDialog } from './detailDialog';
import { Icon, Rows } from './ui';

export const pageTitles = {
  journal: en.lifeJournal,
  career: 'Career',
  'career-info': 'Career Details',
  jobs: 'Job Listings',
  job: 'Job Details',
  'work-hours': 'Working Hours',
  coworkers: 'Co-workers',
  'work-person': 'Co-worker',
  'work-person-info': 'Character Profile',
  'career-history': 'Career History',
  'career-exit': 'Leave Employment',
  education: 'Education',
  'institution-info': 'Institution Details',
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
  'player-profile': 'My Profile',
  'family-tree': 'Family Tree',
  assets: 'Assets',
  finances: 'Finances',
  activities: 'Activities',
  appearance: 'Appearance',
  statistics: 'Life Statistics',
  world: 'World',
  menu: 'Life Menu',
  settings: 'Settings',
  achievements: 'Achievements',
  summary: 'Life Summary',
} as const;

export type GamePage = keyof typeof pageTitles;
export type Navigate = (page: GamePage, detail?: string, replace?: boolean) => void;
type DetailPage = Exclude<GamePage, 'journal'>;

export function backgroundPage(page: GamePage): GamePage {
  if (page === 'career-info') return 'career';
  if (page === 'person-info') return 'person';
  if (page === 'class-person-info') return 'class-person';
  if (page === 'work-person-info') return 'work-person';
  if (page === 'institution-info') return 'education';
  return page;
}

const parentPages: Partial<Record<DetailPage, GamePage>> = {
  jobs: 'career',
  job: 'jobs',
  'work-hours': 'career',
  coworkers: 'career',
  'work-person': 'coworkers',
  'career-history': 'career',
  'career-exit': 'career',
  education: 'career',
  programs: 'education',
  program: 'programs',
  records: 'education',
  withdraw: 'education',
  class: 'education',
  'class-person': 'class',
  person: 'relationships',
  'family-tree': 'relationships',
  finances: 'assets',
  appearance: 'activities',
  settings: 'menu',
  achievements: 'menu',
};

export function PlayPageHeader({ page, person, schoolTitle, go }: { page: DetailPage; person?: Contact; schoolTitle?: string; go: Navigate }) {
  let parent = parentPages[page] ?? 'journal';
  if (page === 'education' && schoolTitle) parent = 'journal';
  const titleFor = (target: GamePage) => {
    if (target === 'education' && schoolTitle) return schoolTitle;
    if ((target === 'person' || target === 'class-person' || target === 'work-person') && person) {
      return target === 'person' ? contactRole(person) : person.role;
    }
    return pageTitles[target];
  };
  const title = titleFor(page);
  const isRoot = parent === 'journal';
  const heading = useRef<HTMLHeadingElement>(null);
  const personId = person?.id;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [page, personId]);
  return (
    <header className="play-page-header">
      <button type="button" className={`play-page-return ${isRoot ? 'play-page-return--close' : ''}`}
        aria-label={isRoot ? `Close ${title}` : `Back to ${titleFor(parent)}`}
        onClick={() => go(parent)}>
        <span aria-hidden="true">{isRoot ? '×' : 'Back'}</span>
      </button>
      <h1 id="play-page-title" ref={heading} tabIndex={-1}>{title}</h1>
    </header>
  );
}

function PageGroup({ title, children }: { title: string; children: ReactNode }) {
  return <section className="play-group"><h2>{title}</h2><div className="play-group-content">{children}</div></section>;
}

function MenuRow({ title, detail, icon, avatar, value, children, onClick, disabled, opensDialog }: {
  title: string; detail?: string; icon?: Emoji; avatar?: ReactNode; value?: string;
  children?: ReactNode; onClick?: () => void; disabled?: boolean; opensDialog?: boolean;
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
    {opensDialog && <span className="play-row-info" aria-hidden="true">i</span>}
  </>;
  const className = `play-row${!icon && !avatar ? ' play-row--unadorned' : ''}`;
  return onClick
    ? <button type="button" className={className} disabled={disabled} onClick={onClick} aria-labelledby={titleId}
        aria-describedby={description || undefined} aria-haspopup={opensDialog ? 'dialog' : undefined}>{content}</button>
    : <div className={className}>{content}</div>;
}

function PageMeter({ label, value }: { label: string; value: number }) {
  return <span className="play-meter">
    <span>{label}</span>
    <progress aria-label={label} max={100} value={value} />
    <span>{value}%</span>
  </span>;
}

function PersonRow({ person, onClick, opensDialog }: { person: Contact; onClick?: () => void; opensDialog?: boolean }) {
  const role = contactRole(person);
  return <MenuRow title={person.name} avatar={<Portrait appearance={person.appearance} age={person.age} />} onClick={onClick} opensDialog={opensDialog}
    detail={`${role} · ${person.alive ? en.age(person.age) : 'Deceased'}`}>
    <PageMeter label="Affection" value={person.bond.affection} />
  </MenuRow>;
}

function ControlRows({ controls, go }: { controls: EducationControl[]; go: Navigate }) {
  const { busy, dispatch } = useGame();
  return controls.map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => {
      void dispatch(item.action).then((success) => {
        if (success && (item.action.type === 'enroll-program' || item.action.type === 'drop-out')) go('education');
        if (success && (item.action.type === 'accept-job' || item.action.type === 'resign' || item.action.type === 'retire')) go('career');
      });
    }} />);
}

const activityOptions = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', description: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', description: 'Restores energy and reduces stress.' },
  { id: 'read', icon: 'study', label: 'Read a Book', description: 'Improves smarts and happiness.' },
] as const;

function JobListings({ life, go }: { life: Life; go: Navigate }) {
  const [filters, setFilters] = useState(defaultJobFilters);
  const listings = jobListings(life, filters);
  return <>
    <PageGroup title={`Open positions · ${life.year}`}>
      <div className="play-group-inset field-grid job-filters">
        <label>Search by title<input type="search" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /></label>
        <label>Industry<select value={filters.industry} onChange={(event) => setFilters({ ...filters, industry: event.target.value as JobFilters['industry'] })}>
          <option value="">All industries</option>{industries.map((industry) => <option key={industry}>{industry}</option>)}
        </select></label>
        <label>Employment type<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value as JobFilters['type'] })}>
          <option value="">All schedules</option><option value="full-time">Full-time</option><option value="part-time">Part-time</option>
        </select></label>
      </div>
    </PageGroup>
    <PageGroup title={`${listings.length} vacancies`}>
      {listings.length ? listings.map((listing) => <MenuRow key={listing.id} icon={jobIcon(listing.job)} title={listing.job.title}
        detail={`${listing.employer.name} · ${employmentLabels[listing.job.type]} · ${listing.status}`}
        value={money(listing.salary)} onClick={() => go('job', listing.id)} />) : <p className="play-empty">No jobs match these filters.</p>}
    </PageGroup>
  </>;
}

function Finances({ life }: { life: Life }) {
  const [year, setYear] = useState<number | null>(life.year);
  const entries = financeEntries(life, year);
  return <>
    <PageGroup title={`Financial overview · ${year ?? life.year}`}>
      <div className="play-group-inset field-grid">
        <label>Transaction year<select value={year ?? ''} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}>
          <option value="">All years</option>{financeYears(life).map((option) => <option key={option}>{option}</option>)}
        </select></label>
      </div>
      <Rows items={financeOverview(life, year ?? life.year)} />
    </PageGroup>
    <PageGroup title="Transactions">
      {entries.length ? entries.map((item, index) => <MenuRow key={index} title={item.label} detail={`${item.year} · ${item.group}`} value={money(item.amount)} />) :
        <p className="play-empty">No transactions yet.</p>}
    </PageGroup>
  </>;
}

export function PlayPage({ life, page, person, detail, go, home, newLife }: {
  life: Life; page: DetailPage; person?: Contact; detail?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, dispatch, save } = useGame();
  const { character, family } = life;
  const blocked = life.pending ? 'Resolve the open decision in your journal.' : character.causeOfDeath ? 'This life has ended.' : null;
  const energy = `${character.attributes.energy}%`;
  const job = life.career.current;
  const canFindJob = character.age >= workAge && !character.causeOfDeath && life.career.retiredYear === null;

  switch (page) {
    case 'career':
    case 'career-info': {
      const career = careerCard(life);
      const details = careerRows(life);
      return <>
        <PageGroup title={job ? 'Current job' : 'Employment'}>
          <MenuRow icon={career.icon} title={career.title} detail={career.detail} opensDialog onClick={() => go('career-info')}>
            {job && <PageMeter label="Performance" value={job.performance} />}
          </MenuRow>
        </PageGroup>
        {page === 'career-info' && <DetailDialog title="Career Details" onDismiss={() => go('career', undefined, true)}>
          <div className="detail-identity"><span className="play-row-icon"><Icon name={career.icon} /></span>
            <div><strong>{career.title}</strong>{career.detail && <p>{career.detail}</p>}</div>
          </div>
          {details.length > 0 && <Rows items={details} />}
          {job && <section className="detail-bond"><h3>Work performance</h3>
            {jobRatings(life).map((row) => <PageMeter key={row.label} {...row} />)}
          </section>}
          <section className="detail-bond"><h3>Education</h3><Rows items={educationOverview(life)} /></section>
        </DetailDialog>}
        <PageGroup title="Career actions">
          {canFindJob && <MenuRow icon="search" title="Find a Job" onClick={() => {
            if (!job && !life.career.seeking && !life.pending) void dispatch({ type: 'seek-work' }).then((success) => { if (success) go('jobs'); });
            else go('jobs');
          }} disabled={busy} />}
          {canFindJob && job && <>
            <ControlRows go={go} controls={[
              careerControl(life, { type: 'work-harder' }, 'Work Harder', 'harder', 'Uses 16 energy. Improves performance and increases stress.'),
              careerControl(life, { type: 'request-raise' }, 'Request a Raise', 'bank'),
            ]} />
            <MenuRow icon="hours" title="Working Hours" detail={`${job.hours} hours per week`} onClick={() => go('work-hours')} />
            <MenuRow icon="relationships" title="Co-workers" onClick={() => go('coworkers')} />
            <MenuRow icon="exit" title="Resign" onClick={() => go('career-exit', 'resign')} />
          </>}
          {canShowRetirement(life) && <MenuRow icon="retire" title="Retire" onClick={() => go('career-exit', 'retire')} />}
          <MenuRow icon="history" title="Career History" onClick={() => go('career-history')} />
          <MenuRow icon="school" title="View Education" onClick={() => go('education')} />
        </PageGroup>
      </>;
    }
    case 'jobs':
      return canFindJob ? <JobListings life={life} go={go} /> : <p className="play-empty">Job listings are unavailable.</p>;
    case 'job': {
      const listing = canFindJob && jobListings(life).find(({ id }) => id === detail);
      if (!listing) return <p className="play-empty">This vacancy is no longer available.</p>;
      const controls = vacancyActions(life, listing);
      return <>
        <PageGroup title={listing.job.title}><Rows items={vacancyRows(listing)} /></PageGroup>
        {controls.length > 0 && <PageGroup title="Application"><ControlRows controls={controls} go={go} /></PageGroup>}
      </>;
    }
    case 'work-hours':
      return job ? <PageGroup title="Hours per week">
        <ControlRows go={go} controls={workHours(jobById.get(job.jobId)!).map((hours) =>
          careerControl(life, { type: 'work-hours', hours }, `${hours} Hours`, 'hours', 'Workload affects performance, stress, and energy.'))} />
      </PageGroup> : <p className="play-empty">You are not currently employed.</p>;
    case 'coworkers':
      return job ? <PageGroup title="Your workplace">
        {activeCoworkers(life).map((contact) => <PersonRow key={contact.id} person={contact} onClick={() => go('work-person', contact.id)} />)}
      </PageGroup> : <p className="play-empty">You are not currently employed.</p>;
    case 'career-history': {
      const timeline = careerTimeline(life);
      return <>
        <PageGroup title="Career totals"><Rows items={[{ label: 'Lifetime gross earnings', value: money(lifetimeEarnings(life)) },
          { label: 'Professional experience', value: `${life.career.experience} years` }]} /></PageGroup>
        {timeline.length ? timeline.map((entry, index) => <PageGroup key={index} title={entry.title}><Rows items={entry.rows} /></PageGroup>) :
          <p className="play-empty">No employment records yet.</p>}
      </>;
    }
    case 'career-exit': {
      const retiring = detail === 'retire';
      if (retiring ? !canShowRetirement(life) : !job) return <p className="play-empty">This action is unavailable.</p>;
      return <PageGroup title={retiring ? 'Retire' : 'Resign'}>
        <p className="play-empty">{retiring ? 'Retirement ends your current job and closes access to job listings.' : 'Resigning ends your current contract before the next Age Up.'}</p>
        <ControlRows go={go} controls={[careerControl(life, { type: retiring ? 'retire' : 'resign' }, retiring ? 'Confirm Retirement' : 'Confirm Resignation', retiring ? 'retire' : 'exit')]} />
      </PageGroup>;
    }
    case 'education':
    case 'institution-info': {
      const enrollment = life.academic.enrollment;
      const school = enrollment && isSchoolStage(enrollment.level);
      const classmates = currentClass(life).filter(isPeer);
      const popularity = Math.round(classmates.reduce((total, contact) => total + contact.bond.affection, 0) / (classmates.length || 1));
      const fees = enrollmentControls(life);
      const institution = enrollment && institutionCard(life, enrollment);
      return <>
        {enrollment && institution ? <>
          <PageGroup title="Enrollment">
            <MenuRow icon={institution.icon} title={institution.name} detail={institution.detail} opensDialog onClick={() => go('institution-info')}>
              {enrollment.performanceRecorded ? <PageMeter label="Grades" value={enrollment.performance} /> : gradeLabel(enrollment)}
            </MenuRow>
          </PageGroup>
          {page === 'institution-info' && <DetailDialog title="Institution Details" onDismiss={() => go('education', undefined, true)}>
            <div className="detail-identity"><span className="play-row-icon"><Icon name={institution.icon} /></span>
              <div><strong>{institution.name}</strong>{institution.detail && <p>{institution.detail}</p>}</div>
            </div>
            <Rows items={[{ label: 'Grades', value: gradeLabel(enrollment) }, ...enrollmentRows(life).slice(1)]} />
          </DetailDialog>}
          <PageGroup title={school ? 'School activities' : 'Program activities'}>
            <MenuRow icon="classroom" title="Class" detail={school ? 'Meet your teacher and classmates.' : 'Meet your professor and fellow students.'} onClick={() => go('class')}>
              <PageMeter label="Popularity" value={popularity} />
            </MenuRow>
            <ControlRows controls={academicActivities(life)} go={go} />
          </PageGroup>
          {fees.length > 0 && <PageGroup title="Funding"><ControlRows controls={fees} go={go} /></PageGroup>}
        </> : <PageGroup title="Education status"><Rows items={educationOverview(life)} /></PageGroup>}
        <PageGroup title="Academic options">
          {enrollment && character.age >= workAge && <MenuRow icon="career" title="View Career" onClick={() => go('career')} />}
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
      const friends = [...life.schoolContacts, ...life.career.contacts].filter((contact) => contact.friend);
      return <>
        <PageGroup title="Parents">
          {family.map((relative) => <PersonRow key={relative.id} person={relative} onClick={() => go('person', relative.id)} />)}
        </PageGroup>
        {page === 'relationships' && friends.length > 0 && <PageGroup title="Friends">
          {friends.map((friend) => <PersonRow key={friend.id} person={friend} onClick={() => go('person', friend.id)} />)}
        </PageGroup>}
        {page === 'relationships'
          ? <PageGroup title="Family records"><MenuRow icon="tree" title="Family Tree" detail="See your place in the family." onClick={() => go('family-tree')} /></PageGroup>
          : <PageGroup title="You"><MenuRow avatar={<Portrait appearance={character.appearance} age={character.age} />}
            title={`${character.firstName} ${character.lastName}`} detail={`Born ${character.birthYear}`} onClick={() => go('player-profile')} /></PageGroup>}
      </>;
    }
    case 'player-profile':
      return <PageGroup title={`${character.firstName} ${character.lastName}`}>
        <div className="profile-art"><Portrait appearance={character.appearance} age={character.age} label="Your portrait" large /></div>
        <Rows items={[
          { label: character.causeOfDeath ? 'Age at death' : 'Age', value: character.age },
          { label: 'Gender identity', value: genderLabels[character.gender] },
          { label: 'Birth city', value: character.city }, { label: 'Education', value: educationStatus(life) },
        ]} />
      </PageGroup>;
    case 'person':
    case 'person-info':
    case 'class-person':
    case 'work-person':
    case 'work-person-info':
    case 'class-person-info': {
      if (!person) return <p className="play-empty">This character is unavailable.</p>;
      const contact = person;
      const showingProfile = page === 'person-info' || page === 'class-person-info' || page === 'work-person-info';
      const base = page === 'work-person' || page === 'work-person-info' ? 'work-person' :
        page === 'class-person' || page === 'class-person-info' ? 'class-person' : 'person';
      return <>
        <PageGroup title="Character">
          <PersonRow person={contact} opensDialog onClick={() => go(`${base}-info`, contact.id)} />
        </PageGroup>
        <PageGroup title="Interactions">
          {contactInteractions(life, contact).map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />)}
        </PageGroup>
        {showingProfile && <DetailDialog title="Character Profile" onDismiss={() => go(base, contact.id, true)}>
          <div className="detail-identity"><Portrait appearance={contact.appearance} age={contact.age} label={`Portrait of ${contact.name}`} />
            <div><strong>{contact.name}</strong><p>{contactRole(contact)}</p></div>
          </div>
          <Rows items={contactProfileRows(contact)} />
          <section className="detail-bond"><h3>Your bond</h3>
            {contactBondRows(contact).map((row) => <PageMeter key={row.label} {...row} />)}
          </section>
        </DetailDialog>}
      </>;
    }
    case 'assets':
      return <PageGroup title="Banking">
        <MenuRow icon="bank" title="Finances" detail="Bank balance and transaction history."
          value={money(character.bank)} onClick={() => go('finances')} />
      </PageGroup>;
    case 'finances':
      return <Finances life={life} />;
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
        {!character.causeOfDeath && <PageGroup title="Appearance">
          <MenuRow icon="hair" title={canEditFace(character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
            onClick={() => go('appearance')} />
        </PageGroup>}
      </>;
    case 'appearance':
      return <AppearancePage life={life} back={() => go('activities')} />;
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
      const employment = careerSummary(life);
      return <>
        <PageGroup title="Biography">
          <MenuRow icon="person" title={`${character.firstName} ${character.lastName}`} detail={`${character.birthYear}–${life.year}`} />
          <Rows items={[
            { label: 'Age at death', value: character.age }, { label: 'Cause of death', value: character.causeOfDeath },
            { label: 'Education', value: educationStatus(life) }, { label: 'Final bank balance', value: money(character.bank) },
            ...family.map((relative) => ({ label: relative.role, value: relative.name })),
          ]} />
        </PageGroup>
        {employment.length > 0 && <PageGroup title="Career"><Rows items={employment} /></PageGroup>}
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
