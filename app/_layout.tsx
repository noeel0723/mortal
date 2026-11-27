import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useGame } from '../src/stores/game';
import { colors } from '../src/theme/tokens';

export default function RootLayout() {
  const initialize = useGame((state) => state.initialize);
  useEffect(() => { void initialize(); }, [initialize]);
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }} />
    </>
  );
}
