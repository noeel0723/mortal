import { router } from 'expo-router';
import { DataRow, Heading, Page, Section } from '../../src/components/ui';
import { cities, cityDescriptions } from '../../src/data/veyra';
import { en } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';

export default function World() {
  const life = useGame((state) => state.slot?.life);
  if (!life) return null;
  return (
    <Page inGame>
      <Heading title="World" subtitle={en.worldNotice} back={() => router.dismissTo('/game')} />
      <Section title="Veyra">
        <DataRow label="Simulation year" value={life.year} />
        <DataRow label="Your city" value={life.character.city} />
      </Section>
      {cities.map((city) => <Section key={city} title={city} detail={cityDescriptions[city]} />)}
    </Page>
  );
}
