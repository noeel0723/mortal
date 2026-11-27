import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/tokens';

export function BrandMark({ large = false }: { large?: boolean }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.mark, large && styles.large]}>
      <Text style={[styles.letter, large && styles.largeLetter]}>M</Text>
      <View style={[styles.dot, large && styles.largeDot]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { width: 33, height: 33, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action },
  large: { width: 68, height: 68, borderRadius: 20 },
  letter: { color: colors.white, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -1.5, marginRight: 2 },
  largeLetter: { fontSize: 41, lineHeight: 50, letterSpacing: -3, marginRight: 3 },
  dot: { position: 'absolute', right: 5, top: 7, width: 4, height: 4, borderRadius: 2, backgroundColor: '#9DCFFF' },
  largeDot: { right: 10, top: 15, width: 7, height: 7, borderRadius: 4 },
});
