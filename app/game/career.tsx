import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import {
  canShowRetirement, careerCard, careerControl, careerRows, careerTimeline, defaultJobFilters, employmentLabels,
  hiringOverview, jobIcon, jobListings, jobRatings, lifetimeEarnings, vacancyActions, vacancyRows,
} from '../../src/careerView';
import type { CareerControl } from '../../src/careerView';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { jobById } from '../../src/data/jobs';
import { educationOverview } from '../../src/educationView';
import { workAge, workHours } from '../../src/engine/career';
import { industries } from '../../src/engine/careerTypes';
import type { Life } from '../../src/engine/types';
import { activeCoworkers } from '../../src/engine/workplace';
import { money } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';
import { colors, radius, space } from '../../src/theme/tokens';

function open(screen: string, detail?: string) {
  router.push({ pathname: '/game/career', params: { screen, ...(detail ? { detail } : {}) } });
}

function Controls({ items }: { items: CareerControl[] }) {
  const { dispatch, busy } = useGame();
  return items.map((item) => <ActionButton key={item.label} label={item.label} icon={item.icon} detail={item.issue ?? item.detail}
    disabled={busy || !!item.issue} onPress={() => void dispatch(item.action).then((success) => {
      if (success && (item.action.type === 'accept-job' || item.action.type === 'resign' || item.action.type === 'retire')) {
        router.dismissTo('/game/career');
      }
    })} />);
}

function JobListings({ life }: { life: Life }) {
  const [filters, setFilters] = useState(defaultJobFilters);
  const listings = jobListings(life, filters);
  return <>
    <Section title={`Open positions · ${life.year}`}>
      {hiringOverview(life).map((row) => <DataRow key={row.label} {...row} />)}
      <TextInput style={styles.search} placeholder="Search by title" placeholderTextColor={colors.muted}
        accessibilityLabel="Search by title" value={filters.query} onChangeText={(query) => setFilters({ ...filters, query })} />
      <Text style={shared.small}>Industry</Text>
      <ScrollView horizontal contentContainerStyle={styles.options}>
        <ActionButton icon="options" label="All industries" selected={!filters.industry} onPress={() => setFilters({ ...filters, industry: '' })} />
        {industries.map((industry) => <ActionButton key={industry} icon="options" label={industry} selected={filters.industry === industry}
          onPress={() => setFilters({ ...filters, industry })} />)}
      </ScrollView>
      <Text style={shared.small}>Employment type</Text>
      <ScrollView horizontal contentContainerStyle={styles.options}>
        {(['', 'full-time', 'part-time'] as const).map((type) => <ActionButton key={type} icon="hours" label={type ? employmentLabels[type] : 'All schedules'}
          selected={filters.type === type} onPress={() => setFilters({ ...filters, type })} />)}
      </ScrollView>
    </Section>
    <Section title={`${listings.length} vacancies`}>
      {listings.length ? listings.map((listing) => <ActionButton key={listing.id} icon={jobIcon(listing.job)} label={listing.job.title}
        detail={`${listing.employer.name} · ${employmentLabels[listing.job.type]} · ${money(listing.salary)} · ${listing.status}`}
        onPress={() => open('job', listing.id)} />) : <Text style={shared.body}>No jobs match these filters.</Text>}
    </Section>
  </>;
}

