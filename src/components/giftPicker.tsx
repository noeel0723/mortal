import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { contactRole } from '../contactView';
import { giftIssue, giftOffers } from '../engine/gifts';
import type { Contact, Life } from '../engine/types';
import { money } from '../i18n/en';
import { colors, radius, space } from '../theme/tokens';
import { DetailModal } from './detailModal';
import { Portrait } from './portrait';
import { ActionButton, shared } from './ui';

export function GiftPicker({ life, person, round, busy, onCancel, onGive }: {
  life: Life; person: Contact; round: number; busy: boolean; onCancel: () => void; onGive: (gift: string) => void;
}) {
  const offers = giftOffers(life, person, round);
  const [selected, select] = useState(offers[0]!.gift.id);
  const [expanded, setExpanded] = useState(false);
  const { gift, price } = offers.find((offer) => offer.gift.id === selected) ?? offers[0]!;
  const issue = giftIssue(life, person, gift);

  return <DetailModal title="Give a Gift" open onDismiss={onCancel}>
    <View style={styles.identity}>
      <Portrait appearance={person.appearance} age={person.age} size={44} label={`Portrait of ${person.name}`} />
      <View style={styles.copy}><Text style={shared.strong}>{person.name}</Text><Text style={shared.small}>{contactRole(person, life)}</Text></View>
    </View>
    <Text style={styles.label}>Choose a gift</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`Choose a gift, ${gift.name}, ${money(price)}`}
      accessibilityState={{ expanded }} style={styles.select} disabled={busy} onPress={() => setExpanded(!expanded)}>
      <View style={styles.copy}><Text style={shared.strong}>{gift.name}</Text><Text style={shared.small}>{money(price)}</Text></View>
      <Text style={styles.label} accessible={false}>{expanded ? '▴' : '▾'}</Text>
    </Pressable>
    {expanded && <View style={styles.options}>{offers.map((option) => <Pressable key={option.gift.id} accessibilityRole="button"
      accessibilityLabel={`${option.gift.name}, ${money(option.price)}`} accessibilityState={{ selected: option.gift.id === selected }}
      style={[styles.option, option.gift.id === selected && styles.active]}
      onPress={() => { select(option.gift.id); setExpanded(false); }}>
      <Text style={[shared.body, styles.copy]}>{option.gift.name}</Text><Text style={shared.small}>{money(option.price)}</Text>
    </Pressable>)}</View>}
    {issue && <Text style={styles.issue}>{issue}</Text>}
    <View style={styles.actions}>
      <ActionButton icon="close" label="Cancel" variant="plain" disabled={busy} onPress={onCancel} style={styles.action} />
      <ActionButton icon="gift" label="Give Gift" variant="primary" disabled={busy || !!issue} onPress={() => onGive(gift.id)} style={styles.action} />
    </View>
  </DetailModal>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', padding: space.sm, alignItems: 'center', gap: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.md },
  copy: { flex: 1 },
  label: { ...shared.strong, color: colors.action },
  select: { flexDirection: 'row', padding: space.md, alignItems: 'center', borderWidth: 1, borderStyle: 'solid', borderColor: colors.blueRule, borderRadius: radius.sm },
  options: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm, borderBottomWidth: 1, borderColor: colors.line },
  active: { backgroundColor: colors.softBlue },
  issue: { ...shared.small, color: colors.errorText },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  action: { flex: 1 },
});
