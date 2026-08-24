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
import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { useTheme } from '../../theme';

type Props = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
  tintColor?: string;
  fallbackIntensity?: number;
  /**
   * Force a dark glass regardless of the system appearance. Used for chrome
   * that floats over the camera or a stereo pair, where the backdrop is always
   * dark and light glass would be unreadable.
   */
  overMedia?: boolean;
};

export function NativeGlass({
  children,
  style,
  interactive = false,
  tintColor,
  fallbackIntensity = 34,
  overMedia = false,
}: Props) {
  const { scheme } = useTheme();
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduceTransparency);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency
    );
    return () => subscription.remove();
  }, []);

  const dark = overMedia || scheme === 'dark';

  const canUseLiquidGlass =
    Platform.OS === 'ios' && !reduceTransparency && isGlassEffectAPIAvailable();

  if (canUseLiquidGlass) {
    return (
      <GlassView
        style={[styles.base, style]}
        glassEffectStyle={dark ? 'regular' : 'clear'}
        isInteractive={interactive}
        tintColor={tintColor}
      >
        {children}
      </GlassView>
    );
  }

  // Reduce Transparency asks for opaque surfaces, not a weaker blur.
  if (reduceTransparency) {
    return (
      <View
        style={[
          styles.base,
          dark ? styles.opaqueDark : styles.opaqueLight,
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={fallbackIntensity}
      tint={dark ? 'systemMaterialDark' : 'systemMaterialLight'}
      style={[styles.base, dark ? styles.blurDark : styles.blurLight, style]}
    >
      {children}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
  blurDark: {
    backgroundColor: 'rgba(22,22,24,0.42)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  blurLight: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.12)',
  },
  opaqueDark: {
    backgroundColor: 'rgb(30,30,32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  opaqueLight: {
    backgroundColor: 'rgb(255,255,255)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(60,60,67,0.14)',
  },
});
