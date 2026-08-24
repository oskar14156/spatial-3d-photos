import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { type Palette, spring, type, useThemedStyles } from '../../theme';
import { hapticFeedback } from '../../utils/haptics';

export type SegmentedItem<T extends string> = {
  id: T;
  label: string;
};

type Props<T extends string> = {
  items: SegmentedItem<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

const PADDING = 2;

/**
 * UISegmentedControl-alike: an inset track with a single sliding selection
 * pill. The pill animates on the UI thread so switching modes never stutters
 * behind a heavy viewer re-render.
 */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  accessibilityLabel,
}: Props<T>) {
  const styles = useThemedStyles(createStyles);
  const [trackWidth, setTrackWidth] = useState(0);
  const offset = useSharedValue(0);

  const segmentWidth =
    items.length > 0 ? (trackWidth - PADDING * 2) / items.length : 0;
  const selectedIndex = Math.max(0, items.findIndex((item) => item.id === value));

  React.useEffect(() => {
    offset.value = withSpring(selectedIndex * segmentWidth, spring);
  }, [offset, segmentWidth, selectedIndex]);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const pillStyle = useAnimatedStyle(() => ({
    width: segmentWidth,
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={styles.track}
      onLayout={onLayout}
    >
      {segmentWidth > 0 && <Animated.View style={[styles.pill, pillStyle]} />}

      {items.map((item) => {
        const selected = item.id === value;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (selected) return;
              hapticFeedback.selection();
              onChange(item.id);
            }}
            style={styles.segment}
          >
            <Text
              numberOfLines={1}
              style={[styles.label, selected && styles.labelSelected]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  track: {
    height: 34,
    flexDirection: 'row',
    borderRadius: 9,
    padding: PADDING,
    backgroundColor: palette.fillSubtler,
  },
  pill: {
    position: 'absolute',
    top: PADDING,
    left: PADDING,
    bottom: PADDING,
    borderRadius: 7,
    backgroundColor: 'rgb(99,99,102)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  label: {
    ...type.footnote,
    fontWeight: '500',
    color: palette.labelSecondary,
  },
  labelSelected: {
    color: palette.label,
    fontWeight: '600',
  },
});
