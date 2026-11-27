import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { contactBondRows, contactInteractions, contactProfileRows, contactRole } from '../../src/contactView';
import { genderLabels } from '../../src/data/veyra';
import { educationStatus } from '../../src/engine/academics';
import { findContact } from '../../src/engine/school';
import { profileHealthRows } from '../../src/healthView';
import { useGame } from '../../src/stores/game';
import { space } from '../../src/theme/tokens';

export default function Person() {
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [profileId, setProfileId] = useState<string | null>(null);
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
      <DataRow label="Birth city" value={character.city} />
      <DataRow label="Education" value={educationStatus(life)} />
      {profileHealthRows(life).map((row) => <DataRow key={row.label} {...row} />)}
    </Section>
  </Page>;
  const person = findContact(life, id);
  return (
    <Page inGame>
      <Heading title={person ? contactRole(person) : 'Character'}
        back={() => source && router.canGoBack() ? router.back() : router.dismissTo('/game/relationships')} />
      {person ? <>
        <ActionButton icon="person" label={person.name} onPress={() => setProfileId(person.id)}
          leading={<Portrait appearance={person.appearance} age={person.age} />}
          detail={`${person.alive ? `Age ${person.age}` : 'Deceased'} · Affection ${person.bond.affection}%`} />
        <Section title="Interactions">
          {contactInteractions(life, person).map((item) => (
            <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
              disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />
          ))}
        </Section>
        <DetailModal title="Character Profile" open={profileId === person.id} onDismiss={() => setProfileId(null)}>
          <View style={styles.identity}>
            <Portrait appearance={person.appearance} age={person.age} size={52} label={`Portrait of ${person.name}`} />
            <View style={styles.name}><Text style={shared.strong}>{person.name}</Text><Text style={shared.small}>{contactRole(person)}</Text></View>
          </View>
          {contactProfileRows(life, person).map((row) => <DataRow key={row.label} {...row} />)}
          <Section title="Your bond">{contactBondRows(person).map((row) => <DetailMeter key={row.label} {...row} />)}</Section>
        </DetailModal>
      </> : <Text style={shared.body}>This person couldn’t be found.</Text>}
    </Page>
  );
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  name: { flex: 1 },
});
