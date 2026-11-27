import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Portrait } from '../../src/components/portrait';
import { ActionButton, DataRow, Heading, Page, Section, shared } from '../../src/components/ui';
import { romanceLabels } from '../../src/engine/love';
import { findContact } from '../../src/engine/school';
import type { Contact } from '../../src/engine/types';
import { datingCandidates, datingSummary, meetingControls, relationshipGroups, socialRole } from '../../src/socialView';
import { useGame } from '../../src/stores/game';

export default function LoveLife() {
  const { screen } = useLocalSearchParams<{ screen?: string }>();
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const { life } = slot;
  const row = (person: Contact, detail?: string) => <ActionButton key={person.id} icon="person" label={person.name}
    detail={detail ?? socialRole(life, person)} leading={<Portrait appearance={person.appearance} age={person.age} size={36} />}
    onPress={() => router.push({ pathname: '/game/person', params: { id: person.id, source: 'love' } })} />;
  const back = () => screen && router.canGoBack() ? router.back() : router.dismissTo('/game/relationships');

  if (screen === 'profiles') {
    const people = datingCandidates(life);
    return <Page inGame><Heading title="Dating Profiles" back={back} />
      <Section title="People you know">{people.length ? people.map((person) => row(person, datingSummary(life, person))) :
        <Text style={shared.body}>There are no available matches yet.</Text>}</Section></Page>;
  }
  if (screen === 'history') return <Page inGame><Heading title="Relationship History" back={back} />
    {life.social.romances.length ? life.social.romances.map((entry) => {
      const person = findContact(life, entry.person)!;
      return <Section key={entry.person} title={person.name}>
        {row(person, `${romanceLabels[entry.status]} · Since ${entry.started}`)}
        {entry.history.map(({ year, text }, index) => <DataRow key={index} label={String(year)} value={text} />)}
      </Section>;
    }) : <Text style={shared.body}>Your relationship history is empty.</Text>}</Page>;

  const { partners } = relationshipGroups(life);
  return <Page inGame>
    <Heading title="Love Life" back={back} />
    {partners.length > 0 && <Section title={partners.length === 1 ? 'Current Partner' : 'Current Partners'}>
      {partners.map((person) => row(person))}
    </Section>}
    <Section title="Dating">
      {meetingControls(life, true).map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label}
        detail={item.issue ?? item.detail} disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />)}
      <ActionButton icon="support" label="Ask Someone Out" disabled={life.character.age < 18}
        onPress={() => router.push({ pathname: '/game/love-life', params: { screen: 'profiles' } })} />
      <ActionButton icon="history" label="Relationship History"
        onPress={() => router.push({ pathname: '/game/love-life', params: { screen: 'history' } })} />
    </Section>
  </Page>;
}
