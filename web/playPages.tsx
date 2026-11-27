import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { lifestyleActivities, socialActivities, wellbeingActivities, type ActivityControl } from '../src/activityView';
import { assetById, assetKinds } from '../src/data/shops';
import type { AssetListing } from '../src/data/shops';
import { backgroundLabels, cities, cityDescriptions, genderLabels, talentLabels } from '../src/data/veyra';
import { contactBondRows, contactHistory, contactInteractions, contactProfileRows, contactRole } from '../src/contactView';
import {
  canShowRetirement, careerCard, careerControl, careerRows, careerSummary, careerTimeline, defaultJobFilters, employmentLabels,
  financeEntries, financeOverview, financeYears, jobIcon, jobListings, jobRatings, lifetimeEarnings, vacancyActions, vacancyRows,
} from '../src/careerView';
import type { JobFilters } from '../src/careerView';
import { programById } from '../src/data/academics';
import { jobById } from '../src/data/jobs';
import { isSkillId, skillCategories, skills } from '../src/data/skills';
import { educationStatus } from '../src/engine/academics';
import { workAge, workHours } from '../src/engine/career';
import { industries } from '../src/engine/careerTypes';
import { currentClass, findContact, isPeer, isSchoolStage } from '../src/engine/school';
import { romanceLabels } from '../src/engine/love';
import { childParents, datingCandidates, datingSummary, familyTreeGroups, meetingControls, relationshipControls, relationshipGroups } from '../src/socialView';
import { canEditFace } from '../src/engine/appearance';
import { propertyIssue } from '../src/engine/property';
import { assetArt } from '../src/portraits/assetArt';
import { housingControls, listingsFor, ownedListings, propertyCategories, residenceLabel, shoppingCategory } from '../src/propertyView';
import { activeCoworkers } from '../src/engine/workplace';
import type { HealthService } from '../src/engine/healthTypes';
import { careSections, careSelection, careServices, profileHealthRows } from '../src/healthView';
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
import { activitySkillCategories, annualTrainingSummary, skillCategory, skillDetails, skillGroups } from '../src/skillView';
import { Achievements, Settings } from './menu';
import { AppearancePage, Portrait } from './portraits';
import { DetailDialog } from './detailDialog';
import { Button, Feedback, Icon, Rows } from './ui';

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
  'love-life': 'Love Life',
  'dating-profiles': 'Dating Profiles',
  'relationship-history': 'Relationship History',
  person: 'Family Member',
  'person-info': 'Character Profile',
  'player-profile': 'My Profile',
  'family-tree': 'Family Tree',
  assets: 'Assets',
  shopping: 'Shopping',
  'shop-category': 'Catalog',
  'shop-item': 'Listing',
  housing: 'Housing',
  'owned-assets': 'Owned Assets',
  finances: 'Finances',
  activities: 'Activities',
  doctor: 'Doctors',
  appearance: 'Appearance',
  statistics: 'Life Statistics',
  skills: 'My Skills',
  'skill-training': 'Skill Training',
  skill: 'Skill Details',
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
  'love-life': 'relationships',
  'dating-profiles': 'love-life',
  'relationship-history': 'love-life',
  'family-tree': 'relationships',
  finances: 'assets',
  shopping: 'assets',
  'shop-category': 'shopping',
  'shop-item': 'shop-category',
  housing: 'assets',
  'owned-assets': 'assets',
  appearance: 'activities',
  doctor: 'activities',
  skills: 'statistics',
  'skill-training': 'activities',
  skill: 'skills',
  settings: 'menu',
  achievements: 'menu',
};

