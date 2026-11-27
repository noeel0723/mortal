import * as Haptics from 'expo-haptics';
import { Redirect, Slot, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Feedback, Loading } from '../../src/components/ui';
import { educationTab } from '../../src/educationView';
import { useGame } from '../../src/stores/game';
import { colors, emoji, radius, space } from '../../src/theme/tokens';

const tabs = [
  { icon: 'career', label: 'Career', path: '/game/career' },
  { icon: 'relationships', label: 'Relationships', path: '/game/relationships' },
  { icon: 'age', label: 'Age Up', path: null },
  { icon: 'assets', label: 'Assets', path: '/game/assets' },
  { icon: 'activities', label: 'Activities', path: '/game/activities' },
] as const;

export default function GameLayout() {
  const pathname = usePathname();
  const { slot, ready, busy, problem, notice, dispatch, haptics, clearMessage } = useGame();
  if (!ready && !problem) return <Loading />;
  if (!slot) return <Redirect href="/" />;
  const { pending, character } = slot.life;

  async function age() {
    if (await dispatch({ type: 'age' })) {
      if (haptics) void Haptics.selectionAsync().catch(() => {});
      if (useGame.getState().slot?.life.character.causeOfDeath) router.dismissTo('/game/summary');
      else if (pathname !== '/game') router.dismissTo('/game');
    }
  }

  function go(path: NonNullable<typeof tabs[number]['path']> | '/game/education') {
    clearMessage();
    if (pathname === path) router.dismissTo('/game');
    else router.navigate(path);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <Slot />
      {(problem || notice) && <View style={styles.feedback}><Feedback error={problem} notice={notice} /></View>}
      {!character.causeOfDeath && (
        <>
          {pending && pathname !== '/game' && (
            <View style={styles.pending}><ActionButton icon="life" label="Resolve decision in journal" onPress={() => router.dismissTo('/game')} /></View>
          )}
          <View accessibilityRole="tablist" style={styles.navigation}>
            {tabs.map((tab) => {
              const student = tab.path === '/game/career' && !!slot.life.academic.enrollment;
              const path = student ? '/game/education' : tab.path;
              const icon = student ? 'school' : tab.icon;
              const label = student ? educationTab(slot.life) : tab.label;
              const active = path !== null && pathname.startsWith(path);
              const disabled = path === null && (busy || !!pending);
              return (
                <Pressable key={icon} testID={path === null ? 'age-up' : undefined} accessibilityRole={path === null ? 'button' : 'tab'}
                  accessibilityLabel={label} accessibilityState={{ selected: active, disabled }} disabled={disabled}
                  onPress={() => path ? go(path) : void age()}
                  style={({ pressed }) => [styles.tab, active && styles.active, path === null && styles.age,
                    pressed && styles.pressed, disabled && styles.disabled]}>
                  <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.icon, path === null && styles.ageIcon]}>{emoji[icon]}</Text>
                  <Text style={[styles.label, (active || path === null) && styles.keyLabel]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  feedback: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  pending: { paddingHorizontal: space.lg, paddingVertical: space.sm },
  navigation: { flexDirection: 'row', gap: 2, borderTopWidth: 1, borderColor: colors.line,
    paddingHorizontal: 5, paddingTop: 5, paddingBottom: 4, width: '100%', maxWidth: 580, alignSelf: 'center' },
  tab: { flex: 1, minWidth: 0, minHeight: 55, paddingVertical: 4, paddingHorizontal: 1,
    alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, gap: 2 },
  active: { backgroundColor: colors.paper },
  age: { backgroundColor: '#DDEFFF', borderWidth: 1, borderColor: '#C0DEF7' },
  pressed: { backgroundColor: '#BDDEF9' },
  disabled: { opacity: .54 },
  icon: { fontSize: 19, lineHeight: 23 },
  ageIcon: { fontSize: 20, lineHeight: 25 },
  label: { color: colors.muted, fontSize: 9, fontWeight: '600', textAlign: 'center' },
  keyLabel: { color: colors.action, fontWeight: '800' },
});
