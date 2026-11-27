import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { talkIssue } from '../../src/engine/simulation';
import { useGame } from '../../src/stores/game';

export default function Person() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;
  const person = life.family.find((item) => item.id === id);
  const issue = person ? talkIssue(life, person.id) : null;
  return (
    <Page inGame>
      <Heading title={person?.name ?? 'Family member'} subtitle={person?.role} back={() => router.dismissTo('/game/relationships')} />
      {person ? <>
        <Section title="About">
          <DataRow label={person.alive ? 'Age' : 'Age at death'} value={person.age} />
          <DataRow label="City" value={person.city} />
          <DataRow label="Occupation" value={person.occupation} />
        </Section>
        <Section title="Your bond">
          {Object.entries(person.bond).map(([label, value]) => (
            <DataRow key={label} label={label[0]?.toUpperCase() + label.slice(1)} value={`${value}%`} />
          ))}
        </Section>
        <ActionButton icon="talk" label="Have a Conversation" disabled={!!issue || !!life.pending || busy || !!life.character.causeOfDeath}
          onPress={() => void dispatch({ type: 'talk', person: person.id })} />
        <Text style={shared.small}>{issue ?? 'Uses 8 energy. Strengthens affection and trust.'}</Text>
      </> : <Text style={shared.body}>This person couldn’t be found.</Text>}
    </Page>
  );
}