export function PlayPageHeader({ page, person, schoolTitle, detail, go }: {
  page: DetailPage; person?: Contact; schoolTitle?: string; detail?: string; go: Navigate;
}) {
  let parent = parentPages[page] ?? 'journal';
  if (page === 'education' && schoolTitle) parent = 'journal';
  const trainingCategory = page === 'skill' ? skillCategory(detail?.split('~')[1]) : undefined;
  if (trainingCategory) parent = 'skill-training';
  const parentDetail = page === 'shop-item' ? assetById.get(detail ?? '')?.kind : trainingCategory;
  const titleFor = (target: GamePage, value?: string) => {
    if (target === 'education' && schoolTitle) return schoolTitle;
    if (target === 'shop-category') {
      const kind = shoppingCategory(value);
      return kind ? propertyCategories[kind].label : pageTitles[target];
    }
    const category = target === 'skill-training' ? skillCategory(value) : undefined;
    if (category) return skillCategories[category];
    const skill = target === 'skill' ? value?.split('~')[0] : undefined;
    if (isSkillId(skill)) return skills[skill].name;
    if ((target === 'person' || target === 'class-person' || target === 'work-person') && person) {
      return target === 'person' ? contactRole(person) : person.role;
    }
    return pageTitles[target];
  };
  const title = titleFor(page, detail);
  const isRoot = parent === 'journal';
  const heading = useRef<HTMLHeadingElement>(null);
  const personId = person?.id;
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [page, personId, detail]);
  return (
    <header className="play-page-header">
      <button type="button" className={`play-page-return ${isRoot ? 'play-page-return--close' : ''}`}
        aria-label={isRoot ? `Close ${title}` : `Back to ${titleFor(parent, parentDetail)}`}
        onClick={() => go(parent, parentDetail)}>
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

export function PageMeter({ label, value }: { label: string; value: number }) {
  return <span className="play-meter">
    <span>{label}</span>
    <progress aria-label={label} max={100} value={value} />
    <span>{value}%</span>
  </span>;
}

function DoctorsPage({ life }: { life: Life }) {
  const { busy, problem, dispatch, clearMessage } = useGame();
  const [selection, setSelection] = useState<{ service: HealthService; patient?: string }>();
  const care = careSelection(life, selection);

  function appointment() {
    if (!care || life.pending || life.notices.length) return null;
    const { service, info, patients, patient, options, empty, prompt, sharedIssue } = care;
    return <DetailDialog title={info.title} onDismiss={() => { if (!busy) setSelection(undefined); }}>
      <div className="healthcare-dialog-body">
        <p className="event-category"><Icon name={info.icon} />Healthcare</p>
        <p>{prompt}</p>
        {patient && <div className="healthcare-patient">
          {patients.length > 1 ? <label htmlFor="care-patient">Patient
            <select id="care-patient" value={patient.id} disabled={busy}
              onChange={(event) => setSelection({ service, patient: event.target.value })}>
              {patients.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label> : <strong>{patient.name}</strong>}
          <p>{patient.condition}</p>
        </div>}
        {service === 'doctor' && patient?.level === 'severe' && <p className="healthcare-hint">Successful treatment reduces a severe illness to moderate.</p>}
        {!empty && sharedIssue && <p className="healthcare-hint">{sharedIssue}</p>}
        {options.map((option) => <div className="healthcare-option" key={option.label}>
          <Button icon={info.icon} kind="plain" className="healthcare-book" aria-label={option.label}
            disabled={busy || !!option.issue} onClick={() => void dispatch({ type: 'healthcare', visit: option.visit }).then((ok) => {
              if (ok) setSelection(undefined);
            })}>
            <span>{option.label}</span>{option.fee && <strong>{option.fee}</strong>}
          </Button>
          {option.reputation !== undefined && <PageMeter label="Reputation" value={option.reputation} />}
          {option.chance !== undefined && <p className="healthcare-hint">{option.chance}% treatment success</p>}
          {!empty && !sharedIssue && option.issue && <p className="healthcare-hint">{option.issue}</p>}
        </div>)}
        <Feedback error={problem} />
      </div>
    </DetailDialog>;
  }

  return <>
    {careSections.map(({ title, services }) => <PageGroup key={title} title={title}>
      {services.map((id) => <MenuRow key={id} {...careServices[id]} opensDialog
        onClick={() => { clearMessage(); setSelection({ service: id }); }} />)}
    </PageGroup>)}
    {appointment()}
  </>;
}

function PersonRow({ person, life, detail, onClick, opensDialog }: {
  person: Contact; life?: Life; detail?: string; onClick?: () => void; opensDialog?: boolean;
}) {
  const role = contactRole(person, life);
  return <MenuRow title={person.name} avatar={<Portrait appearance={person.appearance} age={person.age} />} onClick={onClick} opensDialog={opensDialog}
    detail={detail ?? `${role} · ${person.alive ? en.age(person.age) : 'Deceased'}`}>
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

function AssetImage({ listing, large = false }: { listing: AssetListing; large?: boolean }) {
  return <img className={`asset-art${large ? ' asset-art--large' : ''}`} src={assetArt(listing)}
    alt={large ? `Pixel artwork of ${listing.name}` : ''} width="72" height="72" />;
}

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
  const { character } = life;
  const job = life.career.current;
  const canFindJob = character.age >= workAge && !character.causeOfDeath && life.career.retiredYear === null;
  const activityRow = (item: ActivityControl) => <MenuRow key={item.label} icon={item.icon} title={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />;

  switch (page) {
    case 'career':
    case 'career-info': {
      const career = careerCard(life);
      const details = careerRows(life);
      const canRetire = canShowRetirement(life);
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
        {((canFindJob && !!job) || canRetire) && <PageGroup title="Career Actions">
          {canFindJob && job && <>
            <ControlRows go={go} controls={[
              careerControl(life, { type: 'work-harder' }, 'Work Harder', 'harder', 'Uses 16 energy. Improves performance and increases stress.'),
              careerControl(life, { type: 'request-raise' }, 'Request a Raise', 'bank'),
            ]} />
            <MenuRow icon="hours" title="Working Hours" detail={`${job.hours} hours per week`} onClick={() => go('work-hours')} />
            <MenuRow icon="relationships" title="Co-workers" onClick={() => go('coworkers')} />
            <MenuRow icon="exit" title="Resign" onClick={() => go('career-exit', 'resign')} />
          </>}
          {canRetire && <MenuRow icon="retire" title="Retire" onClick={() => go('career-exit', 'retire')} />}
        </PageGroup>}
        <PageGroup title="Career Navigation">
          {canFindJob && <MenuRow icon="search" title="Find a Job" onClick={() => {
            if (!job && !life.career.seeking && !life.pending) void dispatch({ type: 'seek-work' }).then((success) => { if (success) go('jobs'); });
            else go('jobs');
          }} disabled={busy} />}
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
    case 'relationships': {
      const groups = relationshipGroups(life);
      return <>
        <PageGroup title="Family">
          {groups.family.map((relative) => <PersonRow key={relative.id} life={life} person={relative} onClick={() => go('person', relative.id)} />)}
          <MenuRow icon="tree" title="Family Tree" onClick={() => go('family-tree')} />
        </PageGroup>
        <PageGroup title="Love Life">
          <MenuRow icon="rose" title="Open Love Life" detail={groups.partner?.name ?? 'Dating, partners, and relationship history.'}
            onClick={() => go('love-life')} />
        </PageGroup>
        {groups.friends.length > 0 && <PageGroup title="Friends">
          {groups.friends.map((friend) => <PersonRow key={friend.id} life={life} person={friend} onClick={() => go('person', friend.id)} />)}
        </PageGroup>}
        {groups.acquaintances.length > 0 && <PageGroup title="Acquaintances">
          {groups.acquaintances.map((person) => <PersonRow key={person.id} life={life} person={person} onClick={() => go('person', person.id)} />)}
        </PageGroup>}
        {groups.former.length > 0 && <PageGroup title="Former Relationships">
          {groups.former.map((person) => <PersonRow key={person.id} life={life} person={person} onClick={() => go('person', person.id)} />)}
        </PageGroup>}
      </>;
    }
    case 'family-tree':
      return <>
        <PageGroup title="You"><MenuRow avatar={<Portrait appearance={character.appearance} age={character.age} />}
          title={`${character.firstName} ${character.lastName}`} detail={`Born ${character.birthYear}`} onClick={() => go('player-profile')} /></PageGroup>
        {familyTreeGroups(life).map(({ label, people }) => <PageGroup key={label} title={label}>
          {people.map((person) => <PersonRow key={person.id} life={life} person={person} detail={childParents(life, person)}
            onClick={() => go('person', person.id)} />)}
        </PageGroup>)}
      </>;
    case 'love-life': {
      const partner = relationshipGroups(life).partner;
      return <>
        {partner && <PageGroup title="Current Partner"><PersonRow life={life} person={partner} onClick={() => go('person', partner.id)} /></PageGroup>}
        <PageGroup title="Dating">
          {meetingControls(life, true).map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />)}
          <MenuRow icon="support" title="Ask Someone Out" detail={character.age < 18 ? 'Dating opens at age 18.' : undefined}
            disabled={character.age < 18} onClick={() => go('dating-profiles')} />
          <MenuRow icon="history" title="Relationship History" onClick={() => go('relationship-history')} />
        </PageGroup>
      </>;
    }
    case 'dating-profiles': {
      const people = datingCandidates(life);
      return <PageGroup title="People you know">
        {people.length ? people.map((person) => <PersonRow key={person.id} life={life} person={person} detail={datingSummary(life, person)}
          onClick={() => go('person', person.id)} />) : <p className="play-empty">There are no available matches yet.</p>}
      </PageGroup>;
    }
    case 'relationship-history':
      return life.social.romances.length ? life.social.romances.map((entry) => {
        const person = findContact(life, entry.person)!;
        return <PageGroup key={person.id} title={person.name}>
          <PersonRow life={life} person={person} detail={`${romanceLabels[entry.status]} · Since ${entry.started}`}
            onClick={() => go('person', person.id)} />
          {entry.history.map(({ year, text }, index) => <MenuRow key={index} title={String(year)} detail={text} />)}
        </PageGroup>;
      }) : <p className="play-empty">Your relationship history is empty.</p>;
    case 'player-profile':
      return <PageGroup title={`${character.firstName} ${character.lastName}`}>
        <div className="profile-art"><Portrait appearance={character.appearance} age={character.age} label="Your portrait" large /></div>
        <Rows items={[
          { label: character.causeOfDeath ? 'Age at death' : 'Age', value: character.age },
          { label: 'Gender identity', value: genderLabels[character.gender] },
          { label: 'Birth city', value: character.city }, { label: 'Education', value: educationStatus(life) },
          ...profileHealthRows(life),
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
      const social = relationshipControls(life, contact);
      const memories = contactHistory(life, contact);
      const showingProfile = page === 'person-info' || page === 'class-person-info' || page === 'work-person-info';
      const base = page === 'work-person' || page === 'work-person-info' ? 'work-person' :
        page === 'class-person' || page === 'class-person-info' ? 'class-person' : 'person';
      return <>
        <PageGroup title="Character">
          <PersonRow person={contact} life={life} opensDialog onClick={() => go(`${base}-info`, contact.id)} />
        </PageGroup>
        {social.length > 0 && <PageGroup title={contact.role === 'Child' ? 'Parenting' : 'Love Life'}>
          {social.map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />)}
        </PageGroup>}
        <PageGroup title="Interactions">
          {contactInteractions(life, contact).map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />)}
        </PageGroup>
        {showingProfile && <DetailDialog title="Character Profile" onDismiss={() => go(base, contact.id, true)}>
          <div className="detail-identity"><Portrait appearance={contact.appearance} age={contact.age} label={`Portrait of ${contact.name}`} />
            <div><strong>{contact.name}</strong><p>{contactRole(contact, life)}</p></div>
          </div>
          <Rows items={contactProfileRows(life, contact)} />
          <section className="detail-bond"><h3>Your bond</h3>
            {contactBondRows(contact).map((row) => <PageMeter key={row.label} {...row} />)}
          </section>
          {memories.length > 0 && <section className="detail-bond"><h3>Shared history</h3>
            <Rows items={memories.map(({ year, text }, index) => ({ key: String(index), label: String(year), value: text }))} />
          </section>}
        </DetailDialog>}
      </>;
    }
    case 'assets':
      return <>
        <PageGroup title="Banking">
          <MenuRow icon="bank" title="Finances" detail="Bank balance and transaction history."
            value={money(character.bank)} onClick={() => go('finances')} />
          <MenuRow icon="assets" title="Owned Assets" value={String(life.property.owned.length)} onClick={() => go('owned-assets')} />
        </PageGroup>
        <PageGroup title="Property and vehicles">
          <MenuRow icon="home" title="Housing" detail={residenceLabel(life)} onClick={() => go('housing')} />
          <MenuRow icon="cart" title="Shopping" detail="Browse houses, cars, and motorcycles." onClick={() => go('shopping')} />
        </PageGroup>
      </>;
    case 'housing':
      return <>
        <PageGroup title="Where you live"><MenuRow icon="home" title={residenceLabel(life)} /></PageGroup>
        <PageGroup title="Moving Out">{housingControls(life).map((item) => <MenuRow key={item.label} icon={item.icon}
          title={item.label} detail={item.issue ?? item.detail} disabled={busy || !!item.issue}
          onClick={() => void dispatch(item.action)} />)}</PageGroup>
      </>;
    case 'shopping':
      return <PageGroup title="Browse">{assetKinds.map((kind) => <MenuRow key={kind} icon={propertyCategories[kind].icon}
        title={propertyCategories[kind].label} value={String(listingsFor(kind).length)} onClick={() => go('shop-category', kind)} />)}</PageGroup>;
    case 'shop-category': {
      const kind = shoppingCategory(detail);
      if (!kind) return <p className="play-empty">This catalog is unavailable.</p>;
      return <PageGroup title={`${listingsFor(kind).length} listings`}>{listingsFor(kind).map((listing) => <MenuRow key={listing.id}
        avatar={<AssetImage listing={listing} />} title={listing.name} detail={listing.detail} value={money(listing.price)}
        onClick={() => go('shop-item', listing.id)} />)}</PageGroup>;
    }
    case 'shop-item': {
      const listing = assetById.get(detail ?? '');
      if (!listing) return <p className="play-empty">This listing is unavailable.</p>;
      const action = { type: 'buy-asset', id: listing.id } as const;
      const issue = propertyIssue(life, action);
      return <PageGroup title={listing.name}>
        <div className="asset-preview"><AssetImage listing={listing} large /><p>{listing.detail}</p></div>
        <MenuRow icon="cart" title="Buy" detail={issue ?? 'Pay from your current balance.'} value={money(listing.price)}
          disabled={busy || !!issue} onClick={() => void dispatch(action)} />
      </PageGroup>;
    }
    case 'owned-assets': {
      const owned = ownedListings(life);
      return owned.length ? assetKinds.map((kind) => {
        const entries = owned.filter(({ listing }) => listing.kind === kind);
        return entries.length ? <PageGroup key={kind} title={propertyCategories[kind].label}>{entries.map(({ id, year, listing, source }) =>
          <MenuRow key={id} avatar={<AssetImage listing={listing} />} title={listing.name}
            detail={`${source === 'gift' ? 'Gifted' : 'Purchased'} in ${year}${life.property.residence === id ? ' · Current home' : ''}`} />)}</PageGroup> : null;
      }) : <p className="play-empty">You do not own any houses or vehicles yet.</p>;
    }
    case 'finances':
      return <Finances life={life} />;
    case 'activities':
      return <>
        <PageGroup title="Mind & Body">
          {wellbeingActivities(life).map(activityRow)}
          {lifestyleActivities(life, 'Mind & Body').map(activityRow)}
        </PageGroup>
        <PageGroup title="Skill Training">
          {activitySkillCategories.map(({ category, label, icon }) => <MenuRow key={category} icon={icon} title={label}
            onClick={() => go('skill-training', category)} />)}
        </PageGroup>
        <PageGroup title="Entertainment">{lifestyleActivities(life, 'Entertainment').map(activityRow)}</PageGroup>
        <PageGroup title="Social Activities">
          {socialActivities(life).map(activityRow)}
        </PageGroup>
        <PageGroup title="Travel">{lifestyleActivities(life, 'Travel').map(activityRow)}</PageGroup>
        <PageGroup title="Healthcare"><MenuRow icon="medical" title="Doctors" detail="Browse healthcare services." onClick={() => go('doctor')} /></PageGroup>
        {!character.causeOfDeath && <PageGroup title="Appearance">
          <MenuRow icon="hair" title={canEditFace(character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
            onClick={() => go('appearance')} />
        </PageGroup>}
      </>;
    case 'doctor':
      return <DoctorsPage life={life} />;
    case 'appearance':
      return <AppearancePage life={life} back={() => go('activities')} />;
    case 'statistics':
      return <>
        <PageGroup title="Personal Growth"><MenuRow icon="study" title="My Skills" onClick={() => go('skills')} /></PageGroup>
        <PageGroup title="Attributes"><Rows items={stats.map((stat) => ({ label: statLabels[stat], value: `${character.attributes[stat]}%` }))} /></PageGroup>
        <PageGroup title="Background"><Rows items={[
          { label: 'Personality', value: character.personality },
          { label: 'Natural talent', value: character.talent ? talentLabels[character.talent] : 'None' },
          { label: 'Family background', value: backgroundLabels[character.background] },
        ]} /></PageGroup>
      </>;
    case 'skills': case 'skill-training': {
      const category = page === 'skill-training' ? skillCategory(detail) : undefined;
      return <>
        <PageGroup title="Training this year"><Rows items={[{ label: 'Sessions', value: annualTrainingSummary(life) }]} /></PageGroup>
        {!category && life.skills.hobbies.length > 0 && <PageGroup title="My Hobbies">{life.skills.hobbies.map((id) =>
          <MenuRow key={id} icon={skills[id].icon} title={skills[id].name} onClick={() => go('skill', id)} />)}</PageGroup>}
        {skillGroups(life, category).map(({ label, rows }) => <PageGroup key={label} title={label}>
          {rows.map((row) => <MenuRow key={row.id} icon={row.icon} title={row.name} detail={row.detail}
            onClick={() => go('skill', category ? `${row.id}~${category}` : row.id)}>
            <PageMeter label="Proficiency" value={row.proficiency} />
          </MenuRow>)}
        </PageGroup>)}
      </>;
    }
    case 'skill': {
      const id = detail?.split('~')[0];
      if (!isSkillId(id)) return <p className="play-empty">This skill is unavailable.</p>;
      const details = skillDetails(life, id);
      return <>
        <PageGroup title="Progress">
          <div className="play-group-inset"><PageMeter label="Proficiency" value={details.proficiency} /></div>
          <Rows items={details.rows} />
        </PageGroup>
        <PageGroup title="Training">{details.controls.map(activityRow)}</PageGroup>
        <PageGroup title="Achievements"><Rows items={details.achievements} /></PageGroup>
        <PageGroup title="Hobby">{activityRow(details.hobby)}</PageGroup>
      </>;
    }
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
            ...familyTreeGroups(life).flatMap(({ people }) => people)
              .map((relative) => ({ key: relative.id, label: contactRole(relative, life), value: relative.name })),
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
