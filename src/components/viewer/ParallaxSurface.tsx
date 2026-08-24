import React, { useEffect } from 'react';
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

/** Device roll, in radians, that maps to a full swing to one eye. */
const ROLL_RANGE = 0.45;
const PITCH_RANGE = 0.45;

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

  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    let cancelled = false;

    DeviceMotion.isAvailableAsync().then((available) => {
      if (!available || cancelled) return;
      DeviceMotion.setUpdateInterval(33);
      subscription = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation || dragging.value) return;
        // Smooth in the shared value itself; this callback runs on the JS
        // thread but only ever assigns, never re-renders.
        const nextX = clamp(rotation.gamma / ROLL_RANGE, -1, 1);
        const nextY = clamp((rotation.beta + 0.6) / PITCH_RANGE, -1, 1);
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
      { translateX: tiltX.value * 14 },
      { translateY: tiltY.value * 8 },
      { rotateY: `${tiltX.value * 9}deg` },
      { rotateX: `${-tiltY.value * 6}deg` },
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

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
