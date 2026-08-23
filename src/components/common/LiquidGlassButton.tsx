import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils/haptics';

interface LiquidGlassButtonProps {
  title?: string;
  icon?: React.ReactNode;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'accent' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const LiquidGlassButton: React.FC<LiquidGlassButtonProps> = ({
  title,
  icon,
  onPress,
  variant = 'secondary',
  style,
  textStyle,
  children,
  disabled = false,
}) => {
  const getGradientColors = (): [string, string] => {
    switch (variant) {
      case 'primary':
        return ['rgba(10, 132, 255, 0.85)', 'rgba(0, 102, 204, 0.7)'];
      case 'accent':
        return ['rgba(100, 210, 255, 0.35)', 'rgba(10, 132, 255, 0.25)'];
      case 'danger':
        return ['rgba(255, 69, 58, 0.75)', 'rgba(215, 0, 21, 0.6)'];
      case 'secondary':
      default:
        return ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.05)'];
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case 'primary':
        return 'rgba(100, 210, 255, 0.6)';
      case 'accent':
        return 'rgba(100, 210, 255, 0.4)';
      case 'danger':
        return 'rgba(255, 105, 97, 0.6)';
      case 'secondary':
      default:
        return 'rgba(255, 255, 255, 0.25)';
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
      case 'danger':
        return '#FFFFFF';
      case 'accent':
        return COLORS.cyan;
      case 'secondary':
      default:
        return COLORS.textPrimary;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.buttonWrapper, style, disabled && styles.disabled]}
      onPress={() => {
        if (!disabled) {
          hapticFeedback.light();
          onPress();
        }
      }}
      activeOpacity={0.75}
      disabled={disabled}
    >
      <BlurView
        intensity={35}
        tint="dark"
        style={[
          styles.blurSurface,
          {
            borderColor: getBorderColor(),
          },
        ]}
      >
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />

        <LinearGradient
          colors={['rgba(255, 255, 255, 0.65)', 'transparent']}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.specularTopRim}
        />

        <View style={styles.content}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          {title && (
            <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
              {title}
            </Text>
          )}
          {children}
        </View>
      </BlurView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  blurSurface: {
    borderRadius: 16,
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  specularTopRim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    zIndex: 3,
    gap: 8,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
