import { router, useLocalSearchParams } from 'expo-router';
import { ActionButton, DataRow, Heading, Page, Section } from '../../src/components/ui';
import { Portrait } from '../../src/components/portrait';
import { isSocialPage, localSocialGroups, localSocialTitle } from '../../src/localSocialView';
import { useGame } from '../../src/stores/game';

export default function LocalSocial() {
  const { screen, detail } = useLocalSearchParams<{ screen?: string; detail?: string }>();
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const life = slot.life;
  const page = screen && isSocialPage(screen) ? screen : 'neighborhood';
  return <Page inGame>
    <Heading title={localSocialTitle(life, page, detail)}
      back={() => router.canGoBack() ? router.back() : router.dismissTo('/game/activities')} />
    {localSocialGroups(life, page, detail).map((group) => <Section key={group.title} title={group.title}>
      {group.rows.map(({ key, label, icon, detail, issue, person, route, action }) => !route && !action && !person ?
        <DataRow key={key ?? label} label={label} value={detail ?? ''} /> :
        <ActionButton key={key ?? label} label={label} icon={icon ?? 'person'} compactDetail detail={issue ?? detail}
          leading={person && <Portrait appearance={person.appearance} age={person.age} size={42} label={`Portrait of ${person.name}`} />}
          disabled={busy || !!issue || (!route && !action)} onPress={() => {
            if (action) void dispatch(action);
            if (route?.page === 'person') router.push({ pathname: '/game/person', params: { id: route.detail, source: 'local-social' } });
            else if (route) router.push({ pathname: '/game/social', params: { screen: route.page, detail: route.detail } });
          }} />)}
    </Section>)}
  </Page>;
}
