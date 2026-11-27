import { router } from 'expo-router';
import { Text } from 'react-native';
import { ActionButton, Heading, Page, Section, shared } from '../../src/components/ui';
import { patientRows } from '../../src/healthView';
import { useGame } from '../../src/stores/game';

export default function Doctor() {
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const patients = patientRows(slot.life);

  return <Page inGame>
    <Heading title="Doctor" back={() => router.dismissTo('/game/activities')} />
    <Section title="Patients">
      {patients.length ? patients.map((patient) => <ActionButton key={patient.id} icon="medical"
        label={patient.self ? 'Treat Yourself' : `Take ${patient.name} to the Doctor`}
        detail={`${patient.condition} · ${patient.fee}${patient.issue ? ` · ${patient.issue}` : ''}`}
        disabled={busy || !!patient.issue} onPress={() => void dispatch({ type: 'doctor', patient: patient.id })} />) :
        <Text style={shared.body}>You and your family and friends have no active illnesses.</Text>}
    </Section>
  </Page>;
}
