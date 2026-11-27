import { router } from 'expo-router';
import { Text } from 'react-native';
import { DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { money } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';

export default function Assets() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  return (
    <Page inGame>
      <Heading title="Assets" back={() => router.dismissTo('/game')} />
      <Section title="Bank Account">
        <DataRow label="Balance" value={money(life.character.bank)} />
      </Section>
      <Section title="Transaction History">
        {life.transactions.length === 0 && <Text style={shared.body}>No transactions yet.</Text>}
        {[...life.transactions].reverse().map((item, index) => (
          <DataRow key={index} label={`${item.year} · ${item.label}`} value={money(item.amount)} />
        ))}
      </Section>
    </Page>
  );
}
