import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { SpatialVideoPlayer } from './SpatialVideoPlayer';

interface ParallaxTilt3DViewProps {
  stereoPair: StereoPair;
}

export const ParallaxTilt3DView: React.FC<ParallaxTilt3DViewProps> = ({ stereoPair }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [tiltX, setTiltX] = useState<number>(0);
  const [tiltY, setTiltY] = useState<number>(0);
  const [sensorAvailable, setSensorAvailable] = useState<boolean>(false);

  if (stereoPair.mediaType === 'video') {
    return (
      <SpatialVideoPlayer
        stereoPair={stereoPair}
        viewMode="parallax_tilt"
        isLandscape={isLandscape}
      />
    );
  }

  const { alignment } = stereoPair;
  const leftSource = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;
  const rightSource = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    Accelerometer.isAvailableAsync().then((available) => {
      setSensorAvailable(available);
      if (available) {
        Accelerometer.setUpdateInterval(30);
        subscription = Accelerometer.addListener((data) => {
          setTiltX((prev) => prev * 0.7 + data.x * 0.3);
          setTiltY((prev) => prev * 0.7 + (data.y + 0.5) * 0.3);
        });
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const normalizedX = Math.max(-1, Math.min(1, gestureState.dx / 120));
        const normalizedY = Math.max(-1, Math.min(1, gestureState.dy / 120));
        setTiltX(normalizedX);
        setTiltY(normalizedY);
      },
      onPanResponderRelease: () => {
        if (!sensorAvailable) {
          setTiltX(0);
          setTiltY(0);
        }
      },
    })
  ).current;

  const rightOpacity = Math.max(0, Math.min(1, (tiltX + 1) / 2));
  const leftOpacity = 1 - rightOpacity;

  const parallaxShiftX = tiltX * 16;
  const parallaxShiftY = tiltY * 9;
  const rotateYDeg = tiltX * 14;
  const rotateXDeg = -tiltY * 9;

  const containerHeight = isLandscape ? Math.min(windowHeight * 0.72, 420) : 320;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View
        style={[
          styles.liquidViewport,
          {
            height: containerHeight,
            transform: [
              { perspective: 850 },
              { rotateY: `${rotateYDeg}deg` },
              { rotateX: `${rotateXDeg}deg` },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          style={styles.topRimLight}
        />

        <View
          style={[
            styles.layer,
            {
              opacity: leftOpacity,
              transform: [
                { translateX: -parallaxShiftX - alignment.horizontalDisparity / 2 },
                { translateY: -parallaxShiftY - alignment.verticalOffset / 2 },
                { scale: alignment.zoomScale },
              ],
            },
          ]}
        >
          <Image source={{ uri: leftSource }} style={styles.image} resizeMode="contain" />
        </View>

        <View
          style={[
            styles.layer,
            {
              opacity: rightOpacity,
              transform: [
                { translateX: parallaxShiftX + alignment.horizontalDisparity / 2 },
                { translateY: parallaxShiftY + alignment.verticalOffset / 2 },
                { scale: alignment.zoomScale },
              ],
            },
          ]}
        >
          <Image source={{ uri: rightSource }} style={styles.image} resizeMode="contain" />
        </View>

        <View style={styles.liquidGyroBadge}>
          <Text style={styles.gyroBadgeText}>
            📱 {sensorAvailable ? 'Gyro 3D Aktiv' : 'Touch 3D Parallaxe'} | {Math.round(tiltX * 100)}°
          </Text>
        </View>
      </View>

      {!isLandscape && <Text style={styles.hintText}>{t('parallax_explanation')}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerLandscape: {
    paddingHorizontal: 0,
  },
  liquidViewport: {
    width: '100%',
    backgroundColor: '#040406',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(94, 92, 230, 0.35)',
    borderRightColor: 'rgba(94, 92, 230, 0.35)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
  },
  topRimLight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    zIndex: 10,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  liquidGyroBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(94, 92, 230, 0.4)',
  },
  gyroBadgeText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '800',
  },
  hintText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
    lineHeight: 16,
  },
});
