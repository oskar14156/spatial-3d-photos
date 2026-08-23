import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils/haptics';

interface HorizonLevelIndicatorProps {
  onLevelStatusChange?: (isLevel: boolean) => void;
}

export const HorizonLevelIndicator: React.FC<HorizonLevelIndicatorProps> = ({
  onLevelStatusChange,
}) => {
  const [roll, setRoll] = useState<number>(0);
  const wasLevelRef = useRef<boolean>(false);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    Accelerometer.isAvailableAsync().then((available) => {
      if (available) {
        Accelerometer.setUpdateInterval(40);
        subscription = Accelerometer.addListener((data) => {
          const calculatedRoll = Math.atan2(data.x, data.y) * (180 / Math.PI) + 90;
          const clampedRoll = ((calculatedRoll + 180) % 360) - 180;
          setRoll(clampedRoll);

          const isCurrentlyLevel = Math.abs(clampedRoll) < 1.2;

          if (isCurrentlyLevel && !wasLevelRef.current) {
            hapticFeedback.light();
            onLevelStatusChange?.(true);
          } else if (!isCurrentlyLevel && wasLevelRef.current) {
            onLevelStatusChange?.(false);
          }

          wasLevelRef.current = isCurrentlyLevel;
        });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [onLevelStatusChange]);

  const isLevel = Math.abs(roll) < 1.2;
  const levelColor = isLevel ? COLORS.green : '#FFFFFF';

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.horizonBar,
          {
            transform: [{ rotate: `${-roll}deg` }],
            borderColor: isLevel ? COLORS.green : 'rgba(255, 255, 255, 0.4)',
            backgroundColor: isLevel ? 'rgba(48, 209, 88, 0.2)' : 'transparent',
          },
        ]}
      >
        <View style={[styles.wingLine, { backgroundColor: levelColor }]} />
        <View
          style={[
            styles.centerBox,
            { borderColor: levelColor, backgroundColor: isLevel ? COLORS.green : 'transparent' },
          ]}
        />
        <View style={[styles.wingLine, { backgroundColor: levelColor }]} />
      </View>

      <View style={[styles.degreesBadge, isLevel && styles.degreesBadgeLevel]}>
        <Text style={[styles.degreesText, isLevel && styles.degreesTextLevel]}>
          {isLevel ? '✓ LEVEL' : `${roll > 0 ? '+' : ''}${roll.toFixed(1)}°`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 36,
  },
  horizonBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
  },
  wingLine: {
    flex: 1,
    height: 2,
    marginHorizontal: 4,
  },
  centerBox: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  degreesBadge: {
    position: 'absolute',
    bottom: -10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  degreesBadgeLevel: {
    borderColor: COLORS.green,
    backgroundColor: 'rgba(48, 209, 88, 0.25)',
  },
  degreesText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  degreesTextLevel: {
    color: COLORS.green,
  },
});
