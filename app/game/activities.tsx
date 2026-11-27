import { router } from 'expo-router';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { socialActivities, wellbeingActivities, type ActivityControl } from '../../src/activityView';
import { canEditFace } from '../../src/engine/appearance';
import { useGame } from '../../src/stores/game';

export default function Activities() {
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;

  function action(item: ActivityControl) {
    return (
      <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
        disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />
    );
  }

  return (
    <Page inGame>
      <Heading title="Activities" back={() => router.dismissTo('/game')} />
      <Section title="Health">
        <ActionButton icon="medical" label="Doctors" detail="Browse healthcare services." onPress={() => router.push('/game/doctor')} />
        {wellbeingActivities(life).map(action)}
      </Section>
      <Section title="Social Activities">{socialActivities(life).map(action)}</Section>
      {!life.character.causeOfDeath && <Section title="Appearance">
        <ActionButton icon="hair" label={canEditFace(life.character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
          onPress={() => router.push('/game/appearance')} />
      </Section>}
    </Page>
  );
}
