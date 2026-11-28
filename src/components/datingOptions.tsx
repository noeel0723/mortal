import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { datingAgeOptions, datingProfileIssue, datingWorthOptions, isDatingApp, playerDatingProfile } from '../engine/dating';
import type { DatingAppSource, DatingPreferences, DatingProfile } from '../engine/dating';
import { datingProfileIdentity, profileFields } from '../datingProfileView';
import type { Life } from '../engine/types';
import { estate } from '../engine/wealth';
import { en, money } from '../i18n/en';
import { datingApps } from '../socialView';
import type { datingControls } from '../socialView';
import { useGame } from '../stores/game';
import { colors, radius, space } from '../theme/tokens';
import { DetailModal } from './detailModal';
import { Portrait } from './portrait';
import { ActionButton, DataRow, shared } from './ui';

function DatingPreferencesModal({ source, life, busy, onClose, search }: {
  source: DatingAppSource; life: Life; busy: boolean; onClose: () => void; search: (preferences: DatingPreferences) => void;
}) {
  const [preferences, setPreferences] = useState<DatingPreferences>(() => {
    const { age, netWorth } = playerDatingProfile(life);
    return { age, netWorth };
  });
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
    <ActionButton icon="search" label="Find a Profile" variant="primary" disabled={busy} onPress={() => search(preferences)} />
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

export function DatingProfileEditor({ life }: { life: Life }) {
  const { busy, dispatch } = useGame();
  const current = playerDatingProfile(life);
  const [profile, setProfile] = useState<DatingProfile>(current);
  const [expanded, setExpanded] = useState<keyof DatingProfile>();
  const { name, occupation, interests } = datingProfileIdentity(life);
  const issue = datingProfileIssue(life);
  const saved = !!life.social.datingProfile && profileFields.every(({ key }) => profile[key] === current[key]);
  return <>
    <View style={styles.identity}>
      <Portrait appearance={life.character.appearance} age={life.character.age} label="Your portrait" size={52} />
      <View style={styles.identityText}><Text style={shared.strong}>{name}</Text>
        <Text style={shared.small}>{en.age(life.character.age)} · {occupation} · {life.character.city}</Text></View>
    </View>
    {interests.length > 0 && <DataRow label="Your Interests" value={interests.join(', ')} />}
    {profileFields.map(({ key, label, options }) => <View key={key}>
      <ActionButton icon="options" label={label} detail={options.find(({ id }) => id === profile[key])?.label}
        disabled={!!issue} selected={expanded === key} onPress={() => setExpanded(expanded === key ? undefined : key)} />
      {expanded === key && <View style={styles.options}>{options.map(({ id, label: option }) =>
        <ActionButton key={id} icon={profile[key] === id ? 'accept' : 'options'} label={option} variant="plain"
          selected={profile[key] === id} onPress={() => {
            setProfile({ ...profile, [key]: id });
            setExpanded(undefined);
          }} />)}</View>}
    </View>)}
    {issue && <Text style={shared.small}>{issue}</Text>}
    <ActionButton icon="accept" label={saved ? 'Profile Saved' : 'Save Profile'} variant="primary"
      disabled={busy || !!issue || saved} onPress={() => void dispatch({ type: 'dating-profile', profile })} />
  </>;
}

const styles = StyleSheet.create({
  netWorth: { paddingHorizontal: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  options: { gap: space.xs, padding: space.xs, borderRadius: radius.sm, backgroundColor: colors.paper },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  identityText: { flex: 1 },
});
