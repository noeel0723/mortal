import { router } from 'expo-router';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';

export default function Relationships() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  const friends = life.schoolContacts.filter((person) => person.friend);
  return (
    <Page inGame>
      <Heading title="Relationships" back={() => router.dismissTo('/game')} />
      <Section title="Family">
        {life.family.map((person) => (
          <ActionButton key={person.id} icon="person" label={`${person.name} · ${person.role}`} leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
            onPress={() => router.push({ pathname: '/game/person', params: { id: person.id } })} />
        ))}
      </Section>
      {friends.length > 0 && <Section title="Friends">
        {friends.map((person) => <ActionButton key={person.id} icon="person" label={person.name} leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
          onPress={() => router.push({ pathname: '/game/person', params: { id: person.id } })} />)}
      </Section>}
      <ActionButton icon="tree" label="Family Tree" onPress={() => router.push('/game/family-tree')} />
    </Page>
  );
}
