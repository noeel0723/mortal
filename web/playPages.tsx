import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { lifestyleActivities, mindAndBodyActivities, type ActivityControl } from '../src/activityView';
import { isSocialPage, localSocialGroups, localSocialTitle, socialActivityLinks, socialPages } from '../src/localSocialView';
import { assetById, assetKinds } from '../src/data/shops';
import type { AssetListing } from '../src/data/shops';
import { backgroundLabels, genderLabels, talentLabels } from '../src/data/veyra';
import { contactBondRows, contactHistory, contactInteractions, contactProfileRows, contactRole } from '../src/contactView';
import {
  canShowRetirement, careerCard, careerControl, careerRows, careerSummary, careerTimeline, defaultJobFilters, employmentLabels,
  financeEntries, financeOverview, financeYears, hiringOverview, jobIcon, jobListings, jobRatings, lifetimeEarnings, vacancyActions, vacancyRows,
} from '../src/careerView';
import type { JobFilters } from '../src/careerView';
import { programById } from '../src/data/academics';
import { jobById } from '../src/data/jobs';
import { isSkillId, skillCategories, skills } from '../src/data/skills';
import { educationStatus } from '../src/engine/academics';
import { workAge, workHours } from '../src/engine/career';
import { industries } from '../src/engine/careerTypes';
import { currentClass, findContact, isPeer, isSchoolStage } from '../src/engine/school';
import { spendTimeAllIssue } from '../src/engine/relationshipTime';
import { romanceLabels } from '../src/engine/love';
import { intimacyGuests, intimacyIssue } from '../src/engine/intimacy';
import { isDatingApp } from '../src/engine/dating';
import type { DatingAppSource } from '../src/engine/dating';
import { childParents, datingCandidates, datingControls, datingSummary, familyTreeGroups, firstDateControls, hookupControl, relationshipCareControls,
  relationshipControls, relationshipGroups, relationshipOverview } from '../src/socialView';
import { accessoryIssue, accessoryOptions, canEditFace, noAccessories } from '../src/engine/appearance';
import type { Accessories } from '../src/engine/appearance';
import { adoptionCandidates, adoptionIssue } from '../src/engine/adoption';
import { availableProcedures, findProcedure, surgeryIssue } from '../src/engine/plasticSurgery';
import { accessoryFields, adoptionProfile, surgeonRows } from '../src/personalCareView';
import { propertyIssue, propertyQuote } from '../src/engine/property';
import { assetArt } from '../src/portraits/assetArt';
import { assetDetails, householdRows, housingControls, listingsFor, ownedListings, ownershipDetail, propertyCategories, residenceLabel, shoppingCategory } from '../src/propertyView';
import { estate } from '../src/engine/wealth';
import { instrumentNames } from '../src/engine/investments';
import { estateHistory, estateRows, familyMilestoneRows, finalAssetRows, finalSkillRows, findFund, funds, fundView, loanView, parseCashAmount, retirementView, savingsControls, savingsHistory, savingsRows } from '../src/wealthView';
import type { FinanceControl } from '../src/wealthView';
import { activeCoworkers } from '../src/engine/workplace';
import type { HealthService } from '../src/engine/healthTypes';
import { careSections, careSelection, careServices, profileHealthRows } from '../src/healthView';
import {
  academicActivities, academicControl, academicRecordGroups, availableProgramGroups, educationOverview, enrollmentControls,
  enrollmentRows, gradeLabel, institutionCard, programControls, programRows,
} from '../src/educationView';
import type { EducationControl } from '../src/educationView';
import { stats } from '../src/engine/types';
import type { Action, City, Contact, Life } from '../src/engine/types';
import { en, money, statLabels } from '../src/i18n/en';
import type { Emoji } from '../src/theme/tokens';
import { useGame } from './browserStore';
import { activitySkillCategories, annualTrainingSummary, skillCategory, skillDetails, skillGroups } from '../src/skillView';
import { cityFromSlug, cityReport, compareCities, currentNews, industryReport, relocationDescription, worldHistory, worldOverview, worldReports } from '../src/worldView';
import { Achievements, Settings } from './menu';
import { AppearancePage, Portrait } from './portraits';
import { DetailDialog } from './detailDialog';
import { DatingDialog, DatingProfileForm } from './datingDialog';
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
  properties: 'Properties',
  vehicles: 'Vehicles',
  'asset-records': 'Ownership History',
  'owned-detail': 'Asset Details',
  finances: 'Finances',
  banking: 'Savings Account',
  loans: 'Loans & Debts',
  retirement: 'Retirement',
  investments: 'Investments',
  fund: 'Holding',
  transactions: 'Transaction History',
  activities: 'Activities',
  ...socialPages,
  love: 'Love',
  'dating-profile': 'Dating Profile',
  threesome: 'Threesome',
  'mind-body': 'Mind & Body',
  doctor: 'Doctors',
  appearance: 'Appearance',
  accessories: 'Accessories',
  adoption: 'Adoption',
  'plastic-surgery': 'Plastic Surgery',
  statistics: 'Life Statistics',
  skills: 'My Skills',
  'skill-training': 'Skill Training',
  skill: 'Skill Details',
  world: 'World',
  'world-industries': 'Industry Report',
  'world-cities': 'Compare Cities',
  'world-city': 'City Details',
  'world-news': 'World News',
  'world-history': 'World History',
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
  neighborhood: 'activities',
  neighbor: 'neighborhood',
  communities: 'activities',
  community: 'communities',
  'club-member': 'community',
  'local-library': 'activities',
  'library-books': 'local-library',
  'reading-history': 'local-library',
  finances: 'assets',
  shopping: 'assets',
  'shop-category': 'shopping',
  'shop-item': 'shop-category',
  housing: 'assets',
  'owned-assets': 'assets',
  properties: 'assets',
  vehicles: 'assets',
  'asset-records': 'owned-assets',
  'owned-detail': 'owned-assets',
  banking: 'assets',
  loans: 'activities',
  retirement: 'assets',
  investments: 'assets',
  transactions: 'assets',
  fund: 'investments',
  appearance: 'activities',
  accessories: 'activities',
  adoption: 'activities',
  'plastic-surgery': 'activities',
  doctor: 'activities',
  love: 'activities',
  'dating-profile': 'love',
  threesome: 'love',
  'mind-body': 'activities',
  skills: 'statistics',
  'skill-training': 'activities',
  skill: 'skills',
  world: 'player-profile',
  'world-industries': 'world',
  'world-cities': 'world',
  'world-city': 'world-cities',
  'world-news': 'world',
  'world-history': 'world',
  settings: 'menu',
  achievements: 'menu',
};

