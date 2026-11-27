import { router } from 'expo-router';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';
import { relationshipGroups, socialRole } from '../../src/socialView';
import type { Contact } from '../../src/engine/types';

export default function Relationships() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  const groups = relationshipGroups(life);
  const row = (person: Contact) => <ActionButton key={person.id} icon="person" label={person.name} detail={socialRole(life, person)}
    leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
    onPress={() => router.push({ pathname: '/game/person', params: { id: person.id, source: 'relationships' } })} />;
  return (
    <Page inGame>
      <Heading title="Relationships" back={() => router.dismissTo('/game')} />
      <Section title="Family">
        {groups.family.map(row)}
        <ActionButton icon="tree" label="Family Tree" onPress={() => router.push('/game/family-tree')} />
      </Section>
      <Section title="Love Life"><ActionButton icon="rose" label="Open Love Life" detail={groups.partner?.name}
        onPress={() => router.push('/game/love-life')} /></Section>
      {groups.friends.length > 0 && <Section title="Friends">{groups.friends.map(row)}</Section>}
      {groups.acquaintances.length > 0 && <Section title="Acquaintances">{groups.acquaintances.map(row)}</Section>}
      {groups.former.length > 0 && <Section title="Former Relationships">{groups.former.map(row)}</Section>}
    </Page>
  );
}
