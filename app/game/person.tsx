import { router, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { genderLabels } from '../../src/data/veyra';
import { educationStatus } from '../../src/engine/academics';
import { findContact, isPeer } from '../../src/engine/school';
import { befriendIssue, friendshipEnergyCost, talkIssue } from '../../src/engine/simulation';
import { useGame } from '../../src/stores/game';

export default function Person() {
  const { id, source } = useLocalSearchParams<{ id?: string; source?: string }>();
  const { slot, busy, dispatch } = useGame();
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
    </Section>
  </Page>;
  const person = findContact(life, id);
  const issue = person ? talkIssue(life, person.id) : null;
  const canBefriend = !!person && 'stage' in person && isPeer(person) && !person.friend;
  const friendshipIssue = canBefriend ? befriendIssue(life, person.id) : null;
  const blocked = !!life.pending || busy || !!life.character.causeOfDeath;
  return (
    <Page inGame>
      <Heading title={person?.name ?? 'Character'} subtitle={person && 'stage' in person && person.friend ? 'Friend' : person?.role}
        back={() => source && router.canGoBack() ? router.back() : router.dismissTo('/game/relationships')} />
      {person ? <>
        <View style={{ alignItems: 'center' }}>
          <Portrait appearance={person.appearance} age={person.age} size={144} label={`Portrait of ${person.name}`} />
        </View>
        <Section title="About">
          <DataRow label={person.alive ? 'Age' : 'Age at death'} value={person.age} />
          <DataRow label="Gender identity" value={genderLabels[person.gender]} />
          <DataRow label="City" value={person.city} />
          <DataRow label="Occupation" value={person.occupation} />
          <DataRow label="Health" value={`${person.health}%`} />
        </Section>
        <Section title="Your bond">
          {Object.entries(person.bond).map(([label, value]) => (
            <DataRow key={label} label={label[0]?.toUpperCase() + label.slice(1)} value={`${value}%`} />
          ))}
        </Section>
        <ActionButton icon="talk" label="Have a Conversation" disabled={!!issue || blocked}
          onPress={() => void dispatch({ type: 'talk', person: person.id })} />
        <Text style={shared.small}>{issue ?? 'Uses 8 energy. Strengthens affection and trust.'}</Text>
        {canBefriend && <>
          <ActionButton icon="relationships" label="Become Friends" disabled={blocked || !!friendshipIssue}
            onPress={() => void dispatch({ type: 'befriend', person: person.id })} />
          <Text style={shared.small}>{friendshipIssue ?? `Uses ${friendshipEnergyCost} energy.`}</Text>
        </>}
      </> : <Text style={shared.body}>This person couldn’t be found.</Text>}
    </Page>
  );
}
