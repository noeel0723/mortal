import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../../src/components/brand';
import { CharacterCard } from '../../src/components/character';
import { ActionButton } from '../../src/components/ui';
import type { JournalEntry } from '../../src/engine/types';
import { en, money, statLabels } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';
import { colors, space } from '../../src/theme/tokens';

function groupJournal(journal: readonly JournalEntry[]) {
  const groups: { age: number; events: JournalEntry[] }[] = [];
  for (const entry of journal) {
    const group = groups.at(-1);
    if (group?.age === entry.age) group.events.push(entry);
    else groups.push({ age: entry.age, events: [entry] });
  }
  return groups;
}

const emptyJournal: JournalEntry[] = [];

export default function Journal() {
  const { slot, clearMessage } = useGame();
  const { fontScale, height } = useWindowDimensions();
  const scrollHeader = fontScale >= 1.4 || height < 550;
  const groups = useMemo(() => groupJournal(slot?.life.journal ?? emptyJournal), [slot?.life.journal]);
  const list = useRef<FlatList<(typeof groups)[number]>>(null);
  const reveal = useRef(true);
  const lastEntry = slot?.life.journal.length;
  const currentAge = slot?.life.character.age;
  const scrollToRecent = useCallback(() => {
    if (!reveal.current) return;
    list.current?.scrollToEnd({ animated: false });
  }, []);

  useEffect(() => {
    reveal.current = true;
    const frame = requestAnimationFrame(scrollToRecent);
    return () => cancelAnimationFrame(frame);
  }, [currentAge, lastEntry, scrollToRecent, slot?.id]);

  if (!slot) return null;
  const life = slot.life;
  const ending = !!life.character.causeOfDeath;
  const header = <CharacterCard life={life} openProfile={() => router.push({ pathname: '/game/person', params: { id: 'self' } })} />;

  return (
    <View style={styles.frame}>
      <View style={styles.toolbar}>
        <BrandMark />
        <Text style={styles.wordmark}>Mortal</Text>
        <ActionButton icon="stats" label="Life Statistics" onPress={() => { clearMessage(); router.push('/game/statistics'); }} compact variant="plain" />
        <ActionButton icon="settings" label="Life Menu" onPress={() => { clearMessage(); router.push('/game/menu'); }} compact variant="plain" />
      </View>
      {!scrollHeader && <View style={styles.header}>{header}</View>}
      <FlatList
        key={slot.id} ref={list} data={groups} keyExtractor={(item) => String(item.age)}
        onScrollBeginDrag={() => { reveal.current = false; }}
        onContentSizeChange={scrollToRecent} onLayout={scrollToRecent}
        contentContainerStyle={styles.journal}
        ListHeaderComponent={scrollHeader ? header : undefined}
        renderItem={({ item }) => (
          <View style={styles.group}>
            <Text accessibilityRole="header" style={styles.age}>{en.age(item.age)}</Text>
            <View style={styles.entries}>
              {item.events.map((entry, index) => (
                <View key={index} style={styles.entry}>
                  <Text style={styles.entryText}>{entry.text}
                    {Object.entries(entry.changes).length > 0 && <Text style={styles.changes}>{' · '}
                      {Object.entries(entry.changes).map(([name, value]) => {
                        const stat = statLabels[name as keyof typeof statLabels];
                        return name === 'bank' ? `${value > 0 ? '+' : ''}${money(value)}` : `${stat} ${value > 0 ? '+' : ''}${value}`;
                      }).join(' · ')}
                    </Text>}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
        ListFooterComponent={ending ? <ActionButton icon="history" label="Life Summary" onPress={() => router.push('/game/summary')} /> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 580, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 3 },
  wordmark: { flex: 1, fontSize: 21, fontWeight: '800', color: colors.ink, letterSpacing: -.8 },
  header: { paddingHorizontal: space.lg, gap: space.xs },
  journal: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.lg },
  group: { marginBottom: space.md },
  age: { color: colors.action, fontSize: 14, fontWeight: '800' },
  entries: { marginTop: 2, gap: 2 },
  entry: { gap: 3 },
  entryText: { color: colors.ink, fontSize: 13, lineHeight: 18 },
  changes: { color: colors.muted, fontSize: 11, fontVariant: ['tabular-nums'] },
});
