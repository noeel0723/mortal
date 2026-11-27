import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { appearanceOptions, faceFields, hairFields } from '../engine/appearance';
import type { Appearance } from '../engine/appearance';
import { portraitSrc } from '../portraits/portrait';
import { colors, radius, space } from '../theme/tokens';
import { shared } from './ui';

export function Portrait({ appearance, age, size = 44, label }: {
  appearance: Appearance; age: number; size?: number; label?: string;
}) {
  return <Image source={{ uri: portraitSrc(appearance, age) }} accessible={!!label} accessibilityLabel={label}
    style={[styles.portrait, { width: size, height: size }]} resizeMode="contain" fadeDuration={0} />;
}

export function PortraitEditor({ appearance, age, hairOnly, onChange }: {
  appearance: Appearance; age: number; hairOnly: boolean; onChange: (appearance: Appearance) => void;
}) {
  const fields = hairOnly ? hairFields : [...hairFields, ...faceFields];
  const birthPreview = !hairOnly && age === 0;
  return <View style={styles.editor}>
    <View style={styles.previews}>
      <View style={styles.preview}>
        <Portrait appearance={appearance} age={age} size={112} label="Portrait preview" />
        {birthPreview && <Text style={shared.small}>At birth</Text>}
      </View>
      {birthPreview && <View style={styles.preview}>
        <Portrait appearance={appearance} age={24} size={112} label="Adult portrait preview" />
        <Text style={shared.small}>As an adult</Text>
      </View>}
    </View>
    {fields.map((field) => {
      const { label, values } = appearanceOptions[field];
      return <View key={field} style={styles.options}>
        <Text style={shared.strong}>{label}</Text>
        <View style={styles.chips}>
          {values.map((value) => {
            const selected = appearance[field] === value;
            return <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${label}, ${value}`}
              accessibilityState={{ selected }} onPress={() => onChange({ ...appearance, [field]: value })}
              style={({ pressed }) => [styles.chip, (selected || pressed) && styles.selected]}>
              <Text style={styles.choice}>{value}</Text>
            </Pressable>;
          })}
        </View>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  portrait: { borderRadius: radius.md, backgroundColor: colors.softBlue },
  editor: { gap: space.lg },
  previews: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.md },
  preview: { alignItems: 'center', gap: space.xs },
  options: { gap: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.md,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  selected: { backgroundColor: colors.softBlue, borderColor: colors.action },
  choice: { color: colors.ink, fontSize: 14, fontWeight: '600' },
});
