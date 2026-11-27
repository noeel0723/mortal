import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { educationStatus } from '../engine/academics';
import type { Life, Stat } from '../engine/types';
import { en, money, statLabels } from '../i18n/en';
import { colors, radius, space } from '../theme/tokens';
import { shared } from './ui';
import { Portrait } from './portrait';

const featuredStats = ['health', 'happiness', 'smarts', 'looks'] as const;
const fills = [colors.success, colors.warning, colors.blue, colors.lavender] as const;

function Meter({ stat, value, fill }: { stat: Stat; value: number; fill: string }) {
  const animated = useAnimatedStyle(() => ({
    width: withTiming(`${value}%` as `${number}%`, { duration: 260, reduceMotion: ReduceMotion.System }),
  }), [value]);
  return (
    <View style={styles.meter} accessibilityRole="progressbar" accessibilityLabel={statLabels[stat]} accessibilityValue={{ min: 0, max: 100, now: value }}>
      <View style={styles.meterLabel}>
        <Text style={shared.small}>{statLabels[stat]}</Text>
        <Text style={styles.value}>{value}%</Text>
      </View>
      <View style={styles.track}><Animated.View style={[styles.fill, { backgroundColor: fill }, animated]} /></View>
    </View>
  );
}

export function CharacterCard({ life, openProfile }: { life: Life; openProfile: () => void }) {
  const { firstName, lastName, age, city, bank, attributes } = life.character;
  return (
    <View style={styles.card}>
      <Pressable style={styles.profile} accessibilityRole="button" accessibilityLabel={`Open my profile, ${firstName} ${lastName}`} onPress={openProfile}>
        <Portrait appearance={life.character.appearance} age={age} size={50} />
        <View style={styles.identity}>
          <Text accessibilityRole="header" style={styles.name}>{firstName} {lastName}</Text>
          <Text style={shared.small}>{en.age(age)} · {city}, Veyra</Text>
          <Text style={shared.small}>{educationStatus(life)}</Text>
        </View>
      </Pressable>
      <View style={styles.details}>
        <Text style={styles.year}>Year {life.year}</Text>
        <Text style={styles.balance}>Bank <Text style={styles.money}>{money(bank)}</Text></Text>
      </View>
      <View style={styles.meters}>
        {featuredStats.map((stat, index) => <Meter key={stat} stat={stat} value={attributes[stat]} fill={fills[index] ?? colors.blue} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.lg, borderRadius: radius.lg, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E3ECF6', gap: space.md },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  identity: { flex: 1, gap: 2 },
  name: { color: colors.ink, fontSize: 22, fontWeight: '700', letterSpacing: -.65 },
  details: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm,
    borderBottomWidth: 1, borderColor: colors.line, paddingBottom: space.md },
  year: { color: colors.action, fontSize: 13, fontVariant: ['tabular-nums'], fontWeight: '700' },
  balance: { color: colors.muted, fontSize: 12 },
  money: { color: colors.ink, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  meters: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: space.sm, justifyContent: 'space-between' },
  meter: { width: '47%', minWidth: 100, gap: 5 },
  meterLabel: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', columnGap: space.xs },
  value: { fontSize: 12, fontWeight: '700', color: colors.ink, fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, backgroundColor: '#E2EBF5', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
