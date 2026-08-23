import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import type { StereoPair } from '../../types';
import { eyeTransforms, resolveEyes } from './eyeGeometry';

type Props = {
  pair: StereoPair;
  fps: number;
  playing: boolean;
};

/**
 * Wigglegram: both eyes are mounted, and only their opacity is toggled. The
 * oscillation runs as a repeating UI-thread animation rather than a JS
 * interval, so nothing about the alternation depends on React re-rendering —
 * at 20 fps the old `setState` loop was re-rendering the whole tree 20×/s.
 *
 * Dragging horizontally scrubs between the eyes for manual parallax control.
 */
export function WiggleSurface({ pair, fps, playing }: Props) {
  const eyes = resolveEyes(pair);
  const transforms = eyeTransforms(pair.alignment);

  /** 0 = fully left eye, 1 = fully right eye. */
  const blend = useSharedValue(0);
  const scrubbing = useSharedValue(false);
  const scrubStart = useSharedValue(0);

  useEffect(() => {
    if (!playing) {
      cancelAnimation(blend);
      return;
    }

    const halfCycleMs = Math.max(25, 1000 / Math.max(1, fps) / 2);
    blend.value = 0;
    // `withTiming` to 1 then mirrored back gives the hard A/B swap the effect
    // needs; a short ramp keeps it from strobing on high refresh displays.
    blend.value = withRepeat(
      withTiming(1, { duration: halfCycleMs, easing: Easing.steps(2, true) }),
      -1,
      true
    );

    return () => cancelAnimation(blend);
  }, [blend, fps, playing]);

  const scrub = Gesture.Pan()
    .onBegin(() => {
      scrubbing.value = true;
      cancelAnimation(blend);
      scrubStart.value = blend.value;
    })
    .onUpdate((event) => {
      blend.value = Math.min(
        1,
        Math.max(0, scrubStart.value + event.translationX / 220)
      );
    })
    .onFinalize(() => {
      scrubbing.value = false;
    });

  const leftStyle = useAnimatedStyle(() => ({ opacity: 1 - blend.value }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: blend.value }));

  return (
    <GestureDetector gesture={scrub}>
      <View style={styles.fill}>
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
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
