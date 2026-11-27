import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Heading, Page, Section, shared } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';
import { colors, radius, space } from '../../src/theme/tokens';

export default function FamilyTree() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  return (
    <Page inGame>
      <Heading title="Family Tree" back={() => router.dismissTo('/game/relationships')} />
      <Section title="Parents">
        <View style={styles.parents}>
          {life.family.map((person) => (
            <ActionButton key={person.id} icon="person" label={person.name} style={styles.node}
              onPress={() => router.push({ pathname: '/game/person', params: { id: person.id } })} />
          ))}
        </View>
        <View style={styles.connector} />
        <View style={styles.child}>
          <Text style={shared.strong}>{life.character.firstName} {life.character.lastName}</Text>
          <Text style={shared.small}>Born {life.character.birthYear}</Text>
        </View>
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  parents: { flexDirection: 'row', gap: space.sm },
  node: { flex: 1 },
  connector: { alignSelf: 'center', height: 22, width: 1, backgroundColor: colors.blueRule },
  child: { alignItems: 'center', gap: space.xs, padding: space.md, backgroundColor: colors.softBlue, borderRadius: radius.md },
});
