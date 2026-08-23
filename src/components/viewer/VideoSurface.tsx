import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEventListener } from 'expo';
import type { StereoPair, ViewMode } from '../../types';
import { eyeTransforms, resolveEyes } from './eyeGeometry';

export type VideoHandle = {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  seekBy: (delta: number) => void;
  setMuted: (muted: boolean) => void;
};

export type VideoStatus = {
  playing: boolean;
  muted: boolean;
  time: number;
  duration: number;
};

type Props = {
  pair: StereoPair;
  mode: ViewMode;
  onStatus: (status: VideoStatus) => void;
  handleRef: React.Ref<VideoHandle>;
};

/** Drift beyond this many seconds between the eyes is resynchronised. */
const SYNC_TOLERANCE = 0.04;

/**
 * Plays a decoded stereo pair as two synchronised tracks.
 *
 * The left track is the master and the only one carrying audio — the native
 * splitter copies the source audio into it — so exactly two decoders run
 * instead of three, and there is no second audio stream to drift.
 */
export function VideoSurface({ pair, mode, onStatus, handleRef }: Props) {
  const eyes = resolveEyes(pair);
  const transforms = eyeTransforms(pair.alignment);
  const dual = mode === 'sbs' || mode === 'cross_eye';

  const left = useVideoPlayer(eyes.left, (player) => {
    player.loop = true;
    player.muted = false;
    player.timeUpdateEventInterval = 0.25;
    player.play();
  });

  const right = useVideoPlayer(eyes.right, (player) => {
    player.loop = true;
    // The right eye is a silent re-encode; muting it is belt and braces.
    player.muted = true;
    player.play();
  });

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const statusRef = useRef(onStatus);
  statusRef.current = onStatus;

  useEventListener(left, 'timeUpdate', ({ currentTime }) => {
    statusRef.current({
      playing,
      muted,
      time: currentTime,
      duration: left.duration || 0,
    });

    // Nudge the follower back onto the master rather than reseeking blindly:
    // a seek costs a keyframe decode, so only do it once drift is visible.
    if (Math.abs(right.currentTime - currentTime) > SYNC_TOLERANCE) {
      right.currentTime = currentTime;
    }
  });

  useEventListener(left, 'playingChange', ({ isPlaying }) => {
    setPlaying(isPlaying);
    if (isPlaying) right.play();
    else right.pause();
  });

  useEffect(() => {
    statusRef.current({ playing, muted, time: left.currentTime, duration: left.duration || 0 });
  }, [left, muted, playing]);

  useImperativeHandle(
    handleRef,
    () => ({
      play: () => {
        right.currentTime = left.currentTime;
        left.play();
        right.play();
      },
      pause: () => {
        left.pause();
        right.pause();
      },
      seekTo: (seconds) => {
        const target = clampTime(seconds, left.duration);
        left.currentTime = target;
        right.currentTime = target;
      },
      seekBy: (delta) => {
        const target = clampTime(left.currentTime + delta, left.duration);
        left.currentTime = target;
        right.currentTime = target;
      },
      setMuted: (next) => {
        left.muted = next;
        setMuted(next);
      },
    }),
    [left, right]
  );

  if (dual) {
    const nearPlayer = mode === 'cross_eye' ? right : left;
    const farPlayer = mode === 'cross_eye' ? left : right;
    const nearTransform = mode === 'cross_eye' ? transforms.right : transforms.left;
    const farTransform = mode === 'cross_eye' ? transforms.left : transforms.right;

    return (
      <View style={styles.row}>
        <View style={styles.pane}>
          <VideoView
            player={nearPlayer}
            style={[styles.fill, { transform: nearTransform }]}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
        <View style={styles.seam} />
        <View style={styles.pane}>
          <VideoView
            player={farPlayer}
            style={[styles.fill, { transform: farTransform }]}
            contentFit="contain"
            nativeControls={false}
          />
        </View>
      </View>
    );
  }

  return (
    <VideoView
      player={left}
      style={[styles.fill, { transform: transforms.left }]}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

function clampTime(value: number, duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return Math.max(0, value);
  return Math.min(duration, Math.max(0, value));
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  row: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  pane: {
    flex: 1,
    overflow: 'hidden',
  },
  seam: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
