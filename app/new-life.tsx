import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { ActionButton, Feedback, Heading, Page, shared } from '../src/components/ui';
import { useGame } from '../src/stores/game';
import { colors, radius, space } from '../src/theme/tokens';

export default function NewLife() {
  const { start, busy, ready, problem, clearMessage } = useGame();
  async function random() {
    if (await start()) router.replace('/game');
  }
  return (
    <Page>
      <Heading title="New Life" subtitle="Start at the beginning." back={() => router.dismissTo('/')} />
      <View style={styles.panel}>
        <Text style={shared.strong}>A life chosen for you</Text>
        <Text style={shared.body}>Discover your name, family, and hometown when you’re born.</Text>
        <ActionButton icon="random" label="Random Life" variant="primary" disabled={!ready || busy} onPress={() => void random()} testID="random-life" />
      </View>
      <View style={[styles.panel, styles.plain]}>
        <Text style={shared.strong}>Choose your beginnings</Text>
        <Text style={shared.body}>Set your character’s name, birthplace, family background, and natural talent.</Text>
        <ActionButton icon="custom" label="Custom Life" disabled={!ready || busy} onPress={() => { clearMessage(); router.push('/character-creation'); }} />
      </View>
      <Feedback error={problem} />
    </Page>
  );
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.paper, padding: space.lg, gap: space.md, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line },
  plain: { backgroundColor: colors.white },
});
