import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

interface LiquidGlassViewProps {
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  tint?: 'dark' | 'light' | 'default';
  children?: React.ReactNode;
  showRimLight?: boolean;
  glowColor?: string;
  borderRadius?: number;
}

export const LiquidGlassView: React.FC<LiquidGlassViewProps> = ({
  style,
  intensity = 45,
  tint = 'dark',
  children,
  showRimLight = true,
  glowColor,
  borderRadius = 22,
}) => {
  return (
    <View style={[styles.outerGlowWrapper, { borderRadius }, style]}>
      {glowColor && (
        <View
          style={[
            styles.ambientGlow,
            {
              backgroundColor: glowColor,
              borderRadius,
            },
          ]}
        />
      )}

      <BlurView
        intensity={intensity}
        tint={tint}
        style={[styles.blurSurface, { borderRadius }]}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.14)', 'rgba(255, 255, 255, 0.02)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.internalRefraction, { borderRadius }]}
        />

        {showRimLight && (
          <LinearGradient
            colors={['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.0)']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[styles.topRimSpecular, { borderTopLeftRadius: borderRadius, borderTopRightRadius: borderRadius }]}
          />
        )}

        <View style={styles.contentContainer}>{children}</View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  outerGlowWrapper: {
    position: 'relative',
    backgroundColor: 'transparent',
  },
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.25,
    transform: [{ scale: 1.03 }],
    zIndex: 0,
  },
  blurSurface: {
    overflow: 'hidden',
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.42)',
    borderLeftColor: 'rgba(255, 255, 255, 0.16)',
    borderRightColor: 'rgba(255, 255, 255, 0.16)',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(18, 18, 24, 0.65)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  internalRefraction: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  topRimSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    zIndex: 3,
  },
  contentContainer: {
    position: 'relative',
    zIndex: 2,
  },
});
