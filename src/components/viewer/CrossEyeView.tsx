import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { SpatialVideoPlayer } from './SpatialVideoPlayer';

interface CrossEyeViewProps {
  stereoPair: StereoPair;
}

export const CrossEyeView: React.FC<CrossEyeViewProps> = ({ stereoPair }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  if (stereoPair.mediaType === 'video') {
    return (
      <SpatialVideoPlayer
        stereoPair={stereoPair}
        viewMode="cross_eye"
        isLandscape={isLandscape}
      />
    );
  }

  const { alignment } = stereoPair;
  const leftHalfSource = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;
  const rightHalfSource = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;

  const leftTransform = [
    { translateX: alignment.horizontalDisparity / 2 },
    { translateY: -alignment.verticalOffset / 2 },
    { rotate: `${-alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const rightTransform = [
    { translateX: -alignment.horizontalDisparity / 2 },
    { translateY: alignment.verticalOffset / 2 },
    { rotate: `${alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const containerHeight = isLandscape ? Math.min(windowHeight * 0.72, 420) : 320;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View style={styles.guideDotsRow}>
        <View style={styles.dotContainer}>
          <View style={styles.guideDot} />
          <Text style={styles.guideDotText}>● {t('cross_eye_guide_dot_left')}</Text>
        </View>
        <View style={styles.dotContainer}>
          <View style={styles.guideDot} />
          <Text style={styles.guideDotText}>● {t('cross_eye_guide_dot_right')}</Text>
        </View>
      </View>

      <View style={[styles.liquidFrameContainer, { height: containerHeight }]}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          style={styles.topRimLight}
        />

        <View style={styles.halfPane}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: leftHalfSource }}
              style={[styles.stereoImage, { transform: leftTransform }]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.liquidBadge}>
            <Text style={styles.liquidBadgeText}>R (Schielblick Links)</Text>
          </View>
        </View>

        <View style={styles.centerDivider} />

        <View style={styles.halfPane}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: rightHalfSource }}
              style={[styles.stereoImage, { transform: rightTransform }]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.liquidBadge}>
            <Text style={styles.liquidBadgeText}>L (Schielblick Rechts)</Text>
          </View>
        </View>
      </View>

      {!isLandscape && (
        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 {t('cross_eye_tip')}</Text>
          <Text style={styles.tipDesc}>{t('cross_eye_explanation')}</Text>
        </View>
      )}
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
  guideDotsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  dotContainer: {
    alignItems: 'center',
    gap: 4,
  },
  guideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
  },
  guideDotText: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '700',
  },
  liquidFrameContainer: {
    flexDirection: 'row',
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
  halfPane: {
    flex: 1,
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#07070a',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stereoImage: {
    width: '100%',
    height: '100%',
  },
  centerDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  liquidBadge: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 15, 20, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  liquidBadgeText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tipCard: {
    marginTop: 10,
    backgroundColor: 'rgba(100, 210, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(100, 210, 255, 0.35)',
    borderLeftColor: 'rgba(100, 210, 255, 0.2)',
    borderRightColor: 'rgba(100, 210, 255, 0.2)',
    borderBottomColor: 'rgba(100, 210, 255, 0.1)',
    width: '100%',
  },
  tipTitle: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
