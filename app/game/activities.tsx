import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { activities, activityIssue } from '../../src/engine/simulation';
import { canEditFace } from '../../src/engine/appearance';
import { useGame } from '../../src/stores/game';
import type { Emoji } from '../../src/theme/tokens';

const items = [
  { id: 'walk', icon: 'walk', label: 'Take a Walk', description: 'Improves health and reduces stress.' },
  { id: 'rest', icon: 'rest', label: 'Rest', description: 'Restores energy and reduces stress.' },
  { id: 'read', icon: 'study', label: 'Read a Book', description: 'Improves smarts and happiness.' },
] as const satisfies readonly { id: keyof typeof activities; icon: Emoji; label: string; description: string }[];

export default function Activities() {
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;

  function action(item: typeof items[number]) {
    const issue = activityIssue(life, item.id);
    const cost = activities[item.id].energy;
    return (
      <View key={item.id} style={shared.group}>
        <ActionButton icon={item.icon} label={item.label} disabled={!!issue || busy || !!life.pending || !!life.character.causeOfDeath}
          onPress={() => void dispatch({ type: 'activity', activity: item.id })} />
        <Text style={shared.small}>{issue ?? `${item.description}${cost ? ` Uses ${cost} energy.` : ''}`}</Text>
      </View>
    );
  }

  return (
    <Page inGame>
      <Heading title="Activities" back={() => router.dismissTo('/game')} />
      <DataRow label="Energy" value={`${life.character.attributes.energy}%`} />
      <Section title="Health">
        <ActionButton icon="medical" label="Doctors" detail="Browse healthcare services." onPress={() => router.push('/game/doctor')} />
        {items.slice(0, 2).map(action)}
      </Section>
      <Section title="Personal Development">{items.slice(2).map(action)}</Section>
      {!life.character.causeOfDeath && <Section title="Appearance">
        <ActionButton icon="hair" label={canEditFace(life.character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
          onPress={() => router.push('/game/appearance')} />
      </Section>}
    </Page>
  );
}
