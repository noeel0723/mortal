import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { financeEntries, financeOverview, financeYears } from '../../src/careerView';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { money } from '../../src/i18n/en';
import { residenceLabel } from '../../src/propertyView';
import { useGame } from '../../src/stores/game';
import { space } from '../../src/theme/tokens';

export default function Assets() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const life = useGame((state) => state.slot?.life);
  const [selectedYear, setSelectedYear] = useState<number | 'all' | null>(null);
  if (!life) return null;
  if (screen !== 'finances') return <Page inGame>
    <Heading title="Assets" back={() => router.dismissTo('/game')} />
    <Section title="Banking">
      <ActionButton icon="bank" label="Finances" detail={money(life.character.bank)}
        onPress={() => router.push({ pathname: '/game/assets', params: { screen: 'finances' } })} />
      <ActionButton icon="assets" label="Owned Assets" detail={String(life.property.owned.length)}
        onPress={() => router.push({ pathname: '/game/property', params: { mode: 'owned' } })} />
    </Section>
    <Section title="Property and vehicles">
      <ActionButton icon="home" label="Housing" detail={residenceLabel(life)}
        onPress={() => router.push({ pathname: '/game/property', params: { mode: 'housing' } })} />
      <ActionButton icon="cart" label="Shopping" detail="Browse houses, cars, and motorcycles."
        onPress={() => router.push({ pathname: '/game/property', params: { mode: 'shopping' } })} />
    </Section>
  </Page>;

  const year = selectedYear === 'all' ? null : selectedYear ?? life.year;
  const entries = financeEntries(life, year);
  return (
    <Page inGame>
      <Heading title="Finances" back={() => router.dismissTo('/game/assets')} />
      <Section title={`Financial overview · ${year ?? life.year}`}>
        <Text style={shared.small}>Transaction year</Text>
        <ScrollView horizontal contentContainerStyle={styles.years}>
          <ActionButton icon="calendar" label="All years" selected={selectedYear === 'all'} onPress={() => setSelectedYear('all')} />
          {financeYears(life).map((option) => <ActionButton icon="calendar" key={option} label={String(option)} selected={year === option}
            onPress={() => setSelectedYear(option)} />)}
        </ScrollView>
        {financeOverview(life, year ?? life.year).map((row) => <DataRow key={row.label} {...row} />)}
      </Section>
      <Section title="Transaction History">
        {entries.length === 0 && <Text style={shared.body}>No transactions yet.</Text>}
        {entries.map((item, index) => (
          <DataRow key={index} label={`${item.year} · ${item.group} · ${item.label}`} value={money(item.amount)} />
        ))}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({ years: { gap: space.sm } });
