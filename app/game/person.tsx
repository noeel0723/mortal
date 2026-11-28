import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { contactBondRows, contactHistory, contactInteractions, contactProfileRows, contactRole } from '../../src/contactView';
import { genderLabels } from '../../src/data/veyra';
import { educationStatus } from '../../src/engine/academics';
import { findContact } from '../../src/engine/school';
import { profileHealthRows } from '../../src/healthView';
import { relationshipCareControls, relationshipControls, relationshipDialog, relationshipOverview } from '../../src/socialView';
import type { RelationshipDialogKind } from '../../src/socialView';
import { useGame } from '../../src/stores/game';
import { space } from '../../src/theme/tokens';

export default function Person() {
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [profileId, setProfileId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ person: string; kind: RelationshipDialogKind }>();
  if (!slot) return null;
  const life = slot.life;
  const { character } = life;
  if (id === 'self') return <Page inGame>
    <Heading title="My Profile" subtitle={`${character.firstName} ${character.lastName}`}
      back={() => router.canGoBack() ? router.back() : router.dismissTo('/game')} />
    <View style={{ alignItems: 'center' }}>
      <Portrait appearance={character.appearance} age={character.age} size={144} label="Your portrait" />
    </View>
    <Section title="About">
      <DataRow label={character.causeOfDeath ? 'Age at death' : 'Age'} value={character.age} />
      <DataRow label="Gender identity" value={genderLabels[character.gender]} />
      <DataRow label="Birth city" value={character.birthCity} />
      <DataRow label="Current city" value={character.city} />
      <DataRow label="Year" value={life.year} />
      <DataRow label="Education" value={educationStatus(life)} />
      {profileHealthRows(life).map((row) => <DataRow key={row.label} {...row} />)}
    </Section>
    <ActionButton icon="tree" label="Family Tree" onPress={() => router.push('/game/family-tree')} />
    <ActionButton icon="world" label="World" detail="News, cities, and relocation" onPress={() => router.push('/game/world')} />
  </Page>;
  const person = findContact(life, id);
  const controls = person ? relationshipControls(life, person) : [];
  const care = person ? relationshipCareControls(life, person) : [];
  const overview = person ? relationshipOverview(life, person) : null;
  const memories = person ? contactHistory(life, person) : [];
  const interactions = person ? contactInteractions(life, person) : [];
  const dialog = person && selection?.person === person.id ? relationshipDialog(life, person, selection.kind) : undefined;
  const actionRow = (item: (typeof controls)[number]) => <ActionButton key={item.label} icon={item.icon} label={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => {
      if (item.dialog && person) setSelection({ person: person.id, kind: item.dialog });
      else void dispatch(item.action);
    }} />;
  return (
    <Page inGame>
      <Heading title={person ? contactRole(person, life) : 'Character'}
        back={() => source && router.canGoBack() ? router.back() : router.dismissTo('/game/relationships')} />
      {person ? <>
        <ActionButton icon="person" label={person.name} onPress={() => setProfileId(person.id)}
          leading={<Portrait appearance={person.appearance} age={person.age} />}
          detail={overview?.summary ?? `${person.alive ? `Age ${person.age}` : 'Deceased'} · Affection ${person.bond.affection}%`} />
        {interactions.length > 0 && <Section title="Interactions">
          {interactions.map((item) => (
            <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
              disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />
          ))}
        </Section>}
        {controls.length > 0 && <Section title={person.role === 'Child' ? 'Parenting' : 'Love Life'}>
          {controls.map(actionRow)}
        </Section>}
        {care.length > 0 && <Section title="Relationship & Communication">
          {overview?.agreement && <DataRow label="Agreement" value={overview.agreement} />}
          {overview?.goal && <DataRow label="Relationship Goal" value={overview.goal} />}
          {overview?.concerns.map((row) => <DataRow key={row.label} {...row} />)}
          {care.map(actionRow)}
        </Section>}
        {dialog && <DetailModal title={dialog.title} open onDismiss={() => setSelection(undefined)}>
          {dialog.options.map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label}
            detail={[item.detail, item.issue].filter(Boolean).join(' · ')} disabled={busy || !!item.issue}
            onPress={() => { setSelection(undefined); void dispatch(item.action); }} />)}
        </DetailModal>}
        <DetailModal title="Character Profile" open={profileId === person.id} onDismiss={() => setProfileId(null)}>
          <View style={styles.identity}>
            <Portrait appearance={person.appearance} age={person.age} size={52} label={`Portrait of ${person.name}`} />
            <View style={styles.name}><Text style={shared.strong}>{person.name}</Text><Text style={shared.small}>{contactRole(person, life)}</Text></View>
          </View>
          {contactProfileRows(life, person).map((row) => <DataRow key={row.label} {...row} />)}
          <Section title="Your bond">{contactBondRows(person).map((row) => <DetailMeter key={row.label} {...row} />)}</Section>
          {!!overview?.concerns.length && <Section title="Relationship Concerns">
            {overview.concerns.map((row) => <DataRow key={row.label} {...row} />)}
          </Section>}
          {!!overview?.milestones.length && <Section title="Relationship Milestones">
            {overview.milestones.map((row) => <DataRow key={row.label} {...row} />)}
          </Section>}
          {memories.length > 0 && <Section title="Shared history">
            {memories.map(({ year, text }, index) => <DataRow key={index} label={String(year)} value={text} />)}
          </Section>}
        </DetailModal>
      </> : <Text style={shared.body}>This person couldn’t be found.</Text>}
    </Page>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  name: { flex: 1 },
});
