import { Redirect, router } from 'expo-router';
import { Text } from 'react-native';
import { careerSummary } from '../../src/careerView';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { educationStatus } from '../../src/engine/academics';
import { money } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';
import { familyTreeGroups, socialRole } from '../../src/socialView';

export default function Summary() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  const { character } = life;
  if (!character.causeOfDeath) return <Redirect href="/game" />;
  const turningPoints = life.journal.filter((entry) => entry.category === 'decision' || entry.category === 'school').slice(-4);
  const employment = careerSummary(life);
  return (
    <Page inGame>
      <Heading title="Life Summary" subtitle={`${character.firstName} ${character.lastName} · ${character.birthYear}–${life.year}`} />
      <Section title="A life in Veyra">
        <DataRow label="Age at death" value={character.age} />
        <DataRow label="Cause of death" value={character.causeOfDeath} />
        <DataRow label="Education" value={educationStatus(life)} />
        <DataRow label="Final bank balance" value={money(character.bank)} />
      </Section>
      <Section title="Family">
        {familyTreeGroups(life).flatMap(({ people }) => people).map((person) =>
          <DataRow key={person.id} label={socialRole(life, person)} value={person.name} />)}
      </Section>
      {employment.length > 0 && <Section title="Career">{employment.map((row) => <DataRow key={row.label} {...row} />)}</Section>}
      {turningPoints.length > 0 && <Section title="Turning points">
        {turningPoints.map((event, index) => (
          <Text key={index} style={shared.body}>Age {event.age} · {event.text}</Text>
        ))}
      </Section>}
      <ActionButton icon="life" label="Review Life Story" onPress={() => router.navigate('/game')} />
      <ActionButton icon="new" label="Start a New Life" onPress={() => router.dismissTo('/new-life')} />
      <ActionButton icon="home" label="Return to Main Menu" onPress={() => router.dismissTo('/')} />
    </Page>
  );
}
