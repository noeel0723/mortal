import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, Heading, Page } from '../../src/components/ui';
import { spendTimeAllIssue } from '../../src/engine/relationshipTime';
import { relationshipCondition, relationshipSatisfaction } from '../../src/engine/relationships';
import { DetailModal } from '../../src/components/detailModal';
import { useGame } from '../../src/stores/game';
import { directoryCategories, directorySorts, relationshipSections, socialRole, type DirectoryCategory, type DirectorySort } from '../../src/socialView';
import { colors, radius, space } from '../../src/theme/tokens';

export default function Relationships() {
  const { slot, busy, dispatch } = useGame();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<DirectoryCategory>('All');
  const [sort, setSort] = useState<DirectorySort>('closeness');
  const [filters, setFilters] = useState(false);
  const life = slot?.life;
  if (!life) return null;
  const issue = spendTimeAllIssue(life);
  const sections = relationshipSections(life, query, category, sort);
  return (
    <Page inGame>
      <Heading title="Relationships" back={() => router.dismissTo('/game')} />
      <View style={styles.tools}>
        <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search contacts" accessibilityLabel="Search contacts" />
        <Pressable accessibilityRole="button" style={styles.filter} onPress={() => setFilters(true)}>
          <Text style={styles.filterText}>Filters</Text>
        </Pressable>
      </View>
      <DetailModal title="Contact Filters" open={filters} onDismiss={() => setFilters(false)}>
        <Text style={styles.detail}>Category</Text>
        {directoryCategories.map((item) => <ActionButton key={item} icon="files" label={item} detail={category === item ? 'Selected' : undefined}
          onPress={() => setCategory(item)} />)}
        <Text style={styles.detail}>Sort by</Text>
        {directorySorts.map((item) => <ActionButton key={item} icon="options" label={item === 'recent' ? 'Recent interaction' : `${item[0]!.toUpperCase()}${item.slice(1)}`}
          detail={sort === item ? 'Selected' : undefined} onPress={() => setSort(item)} />)}
        <ActionButton icon="accept" label="Apply Filters" variant="primary" onPress={() => setFilters(false)} />
      </DetailModal>
      <View style={styles.directory}>
        {!sections.length && <Text style={styles.empty}>No contacts match these filters.</Text>}
        {sections.map(({ title, people, loveLife }) => <View key={title}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
          {people.map((person) => {
            const role = socialRole(life, person);
            const quality = relationshipSatisfaction(life, person);
            const condition = relationshipCondition(life, person);
            return <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={`${person.name}, ${role}`}
              accessibilityHint={person.alive ? `${condition}, relationship quality ${quality}%` : 'Deceased'}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => router.push({ pathname: '/game/person', params: { id: person.id, source: 'relationships' } })}>
              <Portrait appearance={person.appearance} age={person.age} size={44} />
              <View style={styles.info}>
                <Text style={styles.name}>{person.name} <Text style={styles.role}>{role}</Text></Text>
                {person.alive ? <View style={styles.meter}>
                  <Text style={styles.detail}>{condition}</Text>
                  <View style={styles.track}><View style={[styles.fill, { width: `${quality}%` }]} /></View>
                </View> : <Text style={styles.detail}>Deceased</Text>}
              </View>
              <Text accessible={false} style={styles.chevron}>›</Text>
            </Pressable>;
          })}
          {loveLife && <ActionButton icon="rose" label="Open Love Life" detail="Dating, connections, and relationship history."
            style={styles.link} onPress={() => router.push('/game/love-life')} />}
        </View>)}
      </View>
      <ActionButton icon="hours" label="Spend Time with All" variant="primary" style={styles.all}
        disabled={busy || !!issue} onPress={() => void dispatch({ type: 'spend-time-all' })} />
      {issue && <Text style={styles.availability}>{issue}</Text>}
    </Page>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', gap: space.sm },
  search: { flex: 1, height: 42, paddingHorizontal: space.md, borderWidth: 1, borderRadius: radius.sm, borderColor: colors.blueRule, color: colors.ink },
  filter: { justifyContent: 'center', paddingHorizontal: space.md, borderRadius: radius.sm, backgroundColor: colors.softBlue },
  filterText: { color: colors.action, fontWeight: '700', fontSize: 13 },
  empty: { padding: space.md, fontSize: 13, color: colors.muted },
  directory: { borderWidth: 1, borderColor: colors.blueRule, borderRadius: radius.md, overflow: 'hidden' },
  sectionTitle: { backgroundColor: colors.softBlue, color: colors.action, fontSize: 12, fontWeight: '800', paddingHorizontal: space.md,
    paddingVertical: space.sm, borderBottomWidth: 1, borderColor: colors.blueRule },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 68, paddingHorizontal: space.md, paddingVertical: space.sm,
    borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.white },
  pressed: { backgroundColor: colors.paper },
  info: { flex: 1, gap: space.xs },
  name: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  role: { color: colors.action, fontSize: 13, fontWeight: '500' },
  meter: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  detail: { color: colors.muted, fontSize: 12 },
  track: { height: 6, flex: 1, maxWidth: 128, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#28836d' },
  chevron: { color: colors.accent, fontSize: 28, paddingHorizontal: space.xs },
  link: { borderRadius: 0, borderWidth: 0, minHeight: 60 },
  all: { minHeight: 54, backgroundColor: '#086b68', borderColor: '#086b68' },
  availability: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
