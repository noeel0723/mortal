import { router } from 'expo-router';
import { SettingsContent } from '../../src/components/settings';

export default function GameSettings() {
  return <SettingsContent inGame back={() => router.dismissTo('/game/menu')} />;
}
