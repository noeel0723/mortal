import { ActionButton, Feedback, Heading, Page, Section } from './ui';
import { useGame } from '../stores/game';

export function SettingsContent({ inGame = false, back }: { inGame?: boolean; back: () => void }) {
  const { ready, busy, haptics, problem, toggleHaptics } = useGame();
  return (
    <Page inGame={inGame}>
      <Heading title="Settings" back={back} />
      <Section title="Gameplay" detail="Feel a light tap when a year advances on supported devices.">
        <ActionButton icon="phone" label={haptics ? 'Turn Haptics Off' : 'Turn Haptics On'} disabled={!ready || busy}
          onPress={() => void toggleHaptics()} />
      </Section>
      {!inGame && <Feedback error={problem} />}
    </Page>
  );
}
