import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { SymbolView, SFSymbol } from 'expo-symbols';
import { NativeGlass } from './NativeGlass';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  symbol: SFSymbol;
  onPress: () => void;
  accessibilityLabel: string;
  selected?: boolean;
  style?: ViewStyle;
};

export function IOSIconButton({
  symbol,
  onPress,
  accessibilityLabel,
  selected = false,
  style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        hapticFeedback.light();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pressable,
        pressed && styles.pressed,
        style,
      ]}
    >
      <NativeGlass
        interactive
        tintColor={selected ? 'rgba(10,132,255,0.32)' : undefined}
        style={[styles.surface, selected && styles.selected]}
      >
        <SymbolView
          name={symbol}
          tintColor="#FFFFFF"
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
  selected: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120,190,255,0.55)',
  },
  symbol: {
    width: 22,
    height: 22,
  },
});
