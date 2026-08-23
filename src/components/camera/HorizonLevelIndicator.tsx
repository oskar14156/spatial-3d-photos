import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  onLevelStatusChange?: (isLevel: boolean) => void;
};

export const HorizonLevelIndicator: React.FC<Props> = ({
  onLevelStatusChange,
}) => {
  const [roll, setRoll] = useState(0);
  const wasLevel = useRef(false);

  useEffect(() => {
    let sub: { remove: () => void } | undefined;

    Accelerometer.isAvailableAsync().then((available) => {
      if (!available) return;
      Accelerometer.setUpdateInterval(50);
      sub = Accelerometer.addListener(({ x, y }) => {
        const raw = Math.atan2(x, y) * (180 / Math.PI) + 90;
        const normalized = ((raw + 180) % 360) - 180;
        setRoll(normalized);

        const level = Math.abs(normalized) <= 1.0;
        if (level !== wasLevel.current) {
          if (level) hapticFeedback.light();
          onLevelStatusChange?.(level);
          wasLevel.current = level;
        }
      });
    });

    return () => sub?.remove();
  }, [onLevelStatusChange]);

  const level = Math.abs(roll) <= 1.0;

  return (
    <View
      pointerEvents="none"
      accessibilityLabel={level ? 'Camera level' : `Camera roll ${roll.toFixed(1)} degrees`}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.line,
          level && styles.lineLevel,
          { transform: [{ rotate: `${-roll}deg` }] },
        ]}
      >
        <View style={[styles.wing, level && styles.wingLevel]} />
        <View style={[styles.center, level && styles.centerLevel]} />
        <View style={[styles.wing, level && styles.wingLevel]} />
      </View>
      <Text style={[styles.value, level && styles.valueLevel]}>
        {level ? 'LEVEL' : `${roll > 0 ? '+' : ''}${roll.toFixed(1)}°`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: 168,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 144,
    flexDirection: 'row',
    alignItems: 'center',
  },
  wing: {
    flex: 1,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  wingLevel: {
    backgroundColor: '#30D158',
  },
  center: {
    width: 8,
    height: 8,
    marginHorizontal: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: 4,
  },
  centerLevel: {
    borderColor: '#30D158',
    backgroundColor: '#30D158',
  },
  lineLevel: {},
  value: {
    marginTop: 5,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.45,
    fontVariant: ['tabular-nums'],
  },
  valueLevel: {
    color: '#30D158',
  },
});