export default function Career() {
  const { screen, detail } = useLocalSearchParams<{ screen?: string; detail?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [detailsOpen, setDetailsOpen] = useState(false);
  if (!slot) return null;
  const life = slot.life;
  const job = life.career.current;
  const canFindJob = life.character.age >= workAge && !life.character.causeOfDeath && life.career.retiredYear === null;
  const back = () => screen && router.canGoBack() ? router.back() : router.dismissTo('/game');

  if (screen === 'jobs') return <Page inGame><Heading title="Job Listings" back={back} />
    {canFindJob ? <JobListings life={life} /> : <Text style={shared.body}>Job listings are unavailable.</Text>}
  </Page>;
  if (screen === 'job') {
    const listing = canFindJob && jobListings(life).find(({ id }) => id === detail);
    return <Page inGame><Heading title={listing ? listing.job.title : 'Job Details'} back={back} />
      {listing ? <>
        <Section title="Vacancy">{vacancyRows(listing, life).map((row) => <DataRow key={row.label} {...row} />)}</Section>
        <Controls items={vacancyActions(life, listing)} />
      </> : <Text style={shared.body}>This vacancy is no longer available.</Text>}
    </Page>;
  }
  if (screen === 'hours') return <Page inGame><Heading title="Working Hours" back={back} />
    {job ? <Controls items={workHours(jobById.get(job.jobId)!).map((hours) =>
      careerControl(life, { type: 'work-hours', hours }, `${hours} Hours`, 'hours', 'Workload affects performance, stress, and energy.'))} /> :
      <Text style={shared.body}>You are not currently employed.</Text>}
  </Page>;
  if (screen === 'coworkers') return <Page inGame><Heading title="Co-workers" back={back} />
    {job ? activeCoworkers(life).map((person) => <ActionButton key={person.id} icon="person" label={person.name}
      leading={<Portrait appearance={person.appearance} age={person.age} size={36} />} detail={person.role}
      onPress={() => router.push({ pathname: '/game/person', params: { id: person.id, source: 'work' } })} />) :
      <Text style={shared.body}>You are not currently employed.</Text>}
  </Page>;
  if (screen === 'history') {
    const timeline = careerTimeline(life);
    return <Page inGame><Heading title="Career History" back={back} />
      <Section title="Career totals"><DataRow label="Lifetime gross earnings" value={money(lifetimeEarnings(life))} />
        <DataRow label="Professional experience" value={`${life.career.experience} years`} /></Section>
      {timeline.length ? timeline.map((entry, index) => <Section title={entry.title} key={index}>
        {entry.rows.map((row, index) => <DataRow key={index} {...row} />)}
      </Section>) : <Text style={shared.body}>No employment records yet.</Text>}
    </Page>;
  }
  if (screen === 'exit') {
    const retiring = detail === 'retire';
    const available = retiring ? canShowRetirement(life) : !!job;
    return <Page inGame><Heading title={retiring ? 'Retire' : 'Resign'} back={back} />
      {available ? <>
        <Text style={shared.body}>{retiring ? 'Retirement ends your current job and closes access to job listings.' :
          'Resigning ends your current contract before the next Age Up.'}</Text>
        <Controls items={[careerControl(life, { type: retiring ? 'retire' : 'resign' }, retiring ? 'Confirm Retirement' : 'Confirm Resignation', retiring ? 'retire' : 'exit')]} />
      </> : <Text style={shared.body}>This action is unavailable.</Text>}
    </Page>;
  }
  const career = careerCard(life);
  const canRetire = canShowRetirement(life);
  return <Page inGame>
    <Heading title="Career" back={back} />
    <Section title={job ? 'Current job' : 'Employment'}>
      <ActionButton icon={career.icon} label={career.title}
        detail={job ? `${career.detail} · Performance ${job.performance}%` : 'View career details'}
        onPress={() => setDetailsOpen(true)} />
    </Section>
    <DetailModal title="Career Details" open={detailsOpen} onDismiss={() => setDetailsOpen(false)}>
      <Text style={shared.strong}>{career.title}</Text>
      {career.detail && <Text style={shared.small}>{career.detail}</Text>}
      {careerRows(life).map((row) => <DataRow key={row.label} {...row} />)}
      {job && <Section title="Work performance">{jobRatings(life).map((row) => <DetailMeter key={row.label} {...row} />)}</Section>}
      <Section title="Education">{educationOverview(life).map((row) => <DataRow key={row.label} {...row} />)}</Section>
    </DetailModal>
    {((canFindJob && !!job) || canRetire) && <Section title="Career Actions">
      {canFindJob && job && <>
        <Controls items={[
          careerControl(life, { type: 'work-harder' }, 'Work Harder', 'harder', 'Uses 16 energy. Improves performance and increases stress.'),
          careerControl(life, { type: 'request-raise' }, 'Request a Raise', 'bank'),
        ]} />
        <ActionButton icon="hours" label="Working Hours" detail={`${job.hours} hours per week`} onPress={() => open('hours')} />
        <ActionButton icon="relationships" label="Co-workers" onPress={() => open('coworkers')} />
        <ActionButton icon="exit" label="Resign" onPress={() => open('exit', 'resign')} />
      </>}
      {canRetire && <ActionButton icon="retire" label="Retire" onPress={() => open('exit', 'retire')} />}
    </Section>}
    <Section title="Career Navigation">
      {canFindJob && <ActionButton icon="search" label="Find a Job" disabled={busy} onPress={() => {
        if (!job && !life.career.seeking && !life.pending) void dispatch({ type: 'seek-work' }).then((success) => { if (success) open('jobs'); });
        else open('jobs');
      }} />}
      <ActionButton icon="history" label="Career History" onPress={() => open('history')} />
      <ActionButton icon="school" label="View Education" onPress={() => router.push('/game/education')} />
    </Section>
  </Page>;
}

const styles = StyleSheet.create({
  options: { gap: space.sm },
  search: { minHeight: 46, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, padding: space.md, color: colors.ink },
});
