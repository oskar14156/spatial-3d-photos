import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StereoPair, AnaglyphColorMode } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';
import { SpatialVideoPlayer } from './SpatialVideoPlayer';

interface Anaglyph3DViewProps {
  stereoPair: StereoPair;
}

export const Anaglyph3DView: React.FC<Anaglyph3DViewProps> = ({ stereoPair }) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [colorMode, setColorMode] = useState<AnaglyphColorMode>('dubois');

  if (stereoPair.mediaType === 'video') {
    return (
      <SpatialVideoPlayer
        stereoPair={stereoPair}
        viewMode="anaglyph"
        isLandscape={isLandscape}
      />
    );
  }

  const { alignment } = stereoPair;
  const leftSource = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;
  const rightSource = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;

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

  const containerHeight = isLandscape ? Math.min(windowHeight * 0.72, 420) : 320;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View style={[styles.liquidFrameContainer, { height: containerHeight }]}>
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          style={styles.topRimLight}
        />

        <View style={styles.layer}>
          <Image
            source={{ uri: leftSource }}
            style={[styles.fullImage, { transform: leftTransform }]}
            resizeMode="contain"
          />
          <View style={[styles.colorFilter, { backgroundColor: 'rgba(255, 0, 0, 0.55)' }]} />
        </View>

        <View style={[styles.layer, styles.cyanOverlayLayer]}>
          <Image
            source={{ uri: rightSource }}
            style={[styles.fullImage, { transform: rightTransform }]}
            resizeMode="contain"
          />
          <View style={[styles.colorFilter, { backgroundColor: 'rgba(0, 229, 255, 0.55)' }]} />
        </View>

        <View style={styles.liquidGlassesBadge}>
          <View style={styles.lensLeft} />
          <Text style={styles.badgeText}>3D GLASSES</Text>
          <View style={styles.lensRight} />
        </View>
      </View>

      <View style={styles.modeRow}>
        {(
          [
            { id: 'dubois', label: t('anaglyph_mode_dubois') },
            { id: 'red_cyan_pure', label: t('anaglyph_mode_pure') },
            { id: 'color', label: t('anaglyph_mode_color') },
          ] as const
        ).map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.liquidModeBtn, colorMode === mode.id && styles.liquidModeBtnActive]}
            onPress={() => {
              hapticFeedback.selection();
              setColorMode(mode.id);
            }}
          >
            <Text style={[styles.modeButtonText, colorMode === mode.id && styles.modeButtonTextActive]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!isLandscape && <Text style={styles.hintText}>{t('anaglyph_explanation')}</Text>}
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
  liquidFrameContainer: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 69, 58, 0.35)',
    borderRightColor: 'rgba(0, 229, 255, 0.35)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    position: 'relative',
    shadowColor: COLORS.red,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
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
  cyanOverlayLayer: {
    opacity: 0.85,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  colorFilter: {
    ...StyleSheet.absoluteFillObject,
  },
  liquidGlassesBadge: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  lensLeft: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.anaglyphRed,
  },
  lensRight: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORS.anaglyphCyan,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  modeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  liquidModeBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  liquidModeBtnActive: {
    backgroundColor: 'rgba(255, 69, 58, 0.25)',
    borderColor: COLORS.red,
  },
  modeButtonText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
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
