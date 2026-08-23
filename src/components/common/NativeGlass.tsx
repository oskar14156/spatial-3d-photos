import React, { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
} from 'expo-glass-effect';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
  fallbackIntensity?: number;
};

export function NativeGlass({
  children,
  style,
  interactive = false,
  tintColor,
  fallbackIntensity = 34,
}: Props) {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency
    );
    return () => sub.remove();
  }, []);

  const canUseLiquidGlass =
    Platform.OS === 'ios' &&
    !reduceTransparency &&
    isGlassEffectAPIAvailable();

  if (canUseLiquidGlass) {
    return (
      <GlassView
        style={[styles.base, style]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tintColor}
      >
        {children}
      </GlassView>
    );
  }

  if (reduceTransparency) {
    return (
      <View style={[styles.base, styles.opaqueFallback, style]}>
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={fallbackIntensity}
      tint="systemMaterialDark"
      style={[styles.base, styles.blurFallback, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  blurFallback: {
    backgroundColor: 'rgba(22,22,24,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  opaqueFallback: {
    backgroundColor: 'rgb(30,30,32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
});
