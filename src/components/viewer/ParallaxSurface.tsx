import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { DeviceMotion } from 'expo-sensors';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import type { StereoPair } from '../../types';
import { spring } from '../../theme';
import { eyeTransforms, resolveEyes } from './eyeGeometry';

type Props = {
  pair: StereoPair;
  /**
   * Owned by the screen so the controls can draw a matching readout without
   * the value ever crossing onto the JS thread.
   */
  tiltX: SharedValue<number>;
};

/** Device roll/pitch, in radians, that maps to a full swing to one eye. */
const ROLL_RANGE = 0.8;
const PITCH_RANGE = 0.8;
const SENSOR_DEADZONE = 0.025;

/**
 * Look-around view: tilting the phone (or dragging) cross-fades between the
 * eyes while nudging the image, which reads as looking around the subject.
 *
 * Sensor samples are written straight into shared values, so the 30 Hz stream
 * never crosses into React. Previously each sample triggered two `setState`
 * calls, re-rendering the image tree ~60×/s.
 */
export function ParallaxSurface({ pair, tiltX }: Props) {
  const eyes = resolveEyes(pair);
  const transforms = eyeTransforms(pair.alignment);

  /** -1 … 1; the horizontal axis is lifted to the screen. */
  const tiltY = useSharedValue(0);
  const dragging = useSharedValue(false);
  const dragStartX = useSharedValue(0);
  const dragStartY = useSharedValue(0);
  const sensorBaseline = useRef<{ beta: number; gamma: number } | null>(null);
  const previousRotation = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    // A new pair starts from neutral. Keeping the old shared value here made
    // switching photos look like a sudden jump in the scene.
    tiltX.value = 0;
    tiltY.value = 0;
    sensorBaseline.current = null;
    previousRotation.current = null;

    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    DeviceMotion.isAvailableAsync().then((available) => {
      if (!available || cancelled) return;
      DeviceMotion.setUpdateInterval(33);
      subscription = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation || dragging.value) return;

        if (!Number.isFinite(rotation.beta) || !Number.isFinite(rotation.gamma)) {
          return;
        }

        // Euler angles wrap at ±π. Unwrapping before subtracting the neutral
        // sample prevents the scene from jumping when the phone is level.
        const previous = previousRotation.current;
        const beta = previous
          ? unwrapAngle(rotation.beta, previous.beta)
          : rotation.beta;
        const gamma = previous
          ? unwrapAngle(rotation.gamma, previous.gamma)
          : rotation.gamma;
        previousRotation.current = { beta, gamma };

        if (!sensorBaseline.current) {
          sensorBaseline.current = { beta, gamma };
          return;
        }

        // Smooth in the shared value itself; this callback runs on the JS
        // thread but only ever assigns, never re-renders.
        const nextX = normaliseTilt(
          gamma - sensorBaseline.current.gamma,
          ROLL_RANGE
        );
        const nextY = normaliseTilt(
          beta - sensorBaseline.current.beta,
          PITCH_RANGE
        );
        tiltX.value = tiltX.value * 0.75 + nextX * 0.25;
        tiltY.value = tiltY.value * 0.75 + nextY * 0.25;
      });
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [dragging, tiltX, tiltY]);

  const drag = Gesture.Pan()
    .onBegin(() => {
      dragging.value = true;
      dragStartX.value = tiltX.value;
      dragStartY.value = tiltY.value;
    })
    .onUpdate((event) => {
      tiltX.value = clamp(dragStartX.value + event.translationX / 140, -1, 1);
      tiltY.value = clamp(dragStartY.value + event.translationY / 140, -1, 1);
    })
    .onFinalize(() => {
      dragging.value = false;
      tiltX.value = withSpring(tiltX.value, spring);
    });

  const leftStyle = useAnimatedStyle(() => ({
    opacity: clamp(1 - (tiltX.value + 1) / 2, 0, 1),
  }));
  const rightStyle = useAnimatedStyle(() => ({
    opacity: clamp((tiltX.value + 1) / 2, 0, 1),
  }));
  const sceneStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { translateX: tiltX.value * 7 },
      { translateY: tiltY.value * 4 },
      { rotateY: `${tiltX.value * 4}deg` },
      { rotateX: `${-tiltY.value * 3}deg` },
    ],
  }));

  return (
    <GestureDetector gesture={drag}>
      <View style={styles.fill}>
        <Animated.View style={[styles.fill, sceneStyle]}>
          <Animated.View style={[styles.fill, leftStyle]}>
            <Image
              source={{ uri: eyes.left }}
              style={[styles.fill, { transform: transforms.left }]}
              resizeMode="contain"
            />
          </Animated.View>
          <Animated.View style={[styles.fill, rightStyle]}>
            <Image
              source={{ uri: eyes.right }}
              style={[styles.fill, { transform: transforms.right }]}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(max, Math.max(min, value));
}

function unwrapAngle(value: number, previous: number) {
  const delta = value - previous;
  if (delta > Math.PI) return value - Math.PI * 2;
  if (delta < -Math.PI) return value + Math.PI * 2;
  return value;
}

function normaliseTilt(delta: number, range: number) {
  const magnitude = Math.abs(delta);
  if (magnitude <= SENSOR_DEADZONE) return 0;
  const scaled = (magnitude - SENSOR_DEADZONE) / (range - SENSOR_DEADZONE);
  return clamp(Math.sign(delta) * scaled, -1, 1);
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
