import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { type Palette, type, useThemedStyles } from '../../theme';
import { NativeGlass } from '../common/NativeGlass';

type Props = {
  /** -1 (fully left eye) … +1 (fully right eye). */
  tiltX: SharedValue<number>;
  leftLabel: string;
  rightLabel: string;
  hint: string;
  /** Compact glass readout used as an overlay on the media. */
  compact?: boolean;
};

const TRACK_HEIGHT = 2;
const KNOB = 11;

/**
 * Shows where the gyro currently sits between the two eyes.
 *
 * Parallax was the one mode with no readout at all: you tilt, the picture
 * shifts, and nothing tells you how much travel is left or that dragging does
 * the same thing. The line makes the axis and its limits visible, and it is
 * driven straight off the shared value, so it costs no re-renders.
 */
export function TiltIndicator({
  tiltX,
  leftLabel,
  rightLabel,
  hint,
  compact = false,
}: Props) {
  const styles = useThemedStyles(createStyles);

  const knobStyle = useAnimatedStyle(() => ({
    left: `${((tiltX.value + 1) / 2) * 100}%`,
  }));

  // The filled portion runs from the centre outwards, so the bar reads as a
  // deflection from neutral rather than as a progress bar.
  const fillStyle = useAnimatedStyle(() => {
    const half = (tiltX.value / 2) * 100;
    return {
      left: `${50 + Math.min(half, 0)}%`,
      width: `${Math.abs(half)}%`,
    };
  });

  return (
    <NativeGlass
      overMedia
      style={[styles.glass, compact && styles.glassCompact]}
    >
      <View style={[styles.wrap, compact && styles.wrapCompact]}>
        <View style={styles.labels}>
          <Text style={[styles.eye, compact && styles.compactText]}>
            {leftLabel}
          </Text>
          {!compact && (
            <Text style={styles.hint} numberOfLines={1}>
              {hint}
            </Text>
          )}
          <Text style={[styles.eye, compact && styles.compactText]}>
            {rightLabel}
          </Text>
        </View>

        <View style={styles.track}>
          <Animated.View style={[styles.fill, fillStyle]} />
          <View style={styles.centreTick} />
          <Animated.View style={[styles.knobHolder, knobStyle]}>
            <View style={styles.knob} />
          </Animated.View>
        </View>
      </View>
    </NativeGlass>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    glass: {
      minWidth: 132,
      borderRadius: 17,
    },
    glassCompact: {
      minWidth: 122,
      borderRadius: 16,
    },
    wrap: { paddingHorizontal: 10, paddingVertical: 8 },
    wrapCompact: { paddingHorizontal: 9, paddingVertical: 7 },
    labels: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 7,
      gap: 10,
    },
    eye: {
      ...type.eyebrow,
      color: palette.labelSecondary,
    },
    compactText: { fontSize: 8 },
    hint: {
      ...type.caption,
      flex: 1,
      textAlign: 'center',
      color: palette.labelTertiary,
    },
    track: {
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: palette.fillSubtle,
      justifyContent: 'center',
    },
    fill: {
      position: 'absolute',
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      backgroundColor: palette.blue,
    },
    centreTick: {
      position: 'absolute',
      left: '50%',
      width: StyleSheet.hairlineWidth * 2,
      height: 7,
      marginLeft: -1,
      borderRadius: 1,
      backgroundColor: palette.separatorStrong,
    },
    knobHolder: {
      position: 'absolute',
      width: KNOB,
      height: KNOB,
      marginLeft: -KNOB / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    knob: {
      width: KNOB,
      height: KNOB,
      borderRadius: KNOB / 2,
      backgroundColor: palette.blue,
      borderWidth: 2.5,
      borderColor: palette.fill,
    },
  });
