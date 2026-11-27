import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark } from '../src/components/brand';
import { ActionButton, Feedback, Loading, Page, shared } from '../src/components/ui';
import { en } from '../src/i18n/en';
import { useGame } from '../src/stores/game';
import { colors, radius, space } from '../src/theme/tokens';

export default function Welcome() {
  const { ready, busy, saves, problem, initialize, open, clearMessage } = useGame();
  const recent = saves[0];
  if (!ready && !problem) return <Loading />;

  async function resume() {
    if (recent && await open(recent.id)) router.push(recent.completed ? '/game/summary' : '/game');
  }
  return (
    <Page>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.orbit} />
        <View pointerEvents="none" style={[styles.orbit, styles.orbitInner]} />
        <View pointerEvents="none" style={styles.orbitDot} />
        <BrandMark large />
        <Text accessibilityRole="header" style={styles.title}>{en.title}</Text>
        <Text style={styles.tagline}>{en.tagline}</Text>
      </View>
      {recent && (
        <View style={styles.saveCard}>
          <View style={styles.saveInfo}>
            <Text style={shared.small}>Most recent life</Text>
            <Text style={shared.strong}>{recent.name}</Text>
          </View>
          <Text style={styles.saveAge}>{en.age(recent.age)} · {recent.year}</Text>
        </View>
      )}
      <View style={shared.group}>
        <ActionButton icon="continue" label={en.continueLife} variant="primary" disabled={!recent || busy} onPress={() => void resume()} testID="continue-life" />
        <ActionButton icon="new" label={en.newLife} disabled={!ready || busy} onPress={() => { clearMessage(); router.push('/new-life'); }} testID="new-life" />
      </View>
      <View style={styles.links}>
        <ActionButton icon="load" label={en.savedLives} variant="plain" onPress={() => { clearMessage(); router.push('/saved-lives'); }} />
        <ActionButton icon="trophy" label={en.achievements} variant="plain" onPress={() => router.push('/achievements')} />
        <ActionButton icon="settings" label={en.settings} variant="plain" onPress={() => { clearMessage(); router.push('/settings'); }} />
      </View>
      <Feedback error={problem} />
      {!ready && <ActionButton icon="load" label="Retry loading saves" disabled={busy} onPress={() => void initialize()} />}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { minHeight: 276, paddingVertical: 34, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F1F7FE', borderWidth: 1, borderColor: '#E1EDF9', overflow: 'hidden', marginTop: space.sm },
  orbit: { width: 380, height: 380, borderRadius: 190, position: 'absolute', borderWidth: 1, borderColor: '#D8E8F8' },
  orbitInner: { width: 252, height: 252, borderRadius: 126, borderColor: '#DCEBFA' },
  orbitDot: { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: '#B7D9F8', top: 53, right: '21%' },
  title: { fontSize: 53, letterSpacing: -3.8, fontWeight: '800', color: colors.ink, marginTop: space.md },
  tagline: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: space.xs, textAlign: 'center', marginHorizontal: space.md },
  saveCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    borderWidth: 1, borderColor: colors.line, padding: space.md, borderRadius: radius.md },
  saveInfo: { gap: 2, flexShrink: 1 },
  saveAge: { color: colors.action, fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.xs },
});
