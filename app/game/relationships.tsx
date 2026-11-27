import { router } from 'expo-router';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';

export default function Relationships() {
  const family = useGame((state) => state.slot?.life.family);
  if (!family) return null;
  return (
    <Page inGame>
      <Heading title="Relationships" back={() => router.dismissTo('/game')} />
      <Section title="Family">
        {family.map((person) => (
          <ActionButton key={person.id} icon="person" label={`${person.name} · ${person.role}`}
            onPress={() => router.push({ pathname: '/game/person', params: { id: person.id } })} />
        ))}
      </Section>
      <ActionButton icon="tree" label="Family Tree" onPress={() => router.push('/game/family-tree')} />
    </Page>
  );
}
