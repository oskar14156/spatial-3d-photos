import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';
import { SpatialVideoPlayer } from './SpatialVideoPlayer';

interface Wigglegram3DViewProps {
  stereoPair: StereoPair;
}

export const Wigglegram3DView: React.FC<Wigglegram3DViewProps> = ({ stereoPair }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [currentEye, setCurrentEye] = useState<'left' | 'right'>('left');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(10);
  const [scrubPosition, setScrubPosition] = useState<number>(0.5);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  if (stereoPair.mediaType === 'video') {
    return (
      <SpatialVideoPlayer
        stereoPair={stereoPair}
        viewMode="wigglegram"
        isLandscape={isLandscape}
      />
    );
  }

  const { alignment } = stereoPair;
  const leftSource = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;
  const rightSource = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;

  useEffect(() => {
    if (!isPlaying || isScrubbing) return;

    const intervalMs = Math.max(30, Math.round(1000 / fps));
    const interval = setInterval(() => {
      setCurrentEye((prev) => (prev === 'left' ? 'right' : 'left'));
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, fps, isScrubbing]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsScrubbing(true);
        hapticFeedback.light();
      },
      onPanResponderMove: (_, gestureState) => {
        const clamped = Math.max(0, Math.min(1, 0.5 + gestureState.dx / 300));
        setScrubPosition(clamped);
        setCurrentEye(clamped < 0.5 ? 'left' : 'right');
      },
      onPanResponderRelease: () => {
        setIsScrubbing(false);
      },
    })
  ).current;

  const leftTransform = [
    { translateX: -alignment.horizontalDisparity / 2 },
    { translateY: -alignment.verticalOffset / 2 },
    { rotate: `${-alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const rightTransform = [
    { translateX: alignment.horizontalDisparity / 2 },
    { translateY: alignment.verticalOffset / 2 },
    { rotate: `${alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const activeSource = currentEye === 'left' ? leftSource : rightSource;
  const activeTransform = currentEye === 'left' ? leftTransform : rightTransform;
  const containerHeight = isLandscape ? Math.min(windowHeight * 0.72, 420) : 320;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View
        style={[styles.liquidViewport, { height: containerHeight }]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          style={styles.topRimLight}
        />

        <Image
          source={{ uri: activeSource }}
          style={[styles.fullImage, { transform: activeTransform }]}
          resizeMode="contain"
        />

        <View style={styles.liquidStatusBadge}>
          <View
            style={[
              styles.eyeIndicatorDot,
              { backgroundColor: currentEye === 'left' ? COLORS.blue : COLORS.green },
            ]}
          />
          <Text style={styles.statusBadgeText}>
            {currentEye === 'left' ? 'Left Eye (A)' : 'Right Eye (B)'}
          </Text>
        </View>

        {isScrubbing && (
          <View style={styles.scrubIndicator}>
            <Text style={styles.scrubText}>👆 3D Blickwinkel: {Math.round(scrubPosition * 100)}%</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.liquidPlayBtn, !isPlaying && styles.liquidPlayBtnPaused]}
          onPress={() => {
            hapticFeedback.light();
            setIsPlaying(!isPlaying);
          }}
        >
          <Text style={styles.playButtonText}>{isPlaying ? '⏸ Pause' : '▶ Play'}</Text>
        </TouchableOpacity>

        <View style={styles.fpsGroup}>
          {[6, 10, 15, 20].map((rate) => (
            <TouchableOpacity
              key={rate}
              style={[styles.liquidFpsPill, fps === rate && styles.liquidFpsPillActive]}
              onPress={() => {
                hapticFeedback.selection();
                setFps(rate);
              }}
            >
              <Text style={[styles.fpsText, fps === rate && styles.fpsTextActive]}>
                {rate} {t('fps_label')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {!isLandscape && <Text style={styles.hintText}>{t('wigglegram_explanation')}</Text>}
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
    borderLeftColor: 'rgba(255, 255, 255, 0.18)',
    borderRightColor: 'rgba(255, 255, 255, 0.18)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
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
  fullImage: {
    width: '100%',
    height: '100%',
  },
  liquidStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  eyeIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scrubIndicator: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: COLORS.cyan,
  },
  scrubText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  liquidPlayBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  liquidPlayBtnPaused: {
    backgroundColor: 'rgba(48, 209, 88, 0.25)',
    borderColor: COLORS.green,
  },
  playButtonText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  fpsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  liquidFpsPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  liquidFpsPillActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: COLORS.blue,
  },
  fpsText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  fpsTextActive: {
    color: COLORS.cyan,
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
