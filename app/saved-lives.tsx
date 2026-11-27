import { router } from 'expo-router';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { ActionButton, Feedback, Heading, Page, Section, shared } from '../src/components/ui';
import type { SaveSummary } from '../src/database/repository';
import { useGame } from '../src/stores/game';
import { colors, emoji, space } from '../src/theme/tokens';

export default function SavedLives() {
  const { saves, ready, busy, problem, notice, open, remove } = useGame();
  async function load(item: SaveSummary) {
    if (await open(item.id)) router.replace(item.completed ? '/game/summary' : '/game');
  }
  function confirm(item: SaveSummary) {
    Alert.alert('Delete saved life?', `Permanently delete ${item.name}’s life from this device?`, [
      { text: `${emoji.decline} Cancel`, style: 'cancel' },
      { text: `${emoji.delete} Delete`, style: 'destructive', onPress: () => void remove(item.id) },
    ]);
  }
  const group = (items: SaveSummary[]) => items.map((item) => (
    <View style={styles.row} key={item.id}>
      <View style={styles.identity}>
        <Text style={shared.strong}>{item.name}</Text>
        <Text style={shared.small}>{item.city} · Age {item.age} · {item.year}</Text>
      </View>
      <ActionButton compact icon={item.completed ? 'history' : 'load'} label={`Open ${item.name}’s life`} disabled={busy} onPress={() => void load(item)} />
      <ActionButton compact icon="delete" label={`Delete ${item.name}’s life`} variant="plain" disabled={busy} onPress={() => confirm(item)} />
    </View>
  ));
  return (
    <Page>
      <Heading title="Saved Lives" subtitle="Stored on this device." back={() => router.dismissTo('/')} />
      <Feedback error={problem} notice={notice} />
      {ready && !saves.length && <Text style={shared.body}>Start a new life and it will appear here.</Text>}
      {saves.some((item) => !item.completed) && <Section title="In progress">{group(saves.filter((item) => !item.completed))}</Section>}
      {saves.some((item) => item.completed) && <Section title="Completed">{group(saves.filter((item) => item.completed))}</Section>}
    </Page>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.xs, borderBottomWidth: 1, borderColor: colors.line, paddingVertical: space.sm },
  identity: { flex: 1, gap: 2 },
});
