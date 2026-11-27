import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BrandMark } from '../../src/components/brand';
import { CharacterCard } from '../../src/components/character';
import { ActionButton, shared } from '../../src/components/ui';
import { eventById } from '../../src/data/events';
import type { JournalEntry } from '../../src/engine/types';
import { en, money, statLabels } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';
import { colors, radius, space } from '../../src/theme/tokens';

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
  const { slot, busy, dispatch, clearMessage } = useGame();
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
  const pending = life.pending ? eventById.get(life.pending) : undefined;
  const header = (
    <>
      <CharacterCard character={life.character} year={life.year} />
      <View style={styles.journalHeading}>
        <Text accessibilityRole="header" style={styles.title}>{en.lifeJournal}</Text>
        <ActionButton icon="world" label="World" onPress={() => router.push('/game/world')} variant="plain" />
      </View>
    </>
  );

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
            <View style={styles.groupHeader}>
              <View style={styles.dot} />
              <Text style={styles.age}>{item.age === 0 ? en.birth : en.age(item.age)}</Text>
              <Text style={styles.groupYear}>{life.character.birthYear + item.age}</Text>
            </View>
            <View style={styles.entries}>
              {item.events.map((entry, index) => (
                <View key={index} style={styles.entry}>
                  <Text style={styles.entryText}>{entry.text}</Text>
                  {Object.entries(entry.changes).length > 0 && <Text style={styles.changes}>
                    {Object.entries(entry.changes).map(([name, value]) => {
                      const stat = statLabels[name as keyof typeof statLabels];
                      return name === 'bank' ? `${value > 0 ? '+' : ''}${money(value)}` : `${stat} ${value > 0 ? '+' : ''}${value}`;
                    }).join('  ·  ')}
                  </Text>}
                </View>
              ))}
            </View>
          </View>
        )}
        ListFooterComponent={
          pending?.choices ? (
            <View style={styles.decision}>
              <Text accessibilityRole="header" style={shared.strong}>What will you do?</Text>
              <Text style={shared.body}>{pending.text}</Text>
              {pending.choices.map((choice) => (
                <ActionButton key={choice.id} icon={choice.emoji} label={choice.label} disabled={busy}
                  onPress={() => void dispatch({ type: 'choose', event: pending.id, choice: choice.id })} testID={`choice-${choice.id}`} />
              ))}
            </View>
          ) : ending ? <ActionButton icon="history" label="Life Summary" onPress={() => router.push('/game/summary')} /> : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, width: '100%', maxWidth: 580, alignSelf: 'center' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: 3 },
  wordmark: { flex: 1, fontSize: 21, fontWeight: '800', color: colors.ink, letterSpacing: -.8 },
  header: { paddingHorizontal: space.lg, gap: space.xs },
  journalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginRight: -space.sm },
  title: { flexShrink: 1, fontSize: 20, fontWeight: '700', letterSpacing: -.45, color: colors.ink },
  journal: { paddingHorizontal: space.lg, paddingTop: space.xs, paddingBottom: space.lg },
  group: { marginBottom: space.md },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.blue },
  age: { color: colors.action, fontSize: 14, fontWeight: '800' },
  groupYear: { color: colors.muted, fontSize: 12, fontVariant: ['tabular-nums'] },
  entries: { marginLeft: 4, marginTop: space.xs, paddingLeft: space.md, paddingVertical: space.xs,
    borderLeftWidth: 1, borderColor: colors.blueRule, gap: space.sm },
  entry: { gap: 3 },
  entryText: { color: colors.ink, fontSize: 14, lineHeight: 21 },
  changes: { color: colors.muted, fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  decision: { gap: space.sm, padding: space.md, borderWidth: 1, borderRadius: radius.md, borderColor: colors.blueRule, backgroundColor: colors.softBlue },
});
