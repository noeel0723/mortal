import { router } from 'expo-router';
import { AchievementsContent } from '../src/components/achievements';

export default function Achievements() {
  return <AchievementsContent back={() => router.dismissTo('/')} />;
}
