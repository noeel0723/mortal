import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { adoptionCandidates, adoptionIssue } from '../../src/engine/adoption';
import { accessoryIssue, accessoryOptions, noAccessories } from '../../src/engine/appearance';
import type { Accessories } from '../../src/engine/appearance';
import { availableProcedures, findProcedure, surgeryIssue } from '../../src/engine/plasticSurgery';
import type { Life } from '../../src/engine/types';
import { en } from '../../src/i18n/en';
import { accessoryFields, adoptionProfile, surgeonRows } from '../../src/personalCareView';
import { useGame } from '../../src/stores/game';
import { space } from '../../src/theme/tokens';

function AccessoriesEditor({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [choices, setChoices] = useState<Accessories>(life.character.appearance.accessories ?? noAccessories);
  const [expanded, setExpanded] = useState<keyof Accessories>();
  const { appearance, age } = life.character;
  return <>
    <View style={styles.preview}>
      <Portrait appearance={{ ...appearance, accessories: choices }} age={age} label="Accessory preview" size={144} />
    </View>
    {accessoryFields.map(({ key, label, icon, remove }) => <Section key={key} title={label}>
      <ActionButton icon={icon} label={label} detail={choices[key] === 'None' ? remove : choices[key]}
        onPress={() => setExpanded(expanded === key ? undefined : key)} />
      {expanded === key && accessoryOptions[key].map((option) =>
        <ActionButton key={option} icon={option === choices[key] ? 'accept' : icon}
          label={option === 'None' ? remove : option} selected={option === choices[key]} onPress={() => {
            setChoices({ ...choices, [key]: option });
            setExpanded(undefined);
          }} />)}
    </Section>)}
    <ActionButton icon="accept" label="Save Accessories" variant="primary" disabled={busy || !!accessoryIssue(life, choices)}
      onPress={() => void dispatch({ type: 'change-accessories', choices })} />
  </>;
}

function AdoptionAgency({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [selected, setSelected] = useState<string>();
  const candidates = adoptionCandidates(life);
  const candidate = candidates.find(({ person }) => person.id === selected);
  const profile = candidate && adoptionProfile(candidate);
  const issue = adoptionIssue(life);
  if (life.social.adoption) return <Section title="Application Under Review">
    <DataRow label="Review year" value={life.social.adoption.due} />
    <Text style={shared.small}>The agency will respond when you age up.</Text>
  </Section>;
  return <>
    <Section title="Children Available">{candidates.map(({ person, behavior }) => <View key={person.id} style={styles.candidate}>
      <ActionButton icon="adoption" label={person.name} detail={en.age(person.age)}
        leading={<Portrait appearance={person.appearance} age={person.age} size={40} />} onPress={() => setSelected(person.id)} />
      <DetailMeter label="Behavior" value={behavior} />
    </View>)}</Section>
    {candidate && profile && <DetailModal title="Adoption Profile" open onDismiss={() => setSelected(undefined)}>
      <View style={styles.identity}>
        <Portrait appearance={candidate.person.appearance} age={candidate.person.age} size={56} label={`Portrait of ${candidate.person.name}`} />
        <Text style={shared.strong}>{candidate.person.name}</Text>
      </View>
      <View>{profile.details.map((row) => <DataRow key={row.label} {...row} />)}</View>
      {profile.meters.map((row) => <DetailMeter key={row.label} {...row} />)}
      {issue && <Text style={shared.small}>{issue}</Text>}
      <ActionButton icon="adoption" label="Submit Application" variant="primary" disabled={busy || !!issue} onPress={() => {
        setSelected(undefined);
        void dispatch({ type: 'adopt-child', person: candidate.person.id });
      }} />
    </DetailModal>}
  </>;
}

function SurgeryClinic({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const [selected, setSelected] = useState<string>();
  const procedure = findProcedure(life, selected);
  const issue = surgeryIssue(life);
  return <>
    <Section title="Cosmetic Procedures">{availableProcedures(life).map((item) =>
      <ActionButton key={item.id} icon={item.icon} label={item.title} compactDetail detail={issue ?? item.detail}
        disabled={busy || !!issue} onPress={() => setSelected(item.id)} />)}</Section>
    {procedure && <DetailModal title={procedure.title} open onDismiss={() => setSelected(undefined)}>
      <Text style={shared.body}>Choose a surgeon. A complication can lower Looks.</Text>
      {surgeonRows(life, procedure).map(({ surgeon, detail, issue: blocked }) =>
        <ActionButton key={surgeon.id} icon="medical" label={surgeon.name} compactDetail
          detail={blocked ? `${detail} · ${blocked}` : detail} disabled={busy || !!blocked} onPress={() => {
            setSelected(undefined);
            void dispatch({ type: 'plastic-surgery', procedure: procedure.id, surgeon: surgeon.id });
          }} />)}
    </DetailModal>}
  </>;
}

export default function PersonalCare() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const { slot } = useGame();
  if (!slot) return null;
  const { life } = slot;
  const title = screen === 'adoption' ? 'Adoption' : screen === 'plastic-surgery' ? 'Plastic Surgery' : 'Accessories';
  return <Page inGame>
    <Heading title={title} back={() => router.canGoBack() ? router.back() : router.replace('/game/activities')} />
    {screen === 'adoption' ? <AdoptionAgency life={life} /> :
      screen === 'plastic-surgery' ? <SurgeryClinic life={life} /> : <AccessoriesEditor life={life} />}
  </Page>;
}

const styles = StyleSheet.create({
  preview: { alignItems: 'center' },
  candidate: { gap: space.xs, marginBottom: space.xs },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md },
});
