import { router } from 'expo-router';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { personalActivities } from '../../src/activityView';
import { activityIssue } from '../../src/engine/simulation';
import { canEditFace } from '../../src/engine/appearance';
import { useGame } from '../../src/stores/game';

export default function Activities() {
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;

  function action(item: typeof personalActivities[number]) {
    const issue = activityIssue(life, item.id);
    return (
      <ActionButton key={item.id} icon={item.icon} label={item.label} detail={issue ?? item.description}
        disabled={!!issue || busy || !!life.pending || !!life.character.causeOfDeath} onPress={() => void dispatch({ type: 'activity', activity: item.id })} />
    );
  }

  return (
    <Page inGame>
      <Heading title="Activities" back={() => router.dismissTo('/game')} />
      <Section title="Health">
        <ActionButton icon="medical" label="Doctors" detail="Browse healthcare services." onPress={() => router.push('/game/doctor')} />
        {personalActivities.slice(1).map(action)}
      </Section>
      <Section title="Personal Development">{personalActivities.slice(0, 1).map(action)}</Section>
      {!life.character.causeOfDeath && <Section title="Appearance">
        <ActionButton icon="hair" label={canEditFace(life.character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
          onPress={() => router.push('/game/appearance')} />
      </Section>}
    </Page>
  );
}
