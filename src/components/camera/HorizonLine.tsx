import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { mediaPalette as palette } from '../../theme';
import { LEVEL_TOLERANCE_DEGREES } from '../../utils/captureGuidance';

type Props = {
  /** Signed device roll in degrees; zero is level. */
  rollDegrees: number;
};

/** Roll beyond this reads as "deliberately tilted", so the line fades out. */
const FADE_LIMIT = 45;

/**
 * Artificial horizon: a fixed reference bar with a rotating true-horizon line
 * across it.
 *
 * A number alone tells you *that* you are off by 4 degrees but not which way
 * to turn, and it forces the photographer to read text while framing. The
 * rotating line answers both at a glance, the way an optical level does.
 */
export function HorizonLine({ rollDegrees }: Props) {
  const roll = useSharedValue(0);
  const level = useSharedValue(0);

  // Shared values must not be written during render. Apart from producing a
  // Reanimated warning, doing that restarted the spring on every telemetry
  // update and made the line visibly flip when the phone crossed level.
  useEffect(() => {
    roll.value = withSpring(normaliseLineAngle(rollDegrees), {
      damping: 20,
      stiffness: 200,
      mass: 0.6,
    });
    level.value = withTiming(
      Math.abs(rollDegrees) <= LEVEL_TOLERANCE_DEGREES ? 1 : 0,
      { duration: 140 }
    );
  }, [level, roll, rollDegrees]);

  const lineStyle = useAnimatedStyle(() => {
    const magnitude = Math.abs(roll.value);
    const angle = Math.max(-FADE_LIMIT, Math.min(FADE_LIMIT, roll.value));
    return {
      transform: [{ rotateZ: `${-angle}deg` }],
      // Past a deliberate tilt the level is no longer the point; get out of
      // the way rather than sitting there scolding.
      opacity: magnitude > FADE_LIMIT ? 0.18 : 0.72,
    };
  });

  const colorStyle = useAnimatedStyle(() => ({
    backgroundColor: level.value > 0.5 ? palette.green : '#FFFFFF',
  }));

  const referenceStyle = useAnimatedStyle(() => ({
    opacity: level.value > 0.5 ? 0 : 0.42,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: level.value,
    transform: [{ scale: 0.6 + level.value * 0.4 }],
  }));

  return (
    <View pointerEvents="none" style={styles.wrap}>
      {/* Fixed reference: where level would be. Hidden once we are there, so
          the two lines never sit on top of each other. */}
      <Animated.View style={[styles.reference, referenceStyle]}>
        <View style={styles.referenceSegment} />
        <View style={styles.referenceGap} />
        <View style={styles.referenceSegment} />
      </Animated.View>

      <Animated.View style={[styles.line, lineStyle]}>
        <Animated.View style={[styles.segment, colorStyle]} />
        <View style={styles.gap}>
          <Animated.View style={[styles.centreDot, colorStyle, dotStyle]} />
        </View>
        <Animated.View style={[styles.segment, colorStyle]} />
      </Animated.View>
    </View>
  );
}

const LINE_WIDTH = 112;
const SEGMENT = 36;

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: LINE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the white line readable over a bright subject.
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  segment: {
    width: SEGMENT,
    height: 1.5,
    borderRadius: 0.75,
  },
  gap: {
    width: LINE_WIDTH - SEGMENT * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centreDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  reference: {
    position: 'absolute',
    width: LINE_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceSegment: {
    width: SEGMENT,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: palette.labelSecondary,
  },
  referenceGap: {
    width: LINE_WIDTH - SEGMENT * 2,
  },
});

/**
 * A horizon is a line, so 180° is visually identical to 0°. Choosing the
 * nearest equivalent angle prevents the animation from taking the long way
 * around when ARKit reports the equivalent value on the other side.
 */
function normaliseLineAngle(degrees: number) {
  if (!Number.isFinite(degrees)) return 0;
  return ((degrees + 90) % 180 + 180) % 180 - 90;
}
