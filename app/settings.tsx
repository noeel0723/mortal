import { router } from 'expo-router';
import { SettingsContent } from '../src/components/settings';

export default function Settings() {
  return <SettingsContent back={() => router.dismissTo('/')} />;
}
