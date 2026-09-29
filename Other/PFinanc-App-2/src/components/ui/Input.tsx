import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerStyle?: ViewStyle;
  prefix?: string; // e.g. '₹'
}

export function Input({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  containerStyle,
  prefix,
  style,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
      >
        {leftElement && <View style={styles.leftEl}>{leftElement}</View>}
        {prefix ? (
          <Text style={styles.prefix}>{prefix}</Text>
        ) : null}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.onSurfaceSubtle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightElement && <View style={styles.rightEl}>{rightElement}</View>}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: Spacing.xs },
  label: {
    ...Typography.labelMd,
    color: Colors.onSurface,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Spacing.buttonRadius,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  focused: {
    borderColor: Colors.borderFocus,
    borderWidth: 2,
  },
  errored: {
    borderColor: Colors.danger,
  },
  prefix: {
    ...Typography.bodyLg,
    color: Colors.onSurfaceMuted,
  },
  input: {
    flex: 1,
    ...Typography.bodyLg,
    color: Colors.onSurface,
    padding: 0,
  },
  leftEl: { marginRight: 2 },
  rightEl: { marginLeft: 2 },
  error: {
    ...Typography.labelSm,
    color: Colors.danger,
  },
  hint: {
    ...Typography.labelSm,
    color: Colors.onSurfaceMuted,
  },
});
