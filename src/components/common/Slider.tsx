import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { type Palette, type, useTheme, useThemedStyles } from '../../theme';

type Props = {
  label: string;
  /** Rendered on the trailing edge of the label row, e.g. `"+4 px"`. */
  valueLabel: string;
  value: number;
  min: number;
  max: number;
  /** Quantisation applied to the dragged value. */
  step: number;
  onChange: (value: number) => void;
  /** Draws the fill outward from this value instead of from `min`. */
  originValue?: number;
};

const TRACK_HEIGHT = 4;
const KNOB = 28;

/**
 * A continuous slider driven entirely on the UI thread. The knob follows the
 * finger through a shared value; JS only hears about quantised changes, which
 * keeps dragging smooth even while a stereo pair re-renders behind it.
 */
export function Slider({
  label,
  valueLabel,
  value,
  min,
  max,
  step,
  onChange,
  originValue,
}: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const travel = Math.max(0, width - KNOB);

  const fraction = useSharedValue(toFraction(value, min, max));
  const startFraction = useSharedValue(0);
  const active = useSharedValue(false);

  // Keep the knob in sync when the value is changed from outside (e.g. Reset).
  React.useEffect(() => {
    if (!active.value) fraction.value = toFraction(value, min, max);
  }, [active, fraction, max, min, value]);

  const emit = useCallback(
    (next: number) => {
      const quantised = Math.round(next / step) * step;
      const clamped = Math.min(max, Math.max(min, quantised));
      // Guard against re-emitting the same quantised step every frame.
      if (Math.abs(clamped - value) < step / 2) return;
      Haptics.selectionAsync().catch(() => {});
      onChange(Number(clamped.toFixed(4)));
    },
    [max, min, onChange, step, value]
  );

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin(() => {
      active.value = true;
      startFraction.value = fraction.value;
    })
    .onUpdate((event) => {
      if (travel <= 0) return;
      const next = startFraction.value + event.translationX / travel;
      fraction.value = Math.min(1, Math.max(0, next));
      runOnJS(emit)(min + fraction.value * (max - min));
    })
    .onFinalize(() => {
      active.value = false;
    });

  const tap = Gesture.Tap().onEnd((event) => {
    if (travel <= 0) return;
    const next = (event.x - KNOB / 2) / travel;
    fraction.value = Math.min(1, Math.max(0, next));
    runOnJS(emit)(min + fraction.value * (max - min));
  });

  const originFraction = useDerivedValue(() =>
    originValue === undefined ? 0 : toFraction(originValue, min, max)
  );

  const knobStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: fraction.value * travel },
      { scale: active.value ? 1.12 : 1 },
    ],
  }));

  const fillStyle = useAnimatedStyle(() => {
    const from = Math.min(fraction.value, originFraction.value);
    const to = Math.max(fraction.value, originFraction.value);
    return {
      left: `${from * 100}%`,
      width: `${Math.max(0, to - from) * 100}%`,
    };
  });

  const onLayout = (event: LayoutChangeEvent) =>
    setWidth(event.nativeEvent.layout.width);

  return (
    <View style={styles.root}>
      <View style={styles.labelRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.value}>{valueLabel}</Text>
      </View>

      <GestureDetector gesture={Gesture.Simultaneous(pan, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: value, text: valueLabel }}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + step));
            if (event.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - step));
          }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          style={styles.hitArea}
          onLayout={onLayout}
        >
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fillStyle]} />
          </View>
          <Animated.View style={[styles.knob, knobStyle]} />
        </View>
      </GestureDetector>
    </View>
  );
}

function toFraction(value: number, min: number, max: number) {
  'worklet';
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  root: {
    paddingVertical: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  label: {
    ...type.subheadline,
    flex: 1,
    color: palette.labelSecondary,
  },
  value: {
    ...type.subheadline,
    color: palette.label,
    fontVariant: ['tabular-nums'],
    marginLeft: 12,
  },
  hitArea: {
    height: KNOB + 12,
    justifyContent: 'center',
  },
  track: {
    height: TRACK_HEIGHT,
    marginHorizontal: KNOB / 2,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: palette.fillSubtle,
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: palette.blue,
  },
  knob: {
    position: 'absolute',
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
});
