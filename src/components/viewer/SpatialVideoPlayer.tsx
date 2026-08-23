import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { StereoPair, ViewMode } from '../../types';
import { NativeGlass } from '../common/NativeGlass';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  stereoPair: StereoPair;
  viewMode: ViewMode;
  isLandscape?: boolean;
  isVRMode?: boolean;
};

export const SpatialVideoPlayer: React.FC<Props> = ({
  stereoPair,
  viewMode,
}) => {
  const inverted = stereoPair.alignment.invertEyes;
  const leftUri = inverted ? stereoPair.rightUri : stereoPair.leftUri;
  const rightUri = inverted ? stereoPair.leftUri : stereoPair.rightUri;

  const left = useVideoPlayer(leftUri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const right = useVideoPlayer(rightUri, (player) => {
    player.loop = true;
    player.muted = true;
    player.play();
  });

  const audio = useVideoPlayer(stereoPair.originalUri || leftUri, (player) => {
    player.loop = true;
    player.muted = false;
    player.play();
  });

  const [playing, setPlaying] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const master = left.currentTime || 0;
      const d = left.duration || 1;
      setTime(master);
      setDuration(d);

      if (Math.abs((right.currentTime || 0) - master) > 0.045) {
        right.currentTime = master;
      }
      if (Math.abs((audio.currentTime || 0) - master) > 0.080) {
        audio.currentTime = master;
      }
    }, 120);

    return () => clearInterval(timer);
  }, [audio, left, right]);

  const leftTransform = useMemo(
    () => [
      { translateX: -stereoPair.alignment.horizontalDisparity / 2 },
      { translateY: -stereoPair.alignment.verticalOffset / 2 },
      { rotate: `${-stereoPair.alignment.rotationAngle / 2}deg` },
      { scale: stereoPair.alignment.zoomScale },
    ],
    [stereoPair.alignment]
  );

  const rightTransform = useMemo(
    () => [
      { translateX: stereoPair.alignment.horizontalDisparity / 2 },
      { translateY: stereoPair.alignment.verticalOffset / 2 },
      { rotate: `${stereoPair.alignment.rotationAngle / 2}deg` },
      { scale: stereoPair.alignment.zoomScale },
    ],
    [stereoPair.alignment]
  );

  const togglePlay = () => {
    hapticFeedback.light();
    if (playing) {
      left.pause();
      right.pause();
      audio.pause();
    } else {
      const master = left.currentTime || 0;
      right.currentTime = master;
      audio.currentTime = master;
      left.play();
      right.play();
      audio.play();
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    hapticFeedback.light();
    audio.muted = !muted;
    setMuted(!muted);
  };

  const seek = (delta: number) => {
    const target = Math.max(0, Math.min(duration, time + delta));
    left.currentTime = target;
    right.currentTime = target;
    audio.currentTime = target;
  };

  const cross = viewMode === 'cross_eye';

  return (
    <View style={styles.root}>
      <View style={styles.viewport}>
        {(viewMode === 'sbs' || viewMode === 'cross_eye') && (
          <View style={styles.dual}>
            <View style={styles.eye}>
              <VideoView
                player={cross ? right : left}
                style={[styles.video, { transform: leftTransform }]}
                contentFit="contain"
                nativeControls={false}
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.eye}>
              <VideoView
                player={cross ? left : right}
                style={[styles.video, { transform: rightTransform }]}
                contentFit="contain"
                nativeControls={false}
              />
            </View>
          </View>
        )}

        {viewMode !== 'sbs' && viewMode !== 'cross_eye' && (
          <VideoView
            player={left}
            style={[styles.video, { transform: leftTransform }]}
            contentFit="contain"
            nativeControls={false}
          />
        )}

        <NativeGlass style={styles.badge}>
          <SymbolView name="viewfinder.rectangular" size={11} tintColor="#FFFFFF" />
          <Text style={styles.badgeText}>
            {stereoPair.spatialEncoding === 'mv-hevc' ? 'MV-HEVC' : 'STEREO VIDEO'}
          </Text>
        </NativeGlass>
      </View>

      <View style={styles.scrubber}>
        <View
          style={[
            styles.progress,
            { width: `${Math.max(0, Math.min(100, (time / duration) * 100))}%` },
          ]}
        />
      </View>

      <View style={styles.controls}>
        <Pressable onPress={() => seek(-5)} hitSlop={8}>
          <SymbolView name="gobackward.5" size={20} tintColor="#FFFFFF" />
        </Pressable>
        <Pressable onPress={togglePlay} style={styles.play}>
          <SymbolView
            name={playing ? 'pause.fill' : 'play.fill'}
            size={18}
            tintColor="#000000"
          />
        </Pressable>
        <Pressable onPress={() => seek(5)} hitSlop={8}>
          <SymbolView name="goforward.5" size={20} tintColor="#FFFFFF" />
        </Pressable>

        <Text style={styles.time}>
          {formatTime(time)} / {formatTime(duration)}
        </Text>

        <Pressable onPress={toggleMute} hitSlop={8}>
          <SymbolView
            name={muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            size={19}
            tintColor="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00';
  const value = Math.max(0, Math.floor(seconds));
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  viewport: {
    width: '100%',
    height: 320,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  dual: {
    flex: 1,
    flexDirection: 'row',
  },
  eye: {
    flex: 1,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    height: 27,
    paddingHorizontal: 9,
    borderRadius: 13.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.65,
  },
  scrubber: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginTop: 10,
  },
  progress: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  controls: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 17,
    paddingHorizontal: 5,
  },
  play: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  time: {
    flex: 1,
    color: 'rgba(235,235,245,0.52)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
});
