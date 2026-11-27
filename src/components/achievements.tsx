import { DataRow, Heading, Page, Section } from './ui';
import { useGame } from '../stores/game';

export function AchievementsContent({ inGame = false, back }: { inGame?: boolean; back: () => void }) {
  const saves = useGame((state) => state.saves);
  const milestones = [
    { title: 'First Chapter', detail: 'Start a life', earned: saves.length > 0 },
    { title: 'School’s Out', detail: 'Reach high school graduation at 18', earned: saves.some((life) => life.age >= 18) },
    { title: 'Half a Century', detail: 'Reach age 50', earned: saves.some((life) => life.age >= 50) },
    { title: 'A Life Lived', detail: 'Complete a life', earned: saves.some((life) => life.completed) },
  ];
  return (
    <Page inGame={inGame}>
      <Heading title="Achievements" subtitle="Milestones across your saved lives." back={back} />
      {milestones.map((item) => (
        <Section key={item.title} title={item.title}><DataRow label={item.detail} value={item.earned ? 'Earned' : 'Locked'} /></Section>
      ))}
    </Page>
  );
}
