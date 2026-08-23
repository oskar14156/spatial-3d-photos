import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils/haptics';

interface HeaderProps {
  title: string;
  subtitle?: string;
  mediaTypeTag?: string;
  leftAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
  rightAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
  rightSecondaryAction?: {
    icon: React.ReactNode;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  mediaTypeTag,
  leftAction,
  rightAction,
  rightSecondaryAction,
}) => {
  return (
    <View style={styles.container}>
      <BlurView intensity={50} tint="dark" style={styles.blurContainer}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.12)', 'rgba(0, 0, 0, 0.35)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientOverlay}
        />

        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.topRimLight}
        />

        <View style={styles.content}>
          <View style={styles.left}>
            {leftAction && (
              <TouchableOpacity
                style={styles.liquidIconButton}
                onPress={() => {
                  hapticFeedback.light();
                  leftAction.onPress();
                }}
                activeOpacity={0.7}
              >
                {leftAction.icon}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.center}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {mediaTypeTag && (
                <View style={styles.mediaTagBadge}>
                  <Text style={styles.mediaTagText}>{mediaTypeTag}</Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <View style={styles.right}>
            {rightSecondaryAction && (
              <TouchableOpacity
                style={styles.liquidIconButton}
                onPress={() => {
                  hapticFeedback.light();
                  rightSecondaryAction.onPress();
                }}
                activeOpacity={0.7}
              >
                {rightSecondaryAction.icon}
              </TouchableOpacity>
            )}
            {rightAction && (
              <TouchableOpacity
                style={[styles.liquidIconButton, styles.liquidPrimaryBtn]}
                onPress={() => {
                  hapticFeedback.light();
                  rightAction.onPress();
                }}
                activeOpacity={0.7}
              >
                {rightAction.icon}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    zIndex: 50,
  },
  blurContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    position: 'relative',
    backgroundColor: 'rgba(18, 18, 22, 0.65)',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topRimLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  left: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    width: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  mediaTagBadge: {
    backgroundColor: 'rgba(100, 210, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(100, 210, 255, 0.35)',
  },
  mediaTagText: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  liquidIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  liquidPrimaryBtn: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: 'rgba(100, 210, 255, 0.45)',
  },
});
