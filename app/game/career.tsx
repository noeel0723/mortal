import { router } from 'expo-router';
import { ActionButton, DataRow, Heading, Page, Section } from '../../src/components/ui';
import { educationOverview } from '../../src/educationView';
import { useGame } from '../../src/stores/game';

export default function Career() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  return (
    <Page inGame>
      <Heading title="Career" back={() => router.dismissTo('/game')} />
      <Section title="Education">
        {educationOverview(life).map((row) => <DataRow key={row.label} {...row} />)}
        <ActionButton icon="school" label="View Education" onPress={() => router.push('/game/education')} />
      </Section>
    </Page>
  );
}
