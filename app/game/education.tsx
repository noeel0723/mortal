import { router } from 'expo-router';
import { Text } from 'react-native';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { educationLabels } from '../../src/data/veyra';
import { activityIssue } from '../../src/engine/simulation';
import { useGame } from '../../src/stores/game';

export default function Education() {
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;
  const issue = activityIssue(life, 'study');
  const age = life.character.age;
  const next = age < 6 ? 6 : age < 12 ? 12 : age < 15 ? 15 : age < 18 ? 18 : null;
  return (
    <Page inGame>
      <Heading title="Education" back={() => router.dismissTo('/game/career')} />
      <Section title={educationLabels[life.character.education]}>
        {next !== null && <DataRow label="Next milestone" value={`Age ${next}`} />}
        <DataRow label="Energy" value={`${life.character.attributes.energy}%`} />
        <ActionButton icon="study" label="Study Harder" disabled={!!issue || !!life.pending || busy || !!life.character.causeOfDeath} onPress={() => void dispatch({ type: 'activity', activity: 'study' })} />
        <Text style={shared.small}>{issue ?? 'Uses 16 energy. Improves smarts and discipline.'}</Text>
      </Section>
    </Page>
  );
}
