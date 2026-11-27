import { router } from 'expo-router';
import { ActionButton, DataRow, Heading, Page, Section } from '../../src/components/ui';
import { backgroundLabels, talentLabels } from '../../src/data/veyra';
import { stats } from '../../src/engine/types';
import { statLabels } from '../../src/i18n/en';
import { useGame } from '../../src/stores/game';

export default function Statistics() {
  const character = useGame((state) => state.slot?.life.character);
  if (!character) return null;
  return (
    <Page inGame>
      <Heading title="Life Statistics" subtitle={`${character.firstName} ${character.lastName}`} back={() => router.dismissTo('/game')} />
      <Section title="Personal Growth"><ActionButton icon="study" label="My Skills" onPress={() => router.push('/game/skills')} /></Section>
      <Section title="Attributes">
        {stats.map((stat) => <DataRow label={statLabels[stat]} value={`${character.attributes[stat]}%`} key={stat} />)}
      </Section>
      <Section title="Background">
        <DataRow label="Personality" value={character.personality} />
        <DataRow label="Natural talent" value={character.talent ? talentLabels[character.talent] : 'None'} />
        <DataRow label="Family background" value={backgroundLabels[character.background]} />
      </Section>
    </Page>
  );
}