export function PlayPageHeader({ life, page, person, schoolTitle, detail, go }: {
  life: Life; page: DetailPage; person?: Contact; schoolTitle?: string; detail?: string; go: Navigate;
}) {
  let parent = parentPages[page] ?? 'journal';
  if (page === 'love-life' && detail === 'love') parent = 'love';
  if (page === 'owned-detail') {
    const section = detail?.split('~')[1];
    if (section === 'properties' || section === 'vehicles' || section === 'asset-records') parent = section;
  }
  if (page === 'education' && schoolTitle) parent = 'journal';
  const trainingCategory = page === 'skill' ? skillCategory(detail?.split('~')[1]) : undefined;
  if (trainingCategory) parent = 'skill-training';
  const parentDetail = page === 'shop-item' ? assetById.get(detail ?? '')?.kind : page === 'club-member' ? detail?.split('~')[0] : trainingCategory;
  const titleFor = (target: GamePage, value?: string) => {
    if (isSocialPage(target)) return localSocialTitle(life, target, value);
    const instrument = target === 'fund' ? findFund(value) : undefined;
    if (instrument) return instrumentNames[instrument];
    if (target === 'education' && schoolTitle) return schoolTitle;
    if (target === 'world-city') return cityFromSlug(value) ?? pageTitles[target];
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

function PersonRow({ person, life, detail, onClick, opensDialog, disabled }: {
  person: Contact; life?: Life; detail?: string; onClick?: () => void; opensDialog?: boolean; disabled?: boolean;
}) {
  const role = contactRole(person, life);
  return <MenuRow title={person.name} avatar={<Portrait appearance={person.appearance} age={person.age} />} onClick={onClick}
    opensDialog={opensDialog} disabled={disabled}
    detail={detail ?? `${role} · ${person.alive ? en.age(person.age) : 'Deceased'}`}>
    <PageMeter label="Affection" value={person.bond.affection} />
  </MenuRow>;
}

function GroupEncounter({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [selected, select] = useState<string>();
  const candidates = intimacyGuests(life);
  const first = candidates.find(({ id }) => id === selected);
  const issue = intimacyIssue(life, { encounter: 'threesome' });
  return <PageGroup title={first ? 'Choose Second Guest' : 'Choose First Guest'}>
    {issue && !life.pending && <p className="play-empty">{issue}</p>}
    {first && <MenuRow icon="person" title="Change First Guest" detail={first.name} disabled={busy} onClick={() => select(undefined)} />}
    {(first ? intimacyGuests(life, first) : candidates).map((person) =>
      <PersonRow key={person.id} life={life} person={person} opensDialog={!!first} disabled={busy || !!issue} onClick={() => {
        if (!first) select(person.id);
        else void dispatch({ type: 'intimacy', encounter: 'threesome', first: first.id, second: person.id })
          .then((success) => { if (success) select(undefined); });
      }} />)}
  </PageGroup>;
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
      <Rows items={hiringOverview(life)} />
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

function Finances({ life, historyOnly = false }: { life: Life; historyOnly?: boolean }) {
  const [year, setYear] = useState<number | null>(life.year);
  const entries = financeEntries(life, year);
  return <>
    {!historyOnly && <PageGroup title="Current Net Worth"><Rows items={estateRows(life)} /></PageGroup>}
    <PageGroup title={historyOnly ? 'Filter' : `Financial overview · ${year ?? life.year}`}>
      <div className="play-group-inset field-grid">
        <label>Transaction year<select value={year ?? ''} onChange={(event) => setYear(event.target.value ? Number(event.target.value) : null)}>
          <option value="">All years</option>{financeYears(life).map((option) => <option key={option}>{option}</option>)}
        </select></label>
      </div>
      {!historyOnly && <Rows items={financeOverview(life, year ?? life.year)} />}
    </PageGroup>
    <PageGroup title="Transactions">
      {entries.length ? entries.map((item, index) => <MenuRow key={index} title={item.label} detail={`${item.year} · ${item.group}`} value={money(item.displayAmount)} />) :
        <p className="play-empty">No transactions yet.</p>}
    </PageGroup>
    {!historyOnly && estateHistory(life).length > 0 && <PageGroup title="Annual Valuations"><Rows items={estateHistory(life)} /></PageGroup>}
  </>;
}

function FinanceConfirm({ selection, close }: { selection: { label: string; detail?: string; action: Action }; close: () => void }) {
  const { busy, dispatch } = useGame();
  return <DetailDialog title={selection.label} onDismiss={close}>
    {selection.detail && <p>{selection.detail}</p>}
    <Button icon="accept" kind="primary" disabled={busy} onClick={() => {
      close();
      void dispatch(selection.action);
    }}>Confirm</Button>
  </DetailDialog>;
}

function WealthPage({ life, page, detail, go }: { life: Life; page: 'banking' | 'loans' | 'retirement' | 'investments' | 'fund'; detail?: string; go: Navigate }) {
  const [amount, setAmount] = useState('');
  const [selected, select] = useState<{ label: string; detail?: string; action: Action } | null>(null);
  const busy = useGame((state) => state.busy);
  const rows = (controls: FinanceControl[]) => controls.map((item) => <MenuRow key={item.label} title={item.label} icon={item.icon}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} opensDialog onClick={() => select(item)} />);
  const modal = selected && <FinanceConfirm selection={selected} close={() => select(null)} />;
  if (page === 'banking') {
    const history = savingsHistory(life);
    return <>
      <PageGroup title="Account"><Rows items={savingsRows(life)} /></PageGroup>
      <PageGroup title="Transfer">
        <div className="play-group-inset field-grid"><label>Amount in dollars<input type="text" inputMode="decimal" maxLength={11} placeholder="0.00"
          value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></label></div>
        {rows(savingsControls(life, parseCashAmount(amount)))}
      </PageGroup>
      {history.length > 0 && <PageGroup title="Savings History"><Rows items={history} /></PageGroup>}
      {modal}
    </>;
  }
  if (page === 'loans') {
    const model = loanView(life);
    return <>
      <PageGroup title="Credit"><Rows items={model.credit} /></PageGroup>
      {model.offer ? <PageGroup title="Fixed-Rate Loan Offer"><Rows items={model.offer.rows} />{rows(model.offer.controls)}</PageGroup> :
        <PageGroup title="Apply for a Personal Loan">{rows(model.applications)}</PageGroup>}
      {model.loans.map((item) => <PageGroup key={item.title} title={item.title}>
        <Rows items={item.rows} />{rows(item.controls)}{!!item.history.length && <Rows items={item.history} />}
      </PageGroup>)}
      {modal}
    </>;
  }
  if (page === 'retirement') {
    const model = retirementView(life);
    const action = { type: 'retire' } as const;
    const control = careerControl(life, action, 'Retire', 'retire');
    return <>
      <PageGroup title="Veyra Pension"><Rows items={model.rows} />
        {life.career.retiredYear === null && <MenuRow title="Retire" icon="retire" detail={control.issue ?? 'Ends employment and opens eligible pension payments.'}
          disabled={busy || !!control.issue} opensDialog onClick={() => select({ label: 'Retire', detail: 'This ends employment permanently.', action })} />}
      </PageGroup>
      {model.history.length > 0 && <PageGroup title="Contribution History"><Rows items={model.history} /></PageGroup>}
      {modal}
    </>;
  }
  if (page === 'fund') {
    const instrument = findFund(detail);
    if (!instrument) return <p className="play-empty">This fund is unavailable.</p>;
    const model = fundView(life, instrument);
    return <><PageGroup title="Holding"><Rows items={model.rows} /></PageGroup><PageGroup title="Buy Units">{rows(model.buy)}</PageGroup>
      {!!model.sell.length && <PageGroup title="Sell Units">{rows(model.sell)}</PageGroup>}{modal}</>;
  }
  return <PageGroup title="Veyra Funds">{funds(life).map((item) => <MenuRow key={item.id} title={item.name} icon={item.icon}
    detail={item.detail} onClick={() => go('fund', item.id)} />)}</PageGroup>;
}

function OwnedDetail({ life, id }: { life: Life; id?: string }) {
  const [selected, select] = useState<{ label: string; detail?: string; action: Action } | null>(null);
  const { busy, dispatch } = useGame();
  const item = ownedListings(life, true).find(({ ownershipId }) => ownershipId === id);
  if (!item) return <p className="play-empty">This ownership record is unavailable.</p>;
  const details = assetDetails(life, item);
  return <>
    <PageGroup title={item.listing.name}>
      <div className="asset-preview"><AssetImage listing={item.listing} large /></div><Rows items={details.displayRows} />
    </PageGroup>
    {!!details.household.length && <PageGroup title="Household"><Rows items={details.household} /></PageGroup>}
    {!!details.driving.length && <PageGroup title="Family Drivers">{details.driving.map((control) => <MenuRow key={control.action.person}
      title={control.label} icon={control.icon} detail={control.issue ?? control.detail} disabled={busy || !!control.issue}
      opensDialog onClick={() => control.action.mode === 'teach' ? void dispatch(control.action) : select(control)} />)}</PageGroup>}
    {!!details.rentalRows.length && <PageGroup title="Rental"><Rows items={details.rentalRows} /></PageGroup>}
    {!!details.controls.length && <PageGroup title="Manage">{details.controls.map((control) => <MenuRow key={control.label} title={control.label} icon={control.icon}
      detail={control.issue ?? control.detail} disabled={busy || !!control.issue} opensDialog onClick={() => select(control)} />)}</PageGroup>}
    {!!details.history.length && <PageGroup title="Ownership History"><Rows items={details.history} /></PageGroup>}
    {selected && <FinanceConfirm selection={selected} close={() => select(null)} />}
  </>;
}

function WorldCity({ life, city }: { life: Life; city: City }) {
  const [confirm, setConfirm] = useState(false);
  const { busy, dispatch } = useGame();
  const report = cityReport(life, city);
  return <>
    <p className="play-empty">{report.description}</p>
    <PageGroup title="City Indicators"><Rows items={report.rows} /></PageGroup>
    {!report.current && <PageGroup title="Relocation">
      <MenuRow title={`Move to ${city}`} icon="train" detail={report.issue ?? `Moving cost ${report.fee}`} opensDialog
        disabled={busy || !!report.issue} onClick={() => setConfirm(true)} />
    </PageGroup>}
    {confirm && <DetailDialog title="Confirm Relocation" onDismiss={() => setConfirm(false)}>
      <p>{relocationDescription}</p>
      <Rows items={[{ label: 'Moving cost', value: report.fee }]} />
      <Button kind="primary" icon="accept" disabled={busy || !!report.issue} onClick={() => {
        setConfirm(false);
        void dispatch({ type: 'relocate', city });
      }}>Confirm Move</Button>
    </DetailDialog>}
  </>;
}

function AccessoriesPage({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [choices, setChoices] = useState<Accessories>(life.character.appearance.accessories ?? noAccessories);
  const { appearance, age } = life.character;
  const issue = accessoryIssue(life, choices);
  return <div className="play-group-content">
    <div className="profile-art"><Portrait appearance={{ ...appearance, accessories: choices }} age={age} label="Accessory preview" large /></div>
    <div className="personal-care-form">
      <div className="field-grid">{accessoryFields.map(({ key, label, remove }) =>
        <label key={key}>{label}<select value={choices[key]} onChange={(event) => {
          const value = accessoryOptions[key].find((item) => item === event.target.value);
          if (value) setChoices({ ...choices, [key]: value });
        }}>
          {accessoryOptions[key].map((item) => <option key={item} value={item}>{item === 'None' ? remove : item}</option>)}
        </select></label>
      )}</div>
      <Button kind="primary" icon="accept" disabled={busy || !!issue}
        onClick={() => void dispatch({ type: 'change-accessories', choices })}>Save Accessories</Button>
    </div>
  </div>;
}

function AdoptionPage({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [selected, setSelected] = useState<string>();
  const candidates = adoptionCandidates(life);
  const candidate = candidates.find(({ person }) => person.id === selected);
  const profile = candidate && adoptionProfile(candidate);
  const issue = adoptionIssue(life);
  return <>
    <PageGroup title="Children Available">
      {candidates.map(({ person, behavior }) =>
        <MenuRow key={person.id} title={person.name} detail={en.age(person.age)}
          avatar={<Portrait appearance={person.appearance} age={person.age} />} opensDialog onClick={() => setSelected(person.id)}>
          <PageMeter label="Behavior" value={behavior} />
        </MenuRow>)}
    </PageGroup>
    {candidate && profile && <DetailDialog title="Adoption Profile" onDismiss={() => setSelected(undefined)}>
      <div className="personal-care-identity">
        <Portrait appearance={candidate.person.appearance} age={candidate.person.age} label={`Portrait of ${candidate.person.name}`} />
        <strong>{candidate.person.name}</strong>
      </div>
      <Rows items={profile.details} />
      <div className="detail-bond">{profile.meters.map((row) => <PageMeter key={row.label} {...row} />)}</div>
      {issue && <p className="play-empty">{issue}</p>}
      <Button kind="primary" icon="adoption" className="personal-care-action" disabled={busy || !!issue} onClick={() => {
        setSelected(undefined);
        void dispatch({ type: 'adopt-child', person: candidate.person.id });
      }}>Adopt Child</Button>
    </DetailDialog>}
  </>;
}

function SurgeryPage({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [selected, setSelected] = useState<string>();
  const procedure = findProcedure(life, selected);
  const issue = surgeryIssue(life);
  return <>
    <PageGroup title="Cosmetic Procedures">
      {availableProcedures(life).map(({ id, title, detail, icon }) =>
        <MenuRow key={id} title={title} detail={issue ?? detail} icon={icon} opensDialog
          disabled={busy || !!issue} onClick={() => setSelected(id)} />)}
    </PageGroup>
    {procedure && <DetailDialog title={procedure.title} onDismiss={() => setSelected(undefined)}>
      <p>Choose a surgeon. A complication can lower Looks.</p>
      <div className="personal-care-providers">{surgeonRows(life, procedure).map(({ surgeon, detail, issue: blocked }) =>
        <MenuRow key={surgeon.id} title={surgeon.name} icon="medical" detail={blocked ? `${detail} · ${blocked}` : detail}
          disabled={busy || !!blocked} onClick={() => {
            setSelected(undefined);
            void dispatch({ type: 'plastic-surgery', procedure: procedure.id, surgeon: surgeon.id });
          }} />)}</div>
    </DetailDialog>}
  </>;
}

export function PlayPage({ life, page, person, detail, go, home, newLife }: {
  life: Life; page: DetailPage; person?: Contact; detail?: string; go: Navigate; home: () => void; newLife: () => void;
}) {
  const { busy, dispatch, save } = useGame();
  const [datingApp, setDatingApp] = useState<DatingAppSource>();
  const [dateId, setDateId] = useState<string>();
  const { character } = life;
  const job = life.career.current;
  const canFindJob = character.age >= workAge && !character.causeOfDeath && life.career.retiredYear === null;
  const activityRow = (item: ActivityControl) => <MenuRow key={item.label} icon={item.icon} title={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue}
    opensDialog={item.action.type === 'dating-match' || item.action.type === 'intimacy' || item.action.type === 'meet'}
    onClick={() => {
      if (item.action.type === 'dating-match' && isDatingApp(item.action.source)) setDatingApp(item.action.source);
      else void dispatch(item.action);
    }} />;
  const datingDialog = datingApp && <DatingDialog key={datingApp} source={datingApp} life={life} busy={busy}
    onClose={() => setDatingApp(undefined)} search={(preferences) => {
      setDatingApp(undefined);
      void dispatch({ type: 'dating-match', source: datingApp, preferences });
    }} />;

  if (isSocialPage(page)) return localSocialGroups(life, page, detail).map((group) =>
    <PageGroup key={group.title} title={group.title}>
      {group.rows.map(({ key, label, icon, detail, issue, person, route, action }) => <MenuRow
        key={key ?? label} title={label} icon={icon} detail={issue ?? detail} disabled={busy || !!issue}
        avatar={person && <Portrait appearance={person.appearance} age={person.age} label={`Portrait of ${person.name}`} />}
        onClick={action ? () => void dispatch(action) : route ? () => go(route.page, route.detail) : undefined} />)}
    </PageGroup>);

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
        <PageGroup title={listing.job.title}><Rows items={vacancyRows(listing, life)} /></PageGroup>
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
      const issue = spendTimeAllIssue(life);
      return <>
        <div className="play-group-content">
          <MenuRow icon="together" title="Spend Time with All" detail={issue ?? 'Catch up with your relationships'}
            disabled={busy || !!issue} onClick={() => void dispatch({ type: 'spend-time-all' })} />
        </div>
        <PageGroup title="Family">
          {groups.family.map((relative) => <PersonRow key={relative.id} life={life} person={relative} onClick={() => go('person', relative.id)} />)}
          <MenuRow icon="tree" title="Family Tree" onClick={() => go('family-tree')} />
        </PageGroup>
        <PageGroup title="Love Life">
          <MenuRow icon="rose" title="Open Love Life" detail={groups.partners.length ? groups.partners.map(({ name }) => name).join(', ') : 'Dating, partners, and relationship history.'}
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
      const { partners, prospects } = relationshipGroups(life);
      return <>
        {partners.length > 0 && <PageGroup title={partners.length === 1 ? 'Current Partner' : 'Current Partners'}>
          {partners.map((partner) => <PersonRow key={partner.id} life={life} person={partner}
            detail={relationshipOverview(life, partner)?.summary} onClick={() => go('person', partner.id)} />)}
        </PageGroup>}
        {prospects.length > 0 && <PageGroup title="Getting to Know Each Other">
          {prospects.map((person) => <PersonRow key={person.id} life={life} person={person} onClick={() => go('person', person.id)} />)}
        </PageGroup>}
        <PageGroup title="Connections and History">
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
          { label: 'Birth city', value: character.birthCity },
          { label: 'Current city', value: character.city },
          { label: 'Year', value: life.year },
          { label: 'Education', value: educationStatus(life) },
          ...profileHealthRows(life),
        ]} />
        <MenuRow icon="world" title="World" detail="News, cities, and relocation" onClick={() => go('world')} />
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
      const care = relationshipCareControls(life, contact);
      const overview = relationshipOverview(life, contact);
      const memories = contactHistory(life, contact);
      const interactions = contactInteractions(life, contact);
      const showingProfile = page === 'person-info' || page === 'class-person-info' || page === 'work-person-info';
      const base = page === 'work-person' || page === 'work-person-info' ? 'work-person' :
        page === 'class-person' || page === 'class-person-info' ? 'class-person' : 'person';
      return <>
        <PageGroup title="Character">
          <PersonRow person={contact} life={life} detail={overview?.summary} opensDialog onClick={() => go(`${base}-info`, contact.id)} />
        </PageGroup>
        {social.length > 0 && <PageGroup title={contact.role === 'Child' ? 'Parenting' : 'Love Life'}>
          {social.map((item) => {
            const ask = item.action.type === 'romance' && item.action.action === 'ask';
            return <MenuRow key={item.label} icon={item.icon} title={item.label}
              detail={item.issue ?? item.detail} disabled={busy || !!item.issue} opensDialog={ask || item.action.type === 'intimacy'}
              onClick={() => { if (ask) setDateId(contact.id); else void dispatch(item.action); }} />;
          })}
        </PageGroup>}
        {care.length > 0 && <PageGroup title="Relationship & Communication">
          {overview?.agreement && <MenuRow title="Agreement" detail={overview.agreement} />}
          {overview?.goal && <MenuRow title="Relationship Goal" detail={overview.goal} />}
          {overview?.concerns.map(({ label, value }) => <MenuRow key={label} title={label} detail={value} />)}
          {care.map(activityRow)}
        </PageGroup>}
        {interactions.length > 0 && <PageGroup title="Interactions">
          {interactions.map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onClick={() => void dispatch(item.action)} />)}
        </PageGroup>}
        {dateId === contact.id && <DetailDialog title="Choose a Date Venue" onDismiss={() => setDateId(undefined)}>
          {firstDateControls(life, contact).map((item) => <MenuRow key={item.label} icon={item.icon} title={item.label}
            detail={item.issue ?? item.detail} disabled={busy || !!item.issue}
            onClick={() => { setDateId(undefined); void dispatch(item.action); }} />)}
        </DetailDialog>}
        {showingProfile && <DetailDialog title="Character Profile" onDismiss={() => go(base, contact.id, true)}>
          <div className="detail-identity"><Portrait appearance={contact.appearance} age={contact.age} label={`Portrait of ${contact.name}`} />
            <div><strong>{contact.name}</strong><p>{contactRole(contact, life)}</p></div>
          </div>
          <Rows items={contactProfileRows(life, contact)} />
          <section className="detail-bond"><h3>Your bond</h3>
            {contactBondRows(contact).map((row) => <PageMeter key={row.label} {...row} />)}
          </section>
          {!!overview?.concerns.length && <section className="detail-bond"><h3>Relationship Concerns</h3><Rows items={overview.concerns} /></section>}
          {!!overview?.milestones.length && <section className="detail-bond"><h3>Relationship Milestones</h3><Rows items={overview.milestones} /></section>}
          {memories.length > 0 && <section className="detail-bond"><h3>Shared history</h3>
            <Rows items={memories.map(({ year, text }, index) => ({ key: String(index), label: String(year), value: text }))} />
          </section>}
        </DetailDialog>}
      </>;
    }
    case 'assets':
      return <>
        <PageGroup title="Banking">
          <MenuRow icon="bank" title="Finances" detail="Net worth" value={money(estate(life).total)} onClick={() => go('finances')} />
          <MenuRow icon="savings" title="Savings Account" value={money(life.wealth.savings)} onClick={() => go('banking')} />
          <MenuRow icon="assets" title="Owned Assets" value={String(ownedListings(life).length)} onClick={() => go('owned-assets')} />
          <MenuRow icon="history" title="Transaction History" onClick={() => go('transactions')} />
        </PageGroup>
        <PageGroup title="Property and vehicles">
          <MenuRow icon="home" title="Properties" onClick={() => go('properties')} />
          <MenuRow icon="car" title="Vehicles" onClick={() => go('vehicles')} />
          <MenuRow icon="home" title="Housing" detail={residenceLabel(life)} onClick={() => go('housing')} />
          <MenuRow icon="cart" title="Shopping" detail="Browse houses, cars, and motorcycles." onClick={() => go('shopping')} />
        </PageGroup>
        <PageGroup title="Long-Term Finances">
          <MenuRow icon="retire" title="Retirement" onClick={() => go('retirement')} />
          <MenuRow icon="harder" title="Investments" onClick={() => go('investments')} />
        </PageGroup>
      </>;
    case 'housing': {
      const household = householdRows(life);
      return <>
        <PageGroup title="Where you live"><MenuRow icon="home" title={residenceLabel(life)} /></PageGroup>
        {!!household.length && <PageGroup title="Household"><Rows items={household} /></PageGroup>}
        <PageGroup title="Moving Out">{housingControls(life).map((item) => <MenuRow key={item.label} icon={item.icon}
          title={item.label} detail={item.issue ?? item.detail} disabled={busy || !!item.issue}
          onClick={() => void dispatch(item.action)} />)}</PageGroup>
      </>;
    }
    case 'shopping':
      return <PageGroup title="Browse">{assetKinds.map((kind) => <MenuRow key={kind} icon={propertyCategories[kind].icon}
        title={propertyCategories[kind].label} value={String(listingsFor(kind).length)} onClick={() => go('shop-category', kind)} />)}</PageGroup>;
    case 'shop-category': {
      const kind = shoppingCategory(detail);
      if (!kind) return <p className="play-empty">This catalog is unavailable.</p>;
      return <PageGroup title={`${listingsFor(kind).length} listings`}>{listingsFor(kind).map((listing) => <MenuRow key={listing.id}
        avatar={<AssetImage listing={listing} />} title={listing.name} detail={listing.detail} value={money(propertyQuote(life, listing).price)}
        onClick={() => go('shop-item', listing.id)} />)}</PageGroup>;
    }
    case 'shop-item': {
      const listing = assetById.get(detail ?? '');
      if (!listing) return <p className="play-empty">This listing is unavailable.</p>;
      const action = { type: 'buy-asset', id: listing.id } as const;
      const issue = propertyIssue(life, action);
      return <PageGroup title={listing.name}>
        <div className="asset-preview"><AssetImage listing={listing} large /><p>{listing.detail}</p></div>
        <MenuRow icon="cart" title="Buy" detail={issue ?? 'Pay from your current balance.'} value={money(propertyQuote(life, listing).price)}
          disabled={busy || !!issue} onClick={() => void dispatch(action)} />
      </PageGroup>;
    }
    case 'owned-assets': case 'properties': case 'vehicles': case 'asset-records': {
      const owned = ownedListings(life, page === 'asset-records').filter(({ listing }) =>
        page === 'properties' ? listing.kind === 'houses' : page === 'vehicles' ? listing.kind !== 'houses' : true);
      return <>{owned.length ? assetKinds.map((kind) => {
        const entries = owned.filter(({ listing }) => listing.kind === kind);
        return entries.length ? <PageGroup key={kind} title={propertyCategories[kind].label}>{entries.map((item) =>
          <MenuRow key={item.ownershipId} avatar={<AssetImage listing={item.listing} />} title={item.listing.name}
            detail={ownershipDetail(item, life.property.residence)} onClick={() => go('owned-detail', `${item.ownershipId}~${page}`)} />)}</PageGroup> : null;
      }) : <p className="play-empty">No assets to show.</p>}
        {page !== 'asset-records' && <PageGroup title="Records"><MenuRow icon="history" title="View Ownership History" onClick={() => go('asset-records')} /></PageGroup>}
      </>;
    }
    case 'owned-detail':
      return <OwnedDetail key={detail} life={life} id={detail?.split('~')[0]} />;
    case 'finances':
      return <Finances life={life} />;
    case 'transactions':
      return <Finances key="transactions" life={life} historyOnly />;
    case 'banking': case 'loans': case 'retirement': case 'investments': case 'fund':
      return <WealthPage key={`${page}-${detail ?? ''}`} page={page} detail={detail} life={life} go={go} />;
    case 'activities':
      return <>
        <PageGroup title="Love"><MenuRow icon="health" title="Love" detail="Meet someone new" onClick={() => go('love')} /></PageGroup>
        <PageGroup title="Healthcare">
          <MenuRow icon="medical" title="Doctors" detail="Get medical care" onClick={() => go('doctor')} />
          <MenuRow icon="adoption" title="Adoption" detail="Meet children available for adoption" onClick={() => go('adoption')} />
          <MenuRow icon="surgery" title="Plastic Surgery" detail="Browse cosmetic procedures" onClick={() => go('plastic-surgery')} />
        </PageGroup>
        {!character.causeOfDeath && <PageGroup title="Appearance">
          <MenuRow icon="hair" title={canEditFace(character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
            onClick={() => go('appearance')} />
          <MenuRow icon="hat" title="Accessories" detail="Try hats and glasses" onClick={() => go('accessories')} />
        </PageGroup>}
        <PageGroup title="Wellbeing">
          <MenuRow icon="meditation" title="Mind & Body" detail="Rest, exercise, and unwind" onClick={() => go('mind-body')} />
        </PageGroup>
        <PageGroup title="Social Activities">{socialActivityLinks(life).map(({ label, icon, detail, issue, route }) =>
          <MenuRow key={label} title={label} icon={icon} detail={issue ?? detail} disabled={!!issue}
            onClick={() => go(route.page, route.detail)} />)}</PageGroup>
        <PageGroup title="Skill Training">
          {activitySkillCategories.map(({ category, label, icon }) => <MenuRow key={category} icon={icon} title={label}
            onClick={() => go('skill-training', category)} />)}
        </PageGroup>
        <PageGroup title="Finance">
          <MenuRow icon="work" title="Loans & Debts" detail="Review loans and repayments" onClick={() => go('loans')} />
        </PageGroup>
        <PageGroup title="Travel">{lifestyleActivities(life, 'Travel').map(activityRow)}</PageGroup>
      </>;
    case 'love': {
      const issue = intimacyIssue(life, { encounter: 'threesome' });
      return <>
        <PageGroup title="Discover">{datingControls(life).map(activityRow)}</PageGroup>
        <PageGroup title="Casual Encounters">{activityRow(hookupControl(life))}
          <MenuRow icon="classroom" title="Threesome" detail={issue ?? 'Invite two adults'}
            disabled={busy || !!issue} onClick={() => go('threesome')} />
        </PageGroup>
        <PageGroup title="Your Love Life">
          <MenuRow icon="person" title="Dating Profile" detail="Edit your dating preferences" onClick={() => go('dating-profile')} />
          <MenuRow icon="loveLetter" title="My Love Life" detail="See your matches and partners" onClick={() => go('love-life', 'love')} />
        </PageGroup>
        {datingDialog}
      </>;
    }
    case 'dating-profile':
      return <DatingProfileForm life={life} />;
    case 'threesome':
      return <GroupEncounter life={life} />;
    case 'mind-body':
      return <PageGroup title="Wellbeing Activities">{mindAndBodyActivities(life).map(activityRow)}</PageGroup>;
    case 'doctor':
      return <DoctorsPage life={life} />;
    case 'accessories':
      return <AccessoriesPage life={life} />;
    case 'adoption':
      return <AdoptionPage life={life} />;
    case 'plastic-surgery':
      return <SurgeryPage life={life} />;
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
    case 'world': {
      const overview = worldOverview(life);
      return <>
        <PageGroup title="Veyra"><Rows items={overview.countryRows} /></PageGroup>
        <PageGroup title="Reports">
          {worldReports.map((item) => <MenuRow key={item.id} icon={item.icon} title={item.label} onClick={() => go(`world-${item.id}`)} />)}
        </PageGroup>
        <PageGroup title="Economic Indicators"><Rows items={overview.economyRows} /></PageGroup>
        <PageGroup title="Public Services"><Rows items={overview.communityRows} /></PageGroup>
      </>;
    }
    case 'world-cities':
      return <PageGroup title="Veyra">{compareCities(life).map((item) => <MenuRow key={item.id} icon="location" title={item.city}
        detail={item.detail} onClick={() => go('world-city', item.id)} />)}</PageGroup>;
    case 'world-city': {
      const city = cityFromSlug(detail);
      return city ? <WorldCity key={city} life={life} city={city} /> : <p className="play-empty">This city is unavailable.</p>;
    }
    case 'world-industries':
      return industryReport(life).map(({ industry, rows }) => <PageGroup key={industry} title={industry}><Rows items={rows} /></PageGroup>);
    case 'world-news': {
      const articles = currentNews(life);
      return <>
        <p className="play-empty">Fictional news from your Veyra simulation.</p>
        {([['This Year', true], ['Earlier Headlines', false]] as const).map(([label, current]) => {
          const items = articles.filter(({ year }) => (year === life.year) === current);
          return items.length || current ? <PageGroup key={label} title={label}>
            {items.length ? items.map((article) => <article key={article.key} className="world-article">
              <h3>{article.title}</h3><small>{article.area} · {article.year}{article.active && article.year !== life.year ? ' · Ongoing' : ''}</small>
              <p>{article.story}</p>
            </article>) : <p className="play-empty">No major developments this year.</p>}
          </PageGroup> : null;
        })}
      </>;
    }
    case 'world-history': {
      const history = worldHistory(life);
      return <>
        <PageGroup title="Consumer prices">
          <figure className="world-chart">
            <div className="world-chart-bars" role="img" aria-label={`Price index from ${history.chart[0]!.value} to ${history.chart.at(-1)!.value}`}>
              {history.chart.map(({ year, value, height }) => <span key={year} title={`${year} · ${value}`} style={{ height: `${height}%` }} />)}
            </div>
            <figcaption>{history.chart[0]!.year}–{history.chart.at(-1)!.year} · {history.chart[0]!.value} → {history.chart.at(-1)!.value}</figcaption>
          </figure>
        </PageGroup>
        <PageGroup title="Annual Records"><Rows items={history.rows} /></PageGroup>
      </>;
    }
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
      const assets = finalAssetRows(life);
      const milestones = familyMilestoneRows(life);
      const skills = finalSkillRows(life);
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
        <PageGroup title="Final Estate"><Rows items={estateRows(life)} /></PageGroup>
        {!!assets.length && <PageGroup title="Assets Owned"><Rows items={assets} /></PageGroup>}
        {employment.length > 0 && <PageGroup title="Career"><Rows items={employment} /></PageGroup>}
        {!!milestones.length && <PageGroup title="Family Milestones"><Rows items={milestones} /></PageGroup>}
        {!!skills.length && <PageGroup title="Skill Achievements"><Rows items={skills} /></PageGroup>}
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
