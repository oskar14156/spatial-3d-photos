import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

type Props = {
  color: string;
};

/** Small, honest progress indicator for work whose native duration is unknown. */
export function IndeterminateProgress({ color }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 260],
  });

  return (
    <View style={styles.track}>
      <Animated.View
        style={[styles.bar, { backgroundColor: color, transform: [{ translateX }] }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
    backgroundColor: 'rgba(118,118,128,0.22)',
  },
  bar: {
    width: 92,
    height: 3,
    borderRadius: 2,
  },
});
