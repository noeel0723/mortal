import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, Heading, Page, Section, shared } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';
import { childParents, familyTreeGroups, socialRole } from '../../src/socialView';
import { colors, radius, space } from '../../src/theme/tokens';

export default function FamilyTree() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  return (
    <Page inGame>
      <Heading title="Family Tree" back={() => router.dismissTo('/game/relationships')} />
      <Section title="You">
        <View style={styles.child}>
          <Portrait appearance={life.character.appearance} age={life.character.age} />
          <Text style={shared.strong}>{life.character.firstName} {life.character.lastName}</Text>
          <Text style={shared.small}>Born {life.character.birthYear}</Text>
        </View>
      </Section>
      {familyTreeGroups(life).map(({ label, people }) => <Section key={label} title={label}>
        {people.map((person) => <ActionButton key={person.id} icon="person" label={person.name}
          detail={childParents(life, person) ?? socialRole(life, person)}
          leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
          onPress={() => router.push({ pathname: '/game/person', params: { id: person.id, source: 'tree' } })} />)}
      </Section>)}
    </Page>
  );
}

const styles = StyleSheet.create({
  child: { alignItems: 'center', gap: space.xs, padding: space.md, backgroundColor: colors.softBlue, borderRadius: radius.md },
});
