import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { programById } from '../../src/data/academics';
import {
  academicActivities, academicControl, academicRecordGroups, availableProgramGroups, educationOverview, educationTab,
  enrollmentControls, enrollmentRows, gradeLabel, institutionCard, programControls, programRows,
} from '../../src/educationView';
import type { EducationControl } from '../../src/educationView';
import { currentClass } from '../../src/engine/school';
import { workAge } from '../../src/engine/career';
import { money } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';

function open(screen: string, program?: string) {
  router.push({ pathname: '/game/education', params: { screen, ...(program ? { program } : {}) } });
}

function Controls({ items }: { items: EducationControl[] }) {
  const { busy, dispatch } = useGame();
  return items.map((item) => <Section key={item.label}>
    <ActionButton icon={item.icon} label={item.label} disabled={busy || !!item.issue} onPress={() => {
      void dispatch(item.action).then((success) => {
        if (success && (item.action.type === 'enroll-program' || item.action.type === 'drop-out')) {
          router.dismissTo('/game/education');
        }
      });
    }} />
    {(item.issue || item.detail) && <Text style={shared.small}>{item.issue ?? item.detail}</Text>}
  </Section>);
}

export default function Education() {
  const { screen, program: programId } = useLocalSearchParams<{ screen?: string; program?: string }>();
  const life = useGame((state) => state.slot?.life);
  const [institutionOpen, setInstitutionOpen] = useState(false);
  if (!life) return null;
  const enrollment = life.academic.enrollment;
  const institution = enrollment && institutionCard(life, enrollment);
  const back = () => {
    if (screen && router.canGoBack()) router.back();
    else router.dismissTo(enrollment ? '/game' : '/game/career');
  };
  if (screen === 'records') return <Page inGame>
    <Heading title="Academic Records" back={back} />
    {academicRecordGroups(life).map(({ title, rows }) => <Section key={title} title={title}>
      {rows.length ? rows.map((row, index) => <DataRow key={index} label={row.label} value={row.value} />) :
        <Text style={shared.small}>No records yet.</Text>}
    </Section>)}
  </Page>;
  if (screen === 'class') return <Page inGame>
    <Heading title="Class" back={back} />
    {currentClass(life).map((person) => <Section key={person.id}>
      <ActionButton icon="person" label={person.name} leading={<Portrait appearance={person.appearance} age={person.age} size={36} />} onPress={() => router.push({
        pathname: '/game/person', params: { id: person.id, source: 'class' },
      })} />
      <Text style={shared.small}>{person.role} · Affection {person.bond.affection}%</Text>
    </Section>)}
  </Page>;
  if (screen === 'programs') return <Page inGame>
    <Heading title="Programs" back={back} />
    {availableProgramGroups(life).map(({ level, title, programs }) => <Section key={level} title={title}>
      {programs.map((item) => <Section key={item.id}>
        <ActionButton icon={level === 'vocational' ? 'vocational' : 'university'} label={item.title} onPress={() => open('program', item.id)} />
        <Text style={shared.small}>{item.duration} yr · {money(item.tuition)}/year</Text>
      </Section>)}
    </Section>)}
  </Page>;
  if (screen === 'program') {
    const program = programById.get(programId ?? '');
    return <Page inGame>
      <Heading title={program?.title ?? 'Program unavailable'} back={back} />
      {program && <>
        <Section title="Program details">{programRows(life, program).map((row) => <DataRow key={row.label} {...row} />)}</Section>
        <Controls items={programControls(life, program)} />
      </>}
    </Page>;
  }
  if (screen === 'withdraw') return <Page inGame>
    <Heading title="Leave Education" back={back} />
    <Text style={shared.body}>Leaving ends this enrollment. Tuition already paid stays in your transaction history.</Text>
    <Controls items={[academicControl(life, { type: 'drop-out' }, 'Confirm Dropout', 'decline')]} />
  </Page>;
  return <Page inGame>
    <Heading title={enrollment ? educationTab(life) : 'Education'} back={back} />
    {enrollment && institution ? <>
      <Section title="Enrollment">
        <ActionButton icon={institution.icon} label={institution.name}
          detail={[institution.detail, `Grades · ${gradeLabel(enrollment)}`].filter(Boolean).join(' · ')} onPress={() => setInstitutionOpen(true)} />
      </Section>
      <DetailModal title="Institution Details" open={institutionOpen} onDismiss={() => setInstitutionOpen(false)}>
        <Text style={shared.strong}>{institution.name}</Text>
        {institution.detail && <Text style={shared.small}>{institution.detail}</Text>}
        <DataRow label="Grades" value={gradeLabel(enrollment)} />
        {enrollmentRows(life).slice(1).map((row) => <DataRow key={row.label} {...row} />)}
      </DetailModal>
      <ActionButton icon="classroom" label="Class" onPress={() => open('class')} />
      <Controls items={academicActivities(life)} />
      <Controls items={enrollmentControls(life)} />
    </> : <Section title="Education status">
      {educationOverview(life).map((row) => <DataRow key={row.label} {...row} />)}
    </Section>}
    {!enrollment && life.character.age >= 18 && <ActionButton icon="university" label="Browse Programs" onPress={() => open('programs')} />}
    {enrollment && life.character.age >= workAge && <ActionButton icon="career" label="View Career" onPress={() => router.push('/game/career')} />}
    <ActionButton icon="history" label="Academic Records" onPress={() => open('records')} />
    {enrollment && <ActionButton icon="decline" label="Drop Out" onPress={() => open('withdraw')} />}
  </Page>;
}
