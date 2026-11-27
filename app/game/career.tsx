import { router } from 'expo-router';
import { ActionButton, DataRow, Heading, Page, Section } from '../../src/components/ui';
import { educationLabels } from '../../src/data/veyra';
import { useGame } from '../../src/stores/game';

export default function Career() {
  const character = useGame((state) => state.slot?.life.character);
  if (!character) return null;
  return (
    <Page inGame>
      <Heading title="Career" back={() => router.dismissTo('/game')} />
      <Section title="Education">
        <DataRow label="Current stage" value={educationLabels[character.education]} />
        <ActionButton icon="school" label="View Education" onPress={() => router.push('/game/education')} />
      </Section>
    </Page>
  );
}
