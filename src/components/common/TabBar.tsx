import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { type Palette, spring, type, useTheme, useThemedStyles } from '../../theme';
import { hapticFeedback } from '../../utils/haptics';
import { NativeGlass } from './NativeGlass';

export type TabId = 'studio' | 'library';

type Props = {
  active: TabId;
  onChange: (tab: TabId) => void;
  onCapture: () => void;
  tabs: { id: TabId; label: string; symbol: SFSymbol }[];
  captureLabel: string;
};

/**
 * Floating glass tab bar with the capture action raised into the middle.
 *
 * Capture is the app's one destructive-of-attention action — it takes over the
 * screen — so it reads as a button rather than a destination, and sits apart
 * from the two tabs it interrupts.
 */
export function TabBar({ active, onChange, onCapture, tabs, captureLabel }: Props) {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  const scale = useSharedValue(1);
  const captureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <NativeGlass interactive style={styles.bar}>
        <Tab
          item={tabs[0]}
          active={active === tabs[0].id}
          onPress={() => onChange(tabs[0].id)}
        />

        <Animated.View style={captureStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={captureLabel}
            onPressIn={() => {
              scale.value = withSpring(0.92, spring);
            }}
            onPressOut={() => {
              scale.value = withSpring(1, spring);
            }}
            onPress={() => {
              hapticFeedback.medium();
              onCapture();
            }}
            style={styles.capture}
          >
            <SymbolView
              name="camera.fill"
              size={22}
              weight="semibold"
              tintColor={palette.onAccent}
              style={styles.captureGlyph}
            />
          </Pressable>
        </Animated.View>

        <Tab
          item={tabs[1]}
          active={active === tabs[1].id}
          onPress={() => onChange(tabs[1].id)}
        />
      </NativeGlass>
    </View>
  );
}

function Tab({
  item,
  active,
  onPress,
}: {
  item: { id: TabId; label: string; symbol: SFSymbol };
  active: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={() => {
        if (active) return;
        hapticFeedback.selection();
        onPress();
      }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
    >
      <SymbolView
        name={item.symbol}
        size={19}
        weight={active ? 'semibold' : 'regular'}
        tintColor={active ? palette.blue : palette.labelSecondary}
        style={styles.tabGlyph}
      />
      <Text
        numberOfLines={1}
        style={[styles.tabLabel, active && { color: palette.blue }]}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
    },
    bar: {
      height: 66,
      borderRadius: 33,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 6 },
    },
    tab: {
      width: 84,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    tabGlyph: { width: 22, height: 22 },
    tabLabel: {
      ...type.caption,
      fontSize: 11,
      fontWeight: '600',
      color: palette.labelSecondary,
    },
    capture: {
      width: 58,
      height: 54,
      borderRadius: 27,
      backgroundColor: palette.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    captureGlyph: { width: 26, height: 26 },
    pressed: { opacity: 0.6 },
  });
