import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { StereoPair, ViewMode } from '../../types';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils/haptics';

interface SpatialVideoPlayerProps {
  stereoPair: StereoPair;
  viewMode: ViewMode;
  isLandscape?: boolean;
  isVRMode?: boolean;
}

export const SpatialVideoPlayer: React.FC<SpatialVideoPlayerProps> = ({
  stereoPair,
  viewMode,
  isLandscape = false,
  isVRMode = false,
}) => {
  const leftVideoRef = useRef<Video | null>(null);
  const rightVideoRef = useRef<Video | null>(null);

  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [positionMs, setPositionMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(1000);
  const [isMuted, setIsMuted] = useState<boolean>(true);

  const { alignment } = stereoPair;
  const leftUri = alignment.invertEyes ? stereoPair.rightUri : stereoPair.leftUri;
  const rightUri = alignment.invertEyes ? stereoPair.leftUri : stereoPair.rightUri;

  const handleTogglePlay = async () => {
    hapticFeedback.light();
    if (isPlaying) {
      await leftVideoRef.current?.pauseAsync();
      await rightVideoRef.current?.pauseAsync();
      setIsPlaying(false);
    } else {
      await leftVideoRef.current?.playAsync();
      await rightVideoRef.current?.playAsync();
      setIsPlaying(true);
    }
  };

  const handleToggleMute = async () => {
    hapticFeedback.light();
    const newMuted = !isMuted;
    await leftVideoRef.current?.setIsMutedAsync(newMuted);
    setIsMuted(newMuted);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPositionMs(status.positionMillis);
      if (status.durationMillis) {
        setDurationMs(status.durationMillis);
      }
      setIsPlaying(status.isPlaying);
    }
  };

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

  const progressPercent = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      <View
        style={[
          styles.viewportContainer,
          isLandscape && styles.viewportLandscape,
          isVRMode && styles.viewportVR,
        ]}
      >
        {(viewMode === 'sbs' || viewMode === 'cross_eye') && (
          <View style={styles.dualVideoRow}>
            <View style={styles.halfVideoPane}>
              <Video
                ref={(ref) => {
                  leftVideoRef.current = ref;
                }}
                source={{ uri: viewMode === 'cross_eye' ? rightUri : leftUri }}
                style={[styles.videoElement, { transform: leftTransform }]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                isLooping
                isMuted={isMuted}
                onPlaybackStatusUpdate={onPlaybackStatusUpdate}
              />
              <View style={styles.eyeBadge}>
                <Text style={styles.eyeBadgeText}>
                  {viewMode === 'cross_eye' ? 'R (Cross)' : 'L (Left)'}
                </Text>
              </View>
            </View>

            <View style={styles.videoDivider} />

            <View style={styles.halfVideoPane}>
              <Video
                ref={(ref) => {
                  rightVideoRef.current = ref;
                }}
                source={{ uri: viewMode === 'cross_eye' ? leftUri : rightUri }}
                style={[styles.videoElement, { transform: rightTransform }]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                isLooping
                isMuted={true}
              />
              <View style={styles.eyeBadge}>
                <Text style={styles.eyeBadgeText}>
                  {viewMode === 'cross_eye' ? 'L (Cross)' : 'R (Right)'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {viewMode === 'anaglyph' && (
          <View style={styles.singleVideoPane}>
            <Video
              ref={(ref) => {
                leftVideoRef.current = ref;
              }}
              source={{ uri: leftUri }}
              style={[styles.videoElement, { transform: leftTransform }]}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isPlaying}
              isLooping
              isMuted={isMuted}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
            <View style={[styles.anaglyphFilter, { backgroundColor: 'rgba(255, 0, 0, 0.45)' }]} />

            <View style={styles.anaglyphOverlayLayer}>
              <Video
                ref={(ref) => {
                  rightVideoRef.current = ref;
                }}
                source={{ uri: rightUri }}
                style={[styles.videoElement, { transform: rightTransform }]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isPlaying}
                isLooping
                isMuted={true}
              />
              <View style={[styles.anaglyphFilter, { backgroundColor: 'rgba(0, 229, 255, 0.45)' }]} />
            </View>
          </View>
        )}

        {(viewMode === 'wigglegram' || viewMode === 'parallax_tilt') && (
          <View style={styles.singleVideoPane}>
            <Video
              ref={(ref) => {
                leftVideoRef.current = ref;
              }}
              source={{ uri: leftUri }}
              style={[styles.videoElement, { transform: leftTransform }]}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isPlaying}
              isLooping
              isMuted={isMuted}
              onPlaybackStatusUpdate={onPlaybackStatusUpdate}
            />
          </View>
        )}

        <View style={styles.spatialTagBadge}>
          <Text style={styles.spatialTagText}>🎥 iPhone Spatial Video 3D</Text>
        </View>
      </View>

      <View style={styles.videoControls}>
        <View style={styles.progressBarBackground}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={handleTogglePlay}>
            <Text style={styles.controlButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <Text style={styles.timeText}>
            {Math.floor(positionMs / 1000)}s / {Math.floor(durationMs / 1000)}s
          </Text>

          <TouchableOpacity style={styles.controlButton} onPress={handleToggleMute}>
            <Text style={styles.controlButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerLandscape: {
    flex: 1,
    height: '100%',
  },
  viewportContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#050507',
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
  viewportLandscape: {
    height: '85%',
  },
  viewportVR: {
    height: 380,
    backgroundColor: '#000000',
  },
  dualVideoRow: {
    flexDirection: 'row',
    width: '100%',
    height: '100%',
  },
  halfVideoPane: {
    flex: 1,
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleVideoPane: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    position: 'relative',
  },
  videoElement: {
    width: '100%',
    height: '100%',
  },
  videoDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  anaglyphFilter: {
    ...StyleSheet.absoluteFillObject,
  },
  anaglyphOverlayLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.85,
  },
  eyeBadge: {
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
  eyeBadgeText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
  },
  spatialTagBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10, 132, 255, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  spatialTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  videoControls: {
    width: '100%',
    marginTop: 10,
    gap: 6,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.cyan,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  timeText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
});
