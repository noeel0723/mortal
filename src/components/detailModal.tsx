import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '../theme/tokens';
import { shared } from './ui';

export function DetailModal({ title, open, onDismiss, children, special, identity }: {
  title: string; open: boolean; onDismiss?: () => void; children: ReactNode;
  special?: 'enjoyment' | 'death' | 'match' | 'family'; identity?: ReactNode;
}) {
  return <Modal visible={open} transparent animationType="fade" onRequestClose={() => onDismiss?.()}>
    <View style={styles.overlay}>
      {onDismiss && <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} accessible={false} />}
      <View style={[styles.card, !!special && styles.specialCard, special === 'death' && styles.deathCard]}
        accessibilityViewIsModal onAccessibilityEscape={onDismiss}>
        {identity}
        <View style={[styles.header, !!special && styles.specialHeader]}>
          <Text accessibilityRole="header" style={[styles.heading, !!special && styles.specialHeading]}>{title}</Text>
          {onDismiss && !special && <Pressable accessibilityRole="button" accessibilityLabel={`Close ${title}`} onPress={onDismiss} style={styles.close}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>}
        </View>
        <ScrollView contentContainerStyle={styles.content} bounces={false}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}

export function DetailMeter({ label, value, enjoyment = false }: { label: string; value: number; enjoyment?: boolean }) {
  return <View style={styles.meter} accessibilityRole="progressbar" accessibilityLabel={label}
    accessibilityValue={{ min: 0, max: 100, now: value }}>
    <Text style={styles.meterLabel}>{label}</Text>
    <View style={styles.track}><View style={[styles.fill, enjoyment && styles.enjoymentFill, { width: `${value}%` }]} /></View>
    <Text style={styles.meterValue}>{value}%</Text>
  </View>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#142943A6', alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 390, maxHeight: '90%', flexShrink: 1, backgroundColor: colors.white,
    borderColor: colors.blueRule, borderWidth: 1, borderRadius: radius.lg, overflow: 'hidden' },
  header: { minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: space.lg,
    paddingRight: space.xs, backgroundColor: colors.softBlue, borderBottomColor: colors.line, borderBottomWidth: 1 },
  heading: { flex: 1, color: colors.action, fontSize: 17, fontWeight: '700' },
  specialCard: { borderTopColor: colors.action, borderTopWidth: 3 },
  deathCard: { borderTopColor: colors.muted },
  specialHeader: { backgroundColor: colors.white, borderBottomWidth: 0, minHeight: 0,
    paddingHorizontal: space.lg, paddingTop: space.md },
  specialHeading: { fontSize: 18, textAlign: 'center' },
  close: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.action, fontSize: 25 },
  content: { padding: space.lg, gap: space.sm },
  meter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  meterLabel: { ...shared.small, flex: 1 },
  track: { flex: 1.2, height: 7, borderRadius: radius.pill, backgroundColor: colors.softBlue, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: radius.pill },
  enjoymentFill: { backgroundColor: colors.greenText },
  meterValue: { ...shared.small, width: 36, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
