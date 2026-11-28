import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, emoji, radius, space } from '../theme/tokens';
import type { Emoji } from '../theme/tokens';

export function ActionButton({ icon, label, onPress, variant = 'secondary', disabled = false, compact = false, compactDetail = false,
  selected, style, testID, leading, detail }: {
  icon: Emoji; label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'plain' | 'danger';
  disabled?: boolean; compact?: boolean; compactDetail?: boolean; selected?: boolean; style?: StyleProp<ViewStyle>;
  testID?: string; leading?: ReactNode; detail?: string;
}) {
  const labelStyle = [styles.buttonLabel, variant === 'primary' && styles.whiteLabel, variant === 'danger' && styles.errorLabel];
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ disabled, selected }}
      disabled={disabled} onPress={onPress} testID={testID}
      style={({ pressed }) => [styles.button, styles[variant], selected && styles.selected, compact && styles.compact,
        pressed && (variant === 'primary' ? styles.primaryPressed : styles.pressed), disabled && styles.disabled, style]}
    >
      {leading ?? <Text accessibilityElementsHidden importantForAccessibility="no" style={[styles.emoji, compact && styles.compactEmoji]}>{emoji[icon]}</Text>}
      {!compact && (detail ? <View style={styles.buttonText}>
        <Text style={[labelStyle, styles.rowLabel]}>{label}</Text>
        <Text style={[shared.small, compactDetail && styles.compactDetail]}>{detail}</Text>
      </View> : <Text style={labelStyle}>{label}</Text>)}
    </Pressable>
  );
}

export function Heading({ title, subtitle, right, back }: { title: string; subtitle?: string; right?: ReactNode; back?: () => void }) {
  return (
    <View style={styles.heading}>
      {back && <ActionButton icon="back" label="Back" onPress={back} compact variant="plain" />}
      <View style={styles.headingText}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

export function Page({ children, inGame = false, scroll = true }: PropsWithChildren<{ inGame?: boolean; scroll?: boolean }>) {
  const body = scroll ? (
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  ) : <View style={[styles.column, styles.flex]}>{children}</View>;
  return inGame ? <View style={styles.page}>{body}</View> :
    <SafeAreaView style={styles.page} edges={['top', 'bottom', 'left', 'right']}>{body}</SafeAreaView>;
}

export function Section({ title, detail, children }: PropsWithChildren<{ title?: string; detail?: string }>) {
  return (
    <View style={styles.section}>
      {title && <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>}
      {detail && <Text style={styles.body}>{detail}</Text>}
      {children}
    </View>
  );
}

export function DataRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.dataRow}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{value}</Text>
    </View>
  );
}

export function Feedback({ error, notice }: { error?: string | null; notice?: string | null }) {
  if (!error && !notice) return null;
  return (
    <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={[styles.feedback, error ? styles.error : styles.success]}>
      {error ?? notice}
    </Text>
  );
}

export function Loading() {
  return <View style={styles.loading}><ActivityIndicator accessibilityLabel="Loading Mortal" size="large" color={colors.action} /></View>;
}

export const shared = StyleSheet.create({
  body: { color: colors.muted, fontSize: 14, lineHeight: 21 },
  strong: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  small: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  group: { gap: space.sm },
});

const styles = StyleSheet.create({
  flex: { flex: 1, width: '100%' },
  page: { flex: 1, backgroundColor: colors.white },
  content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xxl },
  column: { maxWidth: 560, alignSelf: 'center', width: '100%', gap: space.lg },
  heading: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headingText: { flex: 1 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '700', letterSpacing: -.7 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 2 },
  section: { gap: space.sm },
  sectionTitle: { color: colors.ink, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: shared.body,
  dataRow: { flexDirection: 'row', gap: space.md, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line, minHeight: 44, paddingVertical: space.sm },
  dataLabel: { ...shared.body, flex: 1 },
  dataValue: { maxWidth: '55%', flexShrink: 1, color: colors.ink, textAlign: 'right', fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  button: { minHeight: 48, paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.md,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  primary: { backgroundColor: colors.action, borderColor: colors.action },
  primaryPressed: { backgroundColor: colors.actionPressed },
  secondary: { backgroundColor: colors.white, borderColor: colors.line },
  selected: { backgroundColor: colors.softBlue, borderColor: colors.blue },
  plain: { backgroundColor: 'transparent', borderColor: 'transparent' },
  danger: { backgroundColor: colors.errorSurface, borderColor: '#F3DCE0' },
  compact: { width: 48, paddingHorizontal: 0 },
  pressed: { backgroundColor: colors.softBlue },
  disabled: { opacity: .5 },
  emoji: { fontSize: 23, lineHeight: 28 },
  compactEmoji: { fontSize: 19, lineHeight: 25 },
  buttonLabel: { color: colors.ink, fontSize: 14, textAlign: 'center', fontWeight: '600', flexShrink: 1 },
  buttonText: { flex: 1, gap: 2 },
  compactDetail: { lineHeight: 15 },
  rowLabel: { textAlign: 'left' },
  whiteLabel: { color: colors.white },
  errorLabel: { color: colors.errorText },
  feedback: { padding: space.md, borderRadius: radius.md, fontSize: 14, lineHeight: 20 },
  error: { color: colors.errorText, backgroundColor: colors.errorSurface },
  success: { color: colors.greenText, backgroundColor: '#EAF7F1' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
});
