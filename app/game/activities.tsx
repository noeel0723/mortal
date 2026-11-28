import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Portrait } from '../../src/components/portrait';
import { DatingOptions, DatingProfileEditor } from '../../src/components/datingOptions';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { lifestyleActivities, mindAndBodyActivities, socialActivities, type ActivityControl } from '../../src/activityView';
import { canEditFace } from '../../src/engine/appearance';
import { intimacyGuests, intimacyIssue } from '../../src/engine/intimacy';
import { activitySkillCategories } from '../../src/skillView';
import { datingControls, socialRole } from '../../src/socialView';
import { useGame } from '../../src/stores/game';

export default function Activities() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const { slot, busy, dispatch } = useGame();
  const [selected, select] = useState<string>();
  if (!slot) return null;
  const life = slot.life;

  function action(item: ActivityControl) {
    return (
      <ActionButton key={item.label} icon={item.icon} label={item.label} compactDetail detail={item.issue ?? item.detail}
        disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />
    );
  }

  if (screen === 'dating-profile') return <Page inGame>
    <Heading title="Dating Profile" back={() => router.canGoBack() ? router.back() :
      router.replace({ pathname: '/game/activities', params: { screen: 'love' } })} />
    <DatingProfileEditor life={life} />
  </Page>;

  if (screen === 'threesome') {
    const candidates = intimacyGuests(life);
    const first = candidates.find(({ id }) => id === selected);
    const issue = intimacyIssue(life, { encounter: 'threesome' });
    return <Page inGame>
      <Heading title="Threesome" back={() => router.canGoBack() ? router.back() :
        router.replace({ pathname: '/game/activities', params: { screen: 'love' } })} />
      <Section title={first ? 'Choose Second Guest' : 'Choose First Guest'} detail={life.pending ? undefined : issue ?? undefined}>
        {first && <ActionButton icon="person" label="Change First Guest" detail={first.name} disabled={busy} onPress={() => select(undefined)} />}
        {(first ? intimacyGuests(life, first) : candidates).map((person) =>
          <ActionButton key={person.id} icon="person" label={person.name} detail={socialRole(life, person)}
            leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
            disabled={busy || !!issue} onPress={() => {
              if (!first) select(person.id);
              else void dispatch({ type: 'intimacy', encounter: 'threesome', first: first.id, second: person.id })
                .then((success) => { if (success) select(undefined); });
            }} />)}
      </Section>
    </Page>;
  }

  if (screen === 'love' || screen === 'mind-body') {
    const love = screen === 'love';
    const groupIssue = love ? intimacyIssue(life, { encounter: 'threesome' }) : null;
    return (
      <Page inGame>
        <Heading title={love ? 'Love' : 'Mind & Body'}
          back={() => router.canGoBack() ? router.back() : router.replace('/game/activities')} />
        <Section title={love ? 'Dating' : 'Wellbeing Activities'}>
          {love ? <DatingOptions life={life} controls={datingControls(life)} /> : mindAndBodyActivities(life).map(action)}
          {love && <ActionButton icon="classroom" label="Threesome" compactDetail detail={groupIssue ?? 'Invite two adults'}
            disabled={busy || !!groupIssue}
            onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'threesome' } })} />}
        </Section>
        {love && <Section title="Your Profile">
          <ActionButton icon="person" label="Dating Profile" detail="Edit your dating preferences"
            onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'dating-profile' } })} />
          <ActionButton icon="loveLetter" label="My Love Life" detail="See your matches and partners"
            onPress={() => router.push({ pathname: '/game/love-life', params: { source: 'activities' } })} />
        </Section>}
      </Page>
    );
  }

  return (
    <Page inGame>
      <Heading title="Activities" back={() => router.dismissTo('/game')} />
      <Section title="Love">
        <ActionButton icon="health" label="Love" compactDetail detail="Meet someone new"
          onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'love' } })} />
      </Section>
      <Section title="Healthcare">
        <ActionButton icon="medical" label="Doctors" compactDetail detail="Get medical care" onPress={() => router.push('/game/doctor')} />
        <ActionButton icon="adoption" label="Adoption" compactDetail detail="Meet children available for adoption"
          onPress={() => router.push({ pathname: '/game/personal-care', params: { screen: 'adoption' } })} />
        <ActionButton icon="surgery" label="Plastic Surgery" compactDetail detail="Browse cosmetic procedures"
          onPress={() => router.push({ pathname: '/game/personal-care', params: { screen: 'plastic-surgery' } })} />
      </Section>
      {!life.character.causeOfDeath && <Section title="Appearance">
        <ActionButton icon="hair" label={canEditFace(life.character.age) ? 'Customize Appearance' : 'Change Hairstyle'}
          onPress={() => router.push('/game/appearance')} />
        <ActionButton icon="hat" label="Accessories" compactDetail detail="Try hats and glasses"
          onPress={() => router.push({ pathname: '/game/personal-care', params: { screen: 'accessories' } })} />
      </Section>}
      <Section title="Wellbeing">
        <ActionButton icon="meditation" label="Mind & Body" compactDetail detail="Rest, exercise, and unwind"
          onPress={() => router.push({ pathname: '/game/activities', params: { screen: 'mind-body' } })} />
      </Section>
      <Section title="Social Activities">{socialActivities(life).map(action)}</Section>
      <Section title="Skill Training">
        {activitySkillCategories.map(({ category, label, icon }) => <ActionButton key={category} icon={icon} label={label}
          onPress={() => router.push({ pathname: '/game/skills', params: { category } })} />)}
      </Section>
      <Section title="Finance">
        <ActionButton icon="work" label="Loans & Debts" compactDetail detail="Review loans and repayments"
          onPress={() => router.push({ pathname: '/game/wealth', params: { screen: 'loans' } })} />
      </Section>
      <Section title="Travel">{lifestyleActivities(life, 'Travel').map(action)}</Section>
    </Page>
  );
}
