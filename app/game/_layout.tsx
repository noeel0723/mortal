import * as Haptics from 'expo-haptics';
import { Redirect, Slot, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton, DataRow, Feedback, Loading } from '../../src/components/ui';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { Portrait } from '../../src/components/portrait';
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
      if (pathname !== '/game') router.dismissTo('/game');
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
      {popup && <DetailModal open title={popup.title} special={popup.special} identity={popup.portrait && <View style={styles.eventIdentity}>
        <Portrait appearance={popup.portrait.appearance} age={popup.portrait.age} size={46} label={`Portrait of ${popup.portrait.name}`} />
        <View style={styles.identityBody}><Text style={styles.identityName}>{popup.portrait.name}</Text>
          <Text style={styles.identityRole}>{popup.portrait.role}</Text></View>
      </View>} onDismiss={dismiss ? () => { if (!busy) void dispatch(dismiss); } : undefined}>
        {(!popup.special || (popup.special === 'family' && !popup.portrait)) &&
          <Text style={styles.eventCategory}>{emoji[popup.category.icon]} {popup.meter ? 'Activity result' : popup.category.label}</Text>}
        <Text style={[styles.eventStory, !!popup.special && styles.center]}>{popup.text}</Text>
        {popup.cause && <View style={styles.deathCause}><Text style={[styles.identityRole, styles.center]}>Cause of death</Text>
          <Text style={[styles.identityName, styles.center]}>{popup.cause}</Text></View>}
        {popup.match?.netWorth && <View style={styles.matchStat}><DataRow label="Net Worth" value={popup.match.netWorth} /></View>}
        {popup.profileRows && <View style={styles.matchStat}>{popup.profileRows.map((row) => <DataRow key={row.label} {...row} />)}</View>}
        {popup.match?.looks !== undefined && <View style={styles.result}><DetailMeter label="Looks" value={popup.match.looks} /></View>}
        {popup.profileMeters && <View style={styles.result}>{popup.profileMeters.map((row) => <DetailMeter key={row.label} {...row} />)}</View>}
        {popup.enjoyment && <View style={[styles.result, styles.enjoyment]}>
          {popup.enjoyment.map(({ key, label, value }) => <DetailMeter key={key} label={label} value={value} enjoyment />)}
        </View>}
        {popup.meter && <View style={styles.result}>
          <DetailMeter label={popup.meter.label} value={popup.meter.value} />
          <Text style={styles.resultChange}>{resultChange(popup.meter.change)}</Text>
        </View>}
        {!dismiss && !popup.special && <Text style={styles.eventQuestion}>What will you do?</Text>}
        {popup.actions.map(({ label, icon, action, tone, destination }) => <ActionButton key={label} label={label} icon={icon}
          variant={tone === 'quiet' ? 'plain' : tone}
          testID={action.type === 'choose' ? `choice-${action.choice}` : undefined}
          disabled={busy} onPress={() => void dispatch(action).then((saved) => {
            if (saved && destination) router.navigate(destination === 'summary' ? '/game/summary' : '/game');
          })} />)}
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
  center: { textAlign: 'center' },
  eventIdentity: { paddingHorizontal: space.lg, paddingVertical: space.sm, gap: space.sm,
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paper },
  identityBody: { flex: 1, gap: 2 },
  identityName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  identityRole: { color: colors.muted, fontSize: 12 },
  deathCause: { gap: 2, marginBottom: space.xs },
  matchStat: { paddingHorizontal: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  enjoyment: { backgroundColor: '#F4F9F8', gap: 6 },
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
