import React from 'react';
import { View, Text, StyleSheet, TextStyle } from 'react-native';
import { colors } from '../theme/colors';

/** Renders the small Markdown subset the assistant uses: paragraphs, "-" bullets and **bold**. */
const inline = (text: string, base: TextStyle) =>
  text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <Text key={i} style={[base, styles.bold]}>{part.slice(2, -2)}</Text>
      : <Text key={i} style={base}>{part}</Text>
  );

export const RichText: React.FC<{ text: string; color?: string }> = ({ text, color = colors.onSurface }) => {
  const base: TextStyle = { ...styles.text, color };
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').map((raw, i) => {
        const line = raw.trimEnd();
        if (!line.trim()) return null;
        const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
        if (m) {
          return (
            <View key={i} style={styles.bulletRow}>
              <Text style={[base, { width: 14 }]}>•</Text>
              <Text style={[base, { flex: 1 }]}>{inline(m[1], base)}</Text>
            </View>
          );
        }
        return <Text key={i} style={base}>{inline(line.replace(/^#{1,6}\s+/, ''), base)}</Text>;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  text: { fontFamily: 'Inter_500Medium', fontSize: 14, lineHeight: 21 },
  bold: { fontFamily: 'Inter_700Bold' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start' },
});
