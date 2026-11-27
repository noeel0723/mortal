import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { lifestyleActivities, mindAndBodyActivities, socialActivities, type ActivityControl } from '../../src/activityView';
import { canEditFace } from '../../src/engine/appearance';
import { activitySkillCategories } from '../../src/skillView';
import { datingControls } from '../../src/socialView';
import { useGame } from '../../src/stores/game';

export default function Activities() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;

  function action(item: ActivityControl) {
    return (
      <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
        disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />
    );
  }

  if (screen === 'love' || screen === 'mind-body') {
    const love = screen === 'love';
    return (
      <Page inGame>
        <Heading title={love ? 'Love' : 'Mind & Body'}
          back={() => router.canGoBack() ? router.back() : router.replace('/game/activities')} />
        <Section title={love ? 'Dating' : 'Wellbeing Activities'}>
          {(love ? datingControls(life) : mindAndBodyActivities(life)).map(action)}
        </Section>
      </Page>
    );
  }

  return (
    <Page inGame>
      <Heading title="Activities" back={() => router.dismissTo('/game')} />
      <Section title="Love">
        <ActionButton icon="health" label="Love" detail="Meet people and find a date."
          onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'love' } })} />
      </Section>
      <Section title="Healthcare">
        <ActionButton icon="medical" label="Doctors" detail="Browse healthcare services." onPress={() => router.push('/game/doctor')} />
      </Section>
      {!life.character.causeOfDeath && <Section title="Appearance">
        <ActionButton icon="hair" label={canEditFace(life.character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
          onPress={() => router.push('/game/appearance')} />
      </Section>}
      <Section title="Wellbeing">
        <ActionButton icon="meditation" label="Mind & Body" detail="Rest, exercise, and build healthy habits."
          onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'mind-body' } })} />
      </Section>
      <Section title="Skill Training">
        {activitySkillCategories.map(({ category, label, icon }) => <ActionButton key={category} icon={icon} label={label}
          onPress={() => router.push({ pathname: '/game/skills', params: { category } })} />)}
      </Section>
      <Section title="Entertainment">{lifestyleActivities(life, 'Entertainment').map(action)}</Section>
      <Section title="Social Activities">{socialActivities(life).map(action)}</Section>
      <Section title="Travel">{lifestyleActivities(life, 'Travel').map(action)}</Section>
    </Page>
  );
}
