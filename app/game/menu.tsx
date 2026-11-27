import { router } from 'expo-router';
import { ActionButton, Heading, Page, Section } from '../../src/components/ui';
import { useGame } from '../../src/stores/game';

export default function LifeMenu() {
  const { busy, save, clearMessage } = useGame();
  return (
    <Page inGame>
      <Heading title="Life Menu" back={() => { clearMessage(); router.dismissTo('/game'); }} />
      <Section title="This life" detail="Progress is saved automatically after every action.">
        <ActionButton icon="save" label="Save Life" disabled={busy} onPress={() => void save()} />
        <ActionButton icon="trophy" label="Achievements" onPress={() => { clearMessage(); router.push('/game/achievements'); }} />
        <ActionButton icon="settings" label="Settings" onPress={() => { clearMessage(); router.push('/game/settings'); }} />
      </Section>
      <ActionButton icon="home" label="Return to Main Menu" disabled={busy} onPress={() => { clearMessage(); router.dismissTo('/'); }} />
    </Page>
  );
}
