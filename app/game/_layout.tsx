import * as Haptics from 'expo-haptics';
import { Redirect, Slot, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, Feedback, Loading } from '../../src/components/ui';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { educationTab } from '../../src/educationView';
import { eventPopup, resultChange } from '../../src/eventView';
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
  const { character } = slot.life;
  const popup = eventPopup(slot.life);
  const dismiss = popup?.dismiss;

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
      {!popup && (problem || notice) && <View style={styles.feedback}><Feedback error={problem} notice={notice} /></View>}
      {!character.causeOfDeath && (
        <View accessibilityRole="tablist" style={styles.navigation}>
          {tabs.map((tab) => {
            const student = tab.path === '/game/career' && !!slot.life.academic.enrollment;
            const path = student ? '/game/education' : tab.path;
            const icon = student ? 'school' : tab.icon;
            const label = student ? educationTab(slot.life) : tab.label;
            const active = path !== null && (pathname.startsWith(path) || (path === '/game/activities' && pathname === '/game/doctor') ||
              (path === '/game/assets' && (pathname === '/game/property' || pathname === '/game/wealth')));
            const disabled = path === null && (busy || !!popup);
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
      )}
      {popup && <DetailModal open title={popup.title} onDismiss={dismiss ? () => { if (!busy) void dispatch(dismiss); } : undefined}>
        <Text style={styles.eventCategory}>{emoji[popup.category.icon]} {popup.meter ? 'Activity result' : popup.category.label}</Text>
        <Text style={styles.eventStory}>{popup.text}</Text>
        {popup.meter && <View style={styles.result}>
          <DetailMeter label={popup.meter.label} value={popup.meter.value} />
          <Text style={styles.resultChange}>{resultChange(popup.meter.change)}</Text>
        </View>}
        {!dismiss && <Text style={styles.eventQuestion}>What will you do?</Text>}
        {popup.actions.map(({ label, icon, action }) => <ActionButton key={label} label={label} icon={icon}
          testID={action.type === 'choose' ? `choice-${action.choice}` : undefined}
          disabled={busy} onPress={() => void dispatch(action)} />)}
        {problem && <Feedback error={problem} />}
      </DetailModal>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  feedback: { paddingHorizontal: space.lg, paddingBottom: space.sm },
  eventCategory: { color: colors.action, fontWeight: '700', fontSize: 14 },
  eventStory: { color: colors.ink, fontSize: 15, lineHeight: 22, marginBottom: space.xs },
  result: { padding: space.md, gap: space.xs, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  resultChange: { color: colors.action, fontSize: 12, fontWeight: '700', alignSelf: 'flex-end' },
  eventQuestion: { color: colors.ink, fontWeight: '700', fontSize: 14 },
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
