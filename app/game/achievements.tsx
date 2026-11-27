import { router } from 'expo-router';
import { AchievementsContent } from '../../src/components/achievements';

export default function GameAchievements() {
  return <AchievementsContent inGame back={() => router.dismissTo('/game/menu')} />;
}
