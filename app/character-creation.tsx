import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ActionButton, DataRow, Feedback, Heading, Page, Section, shared } from '../src/components/ui';
import { PortraitEditor } from '../src/components/portrait';
import { backgrounds, backgroundLabels, cities, country, defaultBirthYear, genders, genderLabels, talents, talentLabels } from '../src/data/veyra';
import type { ProfileInput } from '../src/engine/types';
import { creationAppearance } from '../src/engine/appearance';
import { useGame } from '../src/stores/game';
import { colors, radius, space } from '../src/theme/tokens';

function Choices<T extends string>({ options, label, value, select }: {
  options: readonly T[]; label: (choice: T) => string; value: T; select: (choice: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((choice) => <ActionButton key={choice} icon={choice === value ? 'accept' : 'options'}
        label={label(choice)} selected={choice === value} onPress={() => select(choice)} />)}
    </View>
  );
}

export default function CharacterCreation() {
  const [profile, setProfile] = useState<ProfileInput>({
    firstName: '', lastName: '', gender: 'nonbinary', country, city: 'Alder Bay',
    background: 'middle-income', birthYear: defaultBirthYear, talent: null,
  });
  const [year, setYear] = useState(String(defaultBirthYear));
  const [appearance, setAppearance] = useState(creationAppearance);
  const { start, ready, busy, problem, clearMessage } = useGame();
  function change<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    clearMessage();
    setProfile((previous) => ({ ...previous, [key]: value }));
  }
  async function begin() {
    if (await start({ ...profile, appearance, birthYear: /^\d{4}$/.test(year) ? Number(year) : NaN })) router.dismissTo('/game');
  }
  return (
    <Page>
      <Heading title="Custom Life" subtitle="The circumstances of your birth." back={() => { clearMessage(); router.dismissTo('/new-life'); }} />
      <Section title="Identity">
        <Text style={shared.small}>First name</Text>
        <TextInput accessibilityLabel="First name" autoCapitalize="words" maxLength={28} value={profile.firstName}
          onChangeText={(text) => change('firstName', text)} placeholder="First name" placeholderTextColor={colors.secondary} style={styles.input} />
        <Text style={shared.small}>Last name</Text>
        <TextInput accessibilityLabel="Last name" autoCapitalize="words" maxLength={28} value={profile.lastName}
          onChangeText={(text) => change('lastName', text)} placeholder="Last name" placeholderTextColor={colors.secondary} style={styles.input} />
        <Text style={shared.small}>Gender identity</Text>
        <Choices options={genders} label={(gender) => genderLabels[gender]} value={profile.gender} select={(gender) => change('gender', gender)} />
      </Section>
      <Section title="Birthplace">
        <DataRow label="Country" value="Veyra" />
        <Choices options={cities} label={(city) => city} value={profile.city} select={(city) => change('city', city)} />
        <Text style={shared.small}>Birth year</Text>
        <TextInput accessibilityLabel="Birth year" keyboardType="number-pad" value={year} maxLength={4}
          onChangeText={(text) => { clearMessage(); setYear(text); }} style={styles.input} />
      </Section>
      <Section title="Family background">
        <Choices options={backgrounds} label={(background) => backgroundLabels[background]} value={profile.background} select={(background) => change('background', background)} />
      </Section>
      <Section title="Natural talent">
        <Choices options={['none', ...talents]} label={(talent) => talent === 'none' ? 'None' : talentLabels[talent]}
          value={profile.talent ?? 'none'} select={(talent) => change('talent', talent === 'none' ? null : talent)} />
      </Section>
      <Section title="Appearance"><PortraitEditor appearance={appearance} age={0} hairOnly={false} onChange={setAppearance} /></Section>
      <Feedback error={problem} />
      <ActionButton icon="new" label="Begin Life" variant="primary" disabled={!ready || busy} onPress={() => void begin()} />
    </Page>
  );
}

const styles = StyleSheet.create({
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  input: { width: '100%', minHeight: 48, color: colors.ink, fontSize: 16, paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
});
