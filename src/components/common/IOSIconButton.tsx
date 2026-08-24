import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Icon } from './Icon';
import { useTheme } from '../../theme';
import { NativeGlass } from './NativeGlass';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  symbol: SFSymbol;
  onPress: () => void;
  accessibilityLabel: string;
  selected?: boolean;
  /** Buttons floating over the camera or a stereo pair stay light-on-dark. */
  overMedia?: boolean;
  /** Optional contrast colour for controls over a changing camera feed. */
  color?: string;
  style?: ViewStyle;
};

export function IOSIconButton({
  symbol,
  onPress,
  accessibilityLabel,
  selected = false,
  overMedia = false,
  color,
  style,
}: Props) {
  const { palette } = useTheme();

  const tint = color ?? (selected
    ? palette.blue
    : overMedia
    ? '#FFFFFF'
    : palette.label);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      hitSlop={8}
      onPress={() => {
        hapticFeedback.light();
        onPress();
      }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, style]}
    >
      <NativeGlass
        interactive
        overMedia={overMedia}
        tintColor={selected ? 'rgba(10,132,255,0.28)' : undefined}
        style={styles.surface}
      >
        <Icon
          name={symbol}
          color={tint}
          size={18}
          weight="semibold"
          style={styles.symbol}
        />
      </NativeGlass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 44,
    height: 44,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  surface: {
    flex: 1,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    width: 22,
    height: 22,
  },
});
