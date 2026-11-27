import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DetailMeter, DetailModal } from '../../src/components/detailModal';
import { ActionButton, Feedback, Heading, Page, Section, shared } from '../../src/components/ui';
import type { HealthService } from '../../src/engine/healthTypes';
import { careSections, careSelection, careServices } from '../../src/healthView';
import { useGame } from '../../src/stores/game';
import { colors, emoji, radius, space } from '../../src/theme/tokens';

export default function Doctor() {
  const { slot, busy, problem, dispatch, clearMessage } = useGame();
  const [selection, setSelection] = useState<{ service: HealthService; patient?: string }>();
  if (!slot) return null;
  const { life } = slot;
  const care = careSelection(life, selection);

  function appointment() {
    if (!care || life.pending || life.notices.length) return null;
    const { service, info, patients, patient, options, empty, prompt, sharedIssue } = care;
    return <DetailModal open title={info.title} onDismiss={() => { if (!busy) setSelection(undefined); }}>
      <Text style={styles.category}>{emoji[info.icon]} Healthcare</Text>
      <Text style={shared.body}>{prompt}</Text>
      {patient && <View style={styles.patient}>
        {patients.length > 1 ? <Section title="Patient">
          {patients.map(({ id, name }) => <ActionButton key={id} label={name} icon="person" selected={patient.id === id}
            disabled={busy} onPress={() => setSelection({ service, patient: id })} />)}
        </Section> : <Text style={shared.strong}>{patient.name}</Text>}
        <Text style={shared.small}>{patient.condition}</Text>
      </View>}
      {service === 'doctor' && patient?.level === 'severe' && <Text style={shared.small}>Successful treatment reduces a severe illness to moderate.</Text>}
      {!empty && sharedIssue && <Text style={shared.small}>{sharedIssue}</Text>}
      {options.map((option) => <View key={option.label} style={styles.option}>
        <ActionButton label={option.label} icon={info.icon} detail={option.fee} disabled={busy || !!option.issue}
          onPress={() => void dispatch({ type: 'healthcare', visit: option.visit }).then((ok) => { if (ok) setSelection(undefined); })} />
        {option.reputation !== undefined && <DetailMeter label="Reputation" value={option.reputation} />}
        {option.chance !== undefined && <Text style={shared.small}>{option.chance}% treatment success</Text>}
        {!empty && !sharedIssue && option.issue && <Text style={shared.small}>{option.issue}</Text>}
      </View>)}
      <Feedback error={problem} />
    </DetailModal>;
  }

  return <Page inGame>
    <Heading title="Doctors" back={() => router.dismissTo('/game/activities')} />
    {careSections.map(({ title, services }) => <Section key={title} title={title}>
      {services.map((id) => <ActionButton key={id} label={careServices[id].title} icon={careServices[id].icon}
        detail={careServices[id].detail} onPress={() => { clearMessage(); setSelection({ service: id }); }} />)}
    </Section>)}
    {appointment()}
  </Page>;
}

const styles = StyleSheet.create({
  category: { ...shared.strong, color: colors.action },
  patient: { gap: space.xs, padding: space.sm, backgroundColor: colors.softBlue, borderRadius: radius.sm },
  option: { gap: space.xs, padding: space.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md },
});
