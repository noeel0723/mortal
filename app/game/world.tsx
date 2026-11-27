import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailModal } from '../../src/components/detailModal';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { en } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';
import { colors, space } from '../../src/theme/tokens';
import { cityFromSlug, cityReport, compareCities, currentNews, industryReport, relocationDescription, worldHistory, worldOverview, worldReports } from '../../src/worldView';

export default function World() {
  const { report, destination } = useLocalSearchParams<{ report?: string; destination?: string }>();
  const [confirm, setConfirm] = useState(false);
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const { life } = slot;
  const back = () => router.canGoBack() ? router.back() : router.replace('/game/world');
  const city = cityFromSlug(destination);
  if (city) {
    const details = cityReport(life, city);
    return <Page inGame>
      <Heading title={city} back={back} />
      <Text style={shared.body}>{details.description}</Text>
      <Section title="City Indicators">{details.rows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
      {!details.current && <Section title="Relocation">
        <ActionButton icon="train" label={`Move to ${city}`} detail={details.issue ?? `Moving cost ${details.fee}`}
          disabled={busy || !!details.issue} onPress={() => setConfirm(true)} />
      </Section>}
      <DetailModal title="Confirm Relocation" open={confirm} onDismiss={() => setConfirm(false)}>
        <Text style={shared.body}>{relocationDescription}</Text>
        <DataRow label="Moving cost" value={details.fee} />
        <ActionButton icon="accept" label="Confirm Move" disabled={busy || !!details.issue} onPress={() => {
          setConfirm(false);
          void dispatch({ type: 'relocate', city });
        }} />
      </DetailModal>
    </Page>;
  }
  if (report === 'cities') return <Page inGame>
    <Heading title="Compare Cities" back={back} />
    <Section title="Veyra">{compareCities(life).map((item) => <ActionButton key={item.id} icon="location" label={item.city} detail={item.detail}
      onPress={() => router.push({ pathname: '/game/world', params: { report, destination: item.id } })} />)}</Section>
  </Page>;
  if (report === 'industries') return <Page inGame>
    <Heading title="Industry Report" subtitle={String(life.year)} back={back} />
    {industryReport(life).map(({ industry, rows }) => <Section key={industry} title={industry}>
      {rows.map((row) => <DataRow key={row.label} {...row} />)}
    </Section>)}
  </Page>;
  if (report === 'news') {
    const articles = currentNews(life);
    return <Page inGame>
      <Heading title="World News" subtitle={en.worldNotice} back={back} />
      {([['This Year', true], ['Earlier Headlines', false]] as const).map(([label, current]) => {
        const items = articles.filter(({ year }) => (year === life.year) === current);
        if (!current && !items.length) return null;
        return <Section title={label} key={label}>
          {items.length ? items.map((item) => <View key={item.key} style={styles.article}>
            <Text style={shared.strong}>{item.title}</Text>
            <Text style={shared.small}>{item.area} · {item.year}{item.active && item.year !== life.year ? ' · Ongoing' : ''}</Text>
            <Text style={shared.body}>{item.story}</Text>
          </View>) : <Text style={shared.body}>No major developments this year.</Text>}
        </Section>;
      })}
    </Page>;
  }
  if (report === 'history') {
    const history = worldHistory(life);
    return <Page inGame>
      <Heading title="World History" back={back} />
      <Section title="Consumer prices" detail="Price index, with 100 at the first recorded year">
        <View style={styles.chart} accessibilityLabel={`Price index from ${history.chart[0]!.value} to ${history.chart.at(-1)!.value}`}>
          {history.chart.map(({ year, height }) => <View key={year} style={[styles.bar, { height: `${height}%` }]} />)}
        </View>
        <DataRow label={`${history.chart[0]!.year} – ${history.chart.at(-1)!.year}`} value={`${history.chart[0]!.value} → ${history.chart.at(-1)!.value}`} />
      </Section>
      <Section title="Annual Records">{history.rows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
    </Page>;
  }
  const overview = worldOverview(life);
  return <Page inGame>
    <Heading title="World" subtitle={en.worldNotice} back={() => router.dismissTo('/game')} />
    <Section title="Veyra">{overview.countryRows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
    <Section title="Reports">{worldReports.map((item) => <ActionButton key={item.id} icon={item.icon} label={item.label}
      onPress={() => router.push({ pathname: '/game/world', params: { report: item.id } })} />)}</Section>
    <Section title="Economic Indicators">{overview.economyRows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
    <Section title="Public Services">{overview.communityRows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
  </Page>;
}

const styles = StyleSheet.create({
  article: { gap: space.xs, paddingVertical: space.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xs, height: 80, borderBottomWidth: 1, borderColor: colors.line },
  bar: { flex: 1, maxWidth: 36, backgroundColor: colors.blue, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
});
