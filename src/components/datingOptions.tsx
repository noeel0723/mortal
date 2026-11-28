import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { datingAgeOptions, datingWorthOptions, defaultDatingPreferences, isDatingApp } from '../engine/dating';
import type { DatingAppSource, DatingPreferences } from '../engine/dating';
import type { Life } from '../engine/types';
import { estate } from '../engine/wealth';
import { money } from '../i18n/en';
import { datingApps } from '../socialView';
import type { datingControls } from '../socialView';
import { useGame } from '../stores/game';
import { colors, radius, space } from '../theme/tokens';
import { DetailModal } from './detailModal';
import { ActionButton, DataRow } from './ui';

function DatingPreferencesModal({ source, life, busy, onClose, search }: {
  source: DatingAppSource; life: Life; busy: boolean; onClose: () => void; search: (preferences: DatingPreferences) => void;
}) {
  const [preferences, setPreferences] = useState(defaultDatingPreferences);
  const [expanded, setExpanded] = useState<keyof DatingPreferences>();
  function filter<K extends keyof DatingPreferences>(key: K, label: string, options: Record<DatingPreferences[K], { label: string }>) {
    return <>
      <ActionButton icon="options" label={label} detail={options[preferences[key]].label}
        selected={expanded === key} onPress={() => setExpanded(expanded === key ? undefined : key)} />
      {expanded === key && <View style={styles.options}>
        {(Object.keys(options) as DatingPreferences[K][]).map((id) => (
          <ActionButton key={id} icon={preferences[key] === id ? 'accept' : 'options'} label={options[id].label}
            variant="plain" selected={preferences[key] === id} onPress={() => {
              setPreferences({ ...preferences, [key]: id });
              setExpanded(undefined);
            }} />
        ))}
      </View>}
    </>;
  }
  return <DetailModal title={datingApps[source].label} open onDismiss={onClose}>
    <View style={styles.netWorth}><DataRow label="Your Net Worth" value={money(estate(life).total)} /></View>
    {filter('age', 'Preferred Age', datingAgeOptions)}
    {filter('netWorth', 'Preferred Net Worth', datingWorthOptions)}
    <ActionButton icon="search" label="Find a Match" variant="primary" disabled={busy} onPress={() => search(preferences)} />
  </DetailModal>;
}

export function DatingOptions({ life, controls }: { life: Life; controls: ReturnType<typeof datingControls> }) {
  const { busy, dispatch } = useGame();
  const [source, setSource] = useState<DatingAppSource>();
  return <>
    {controls.map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label}
      compactDetail detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => {
        if (item.action.type === 'dating-match' && isDatingApp(item.action.source)) setSource(item.action.source);
        else void dispatch(item.action);
      }} />)}
    {source && <DatingPreferencesModal key={source} source={source} life={life} busy={busy}
      onClose={() => setSource(undefined)} search={(preferences) => {
        setSource(undefined);
        void dispatch({ type: 'dating-match', source, preferences });
      }} />}
  </>;
}

const styles = StyleSheet.create({
  netWorth: { paddingHorizontal: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  options: { gap: space.xs, padding: space.xs, borderRadius: radius.sm, backgroundColor: colors.paper },
});
