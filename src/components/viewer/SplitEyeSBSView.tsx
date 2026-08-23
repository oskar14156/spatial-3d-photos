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
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';
import { SpatialVideoPlayer } from './SpatialVideoPlayer';

interface SplitEyeSBSViewProps {
  stereoPair: StereoPair;
  isVRHeadsetMode?: boolean;
  onToggleVRMode?: () => void;
}

export const SplitEyeSBSView: React.FC<SplitEyeSBSViewProps> = ({
  stereoPair,
  isVRHeadsetMode = false,
  onToggleVRMode,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [ipdOffset, setIpdOffset] = useState<number>(0);
  const { alignment } = stereoPair;

  if (stereoPair.mediaType === 'video') {
    return (
      <SpatialVideoPlayer
        stereoPair={stereoPair}
        viewMode="sbs"
        isLandscape={isLandscape}
        isVRMode={isVRHeadsetMode}
      />
    );
  }

  const leftSource = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;
  const rightSource = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;

  const leftTransform = [
    { translateX: -alignment.horizontalDisparity / 2 + ipdOffset },
    { translateY: -alignment.verticalOffset / 2 },
    { rotate: `${-alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const rightTransform = [
    { translateX: alignment.horizontalDisparity / 2 - ipdOffset },
    { translateY: alignment.verticalOffset / 2 },
    { rotate: `${alignment.rotationAngle / 2}deg` },
    { scale: alignment.zoomScale },
  ];

  const containerHeight = isLandscape ? Math.min(windowHeight * 0.72, 420) : isVRHeadsetMode ? 380 : 320;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View
        style={[
          styles.liquidFrameContainer,
          { height: containerHeight },
          isVRHeadsetMode && styles.vrContainer,
        ]}
      >
        <LinearGradient
          colors={['rgba(255, 255, 255, 0.45)', 'transparent']}
          style={styles.topRimLight}
        />

        <View style={styles.halfPane}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: leftSource }}
              style={[styles.stereoImage, { transform: leftTransform }]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.liquidBadge}>
            <Text style={styles.liquidBadgeText}>L (Left Eye)</Text>
          </View>
        </View>

        <View style={styles.centerDivider}>
          <LinearGradient
            colors={['rgba(100, 210, 255, 0.6)', 'rgba(10, 132, 255, 0.3)']}
            style={styles.dividerGlow}
          />
        </View>

        <View style={styles.halfPane}>
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: rightSource }}
              style={[styles.stereoImage, { transform: rightTransform }]}
              resizeMode="contain"
            />
          </View>
          <View style={styles.liquidBadge}>
            <Text style={styles.liquidBadgeText}>R (Right Eye)</Text>
          </View>
        </View>
      </View>

      <View style={styles.controlsBar}>
        <TouchableOpacity
          style={[styles.vrToggleButton, isVRHeadsetMode && styles.vrToggleButtonActive]}
          onPress={() => {
            hapticFeedback.light();
            onToggleVRMode?.();
          }}
        >
          <Text style={[styles.vrToggleText, isVRHeadsetMode && styles.vrToggleTextActive]}>
            {isVRHeadsetMode ? '👓 VR Headset Mode (Aktiv)' : '👓 VR Cardboard / Vision Pro Mode'}
          </Text>
        </TouchableOpacity>

        {isVRHeadsetMode && (
          <View style={styles.ipdRow}>
            <Text style={styles.ipdLabel}>IPD Augenabstand:</Text>
            <TouchableOpacity
              style={styles.ipdButton}
              onPress={() => {
                hapticFeedback.light();
                setIpdOffset((prev) => Math.max(prev - 2, -24));
              }}
            >
              <Text style={styles.ipdButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.ipdValue}>{ipdOffset} px</Text>
            <TouchableOpacity
              style={styles.ipdButton}
              onPress={() => {
                hapticFeedback.light();
                setIpdOffset((prev) => Math.min(prev + 2, 24));
              }}
            >
              <Text style={styles.ipdButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!isLandscape && <Text style={styles.hintText}>{t('sbs_explanation')}</Text>}
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
  vrContainer: {
    backgroundColor: '#000000',
    borderColor: '#222222',
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
    width: 2,
    height: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  dividerGlow: {
    width: 1,
    height: '92%',
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
  controlsBar: {
    marginTop: 10,
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  vrToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  vrToggleButtonActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: COLORS.blue,
  },
  vrToggleText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  vrToggleTextActive: {
    color: COLORS.cyan,
    fontWeight: '700',
  },
  ipdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ipdLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
  ipdButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ipdButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  ipdValue: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 46,
    textAlign: 'center',
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
