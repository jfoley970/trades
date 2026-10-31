import { Pressable, StyleSheet, Text, View } from 'react-native';
import { apiBaseUrl } from './api';
import { colors } from './theme';

export function Banner({ note }: { note: string }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Sign-in is not available yet</Text>
      <Text style={styles.bannerBody}>{note}</Text>
      <Text style={styles.bannerMeta}>API {apiBaseUrl()}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [styles.button, disabled && styles.buttonDisabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#E7F3F1',
    borderLeftColor: colors.tealBright,
    borderLeftWidth: 4,
    borderRadius: 12,
    padding: 14,
  },
  bannerTitle: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  bannerBody: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 20,
  },
  bannerMeta: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 8,
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: colors.cream,
    fontSize: 17,
    fontWeight: '700',
  },
});
