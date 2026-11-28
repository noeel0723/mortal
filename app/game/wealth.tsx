import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import { DetailModal } from '../../src/components/detailModal';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { careerActionIssue } from '../../src/engine/career';
import type { Action } from '../../src/engine/types';
import { useGame } from '../../src/stores/game';
import { colors, radius, space } from '../../src/theme/tokens';
import { findFund, funds, fundView, loanView, parseCashAmount, retirementView, savingsControls, savingsHistory, savingsRows } from '../../src/wealthView';
import type { FinanceControl } from '../../src/wealthView';

export default function Wealth() {
  const { screen, fund } = useLocalSearchParams<{ screen?: string; fund?: string }>();
  const [amount, setAmount] = useState('');
  const [confirm, setConfirm] = useState<{ label: string; detail?: string; action: Action } | null>(null);
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const { life } = slot;
  const id = findFund(fund);
  const back = () => router.canGoBack() ? router.back() : router.replace(screen === 'loans' ? '/game/activities' : '/game/assets');
  const controls = (items: FinanceControl[]) => items.map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label}
    detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => setConfirm(item)} />);
  const detail = confirm && <DetailModal title={confirm.label} open onDismiss={() => setConfirm(null)}>
    {confirm.detail && <Text style={shared.body}>{confirm.detail}</Text>}
    <ActionButton icon="accept" label="Confirm" disabled={busy} onPress={() => {
      setConfirm(null);
      void dispatch(confirm.action);
    }} />
  </DetailModal>;
  if (screen === 'banking') {
    const history = savingsHistory(life);
    return <Page inGame>
      <Heading title="Savings Account" back={back} />
      <Section title="Account">{savingsRows(life).map((row) => <DataRow key={row.label} {...row} />)}</Section>
      <Section title="Transfer">
        <Text style={shared.small}>Amount in dollars</Text>
        <TextInput accessibilityLabel="Amount in dollars" inputMode="decimal" placeholder="0.00" placeholderTextColor={colors.muted}
          maxLength={11} value={amount} onChangeText={setAmount} style={styles.amount} editable={!busy} />
        {controls(savingsControls(life, parseCashAmount(amount)))}
      </Section>
      {history.length > 0 && <Section title="Savings History">{history.map(({ key, ...row }) => <DataRow key={key} {...row} />)}</Section>}
      {detail}
    </Page>;
  }
  if (screen === 'loans') {
    const model = loanView(life);
    return <Page inGame>
      <Heading title="Loans & Debts" back={back} />
      <Section title="Credit">{model.credit.map((row) => <DataRow key={row.label} {...row} />)}</Section>
      {model.offer ? <Section title="Fixed-Rate Loan Offer">
        {model.offer.rows.map((row) => <DataRow key={row.label} {...row} />)}{controls(model.offer.controls)}
      </Section> : <Section title="Apply for a Personal Loan">{controls(model.applications)}</Section>}
      {model.loans.map((loan) => <Section key={loan.title} title={loan.title}>
        {loan.rows.map((row) => <DataRow key={row.label} {...row} />)}
        {controls(loan.controls)}
        {loan.history.map(({ key, ...row }) => <DataRow key={key} {...row} />)}
      </Section>)}
      {detail}
    </Page>;
  }
  if (screen === 'retirement') {
    const model = retirementView(life);
    const action = { type: 'retire' } as const;
    const issue = careerActionIssue(life, action);
    return <Page inGame>
      <Heading title="Retirement" back={back} />
      <Section title="Veyra Pension">{model.rows.map((row) => <DataRow key={row.label} {...row} />)}
        {life.career.retiredYear === null && <ActionButton icon="retire" label="Retire" detail={issue ?? 'Ends employment and opens eligible pension payments.'}
          disabled={busy || !!issue} onPress={() => setConfirm({ label: 'Retire', detail: 'This ends employment permanently.', action })} />}
      </Section>
      {model.history.length > 0 && <Section title="Contribution History">
        {model.history.map((row) => <DataRow key={row.label} {...row} />)}
      </Section>}
      {detail}
    </Page>;
  }
  if (id) {
    const model = fundView(life, id);
    return <Page inGame>
      <Heading title={funds(life).find((item) => item.id === id)!.name} back={back} />
      <Section title="Holding">{model.rows.map((row) => <DataRow key={row.label} {...row} />)}</Section>
      <Section title="Buy Units">{controls(model.buy)}</Section>
      {!!model.sell.length && <Section title="Sell Units" detail="Quotes include a 1% sale fee.">{controls(model.sell)}</Section>}
      {detail}
    </Page>;
  }
  return <Page inGame>
    <Heading title="Investments" back={back} />
    <Section title="Veyra Funds">
      {funds(life).map((item) => <ActionButton key={item.id} icon={item.icon} label={item.name} detail={item.detail}
        onPress={() => router.push({ pathname: '/game/wealth', params: { screen: 'investments', fund: item.id } })} />)}
    </Section>
  </Page>;
}

const styles = StyleSheet.create({ amount: { color: colors.ink, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line,
  padding: space.sm, minHeight: 44 } });
