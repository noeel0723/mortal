import { router, useLocalSearchParams } from 'expo-router';
import { DetailMeter } from '../../src/components/detailModal';
import { ActionButton, DataRow, Heading, Page, Section } from '../../src/components/ui';
import { isSkillId, skillCategories, skills } from '../../src/data/skills';
import { useGame } from '../../src/stores/game';
import { annualTrainingSummary, skillCategory, skillDetails, skillGroups } from '../../src/skillView';

export default function Skills() {
  const params = useLocalSearchParams<{ category?: string; skill?: string }>();
  const { slot, busy, dispatch } = useGame();
  if (!slot) return null;
  const { life } = slot;
  const category = skillCategory(params.category);
  const id = isSkillId(params.skill) ? params.skill : undefined;
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(category ? '/game/activities' : '/game/statistics');
  };
  if (!id) return <Page inGame>
    <Heading title={category ? skillCategories[category] : 'My Skills'} back={back} />
    <Section title="Training this year"><DataRow label="Sessions" value={annualTrainingSummary(life)} /></Section>
    {!category && life.skills.hobbies.length > 0 && <Section title="My Hobbies">
      {life.skills.hobbies.map((skill) => <ActionButton key={skill} label={skills[skill].name} icon={skills[skill].icon}
        onPress={() => router.push({ pathname: '/game/skills', params: { skill } })} />)}
    </Section>}
    {skillGroups(life, category).map(({ label, rows }) => <Section title={label} key={label}>
      {rows.map((row) => <ActionButton key={row.id} icon={row.icon} label={row.name} detail={`${row.detail} · ${row.proficiency}%`}
        onPress={() => router.push({ pathname: '/game/skills', params: { skill: row.id, ...(category ? { category } : {}) } })} />)}
    </Section>)}
  </Page>;
  const details = skillDetails(life, id);
  return <Page inGame>
    <Heading title={skills[id].name} back={back} />
    <Section title="Progress">
      <DetailMeter label="Proficiency" value={details.proficiency} />
      {details.rows.map(({ label, value }) => <DataRow key={label} label={label} value={value} />)}
    </Section>
    <Section title="Training">
      {details.controls.map((item) => <ActionButton key={item.label} icon={item.icon} label={item.label} detail={item.issue ?? item.detail}
        disabled={busy || !!item.issue} onPress={() => void dispatch(item.action)} />)}
    </Section>
    <Section title="Achievements">
      {details.achievements.map(({ label, value }) => <DataRow key={label} label={label} value={value} />)}
    </Section>
    <Section title="Hobby">
      <ActionButton icon={details.hobby.icon} label={details.hobby.label} detail={details.hobby.issue ?? undefined}
        disabled={busy || !!details.hobby.issue} onPress={() => void dispatch(details.hobby.action)} />
    </Section>
  </Page>;
}
