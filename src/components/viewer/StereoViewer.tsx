import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { StyleSheet, View } from 'react-native';
import type { StereoPair, ViewMode, ViewerOptions } from '../../types';
import { useTranslation } from '../../i18n/useTranslation';
import {
  AnaglyphSurface,
  CrossEyeSurface,
  SplitSurface,
  SurfaceMessage,
} from './PhotoSurfaces';
import { ParallaxSurface } from './ParallaxSurface';
import { WiggleSurface } from './WiggleSurface';
import { VideoSurface, type VideoHandle, type VideoStatus } from './VideoSurface';

type Props = {
  pair: StereoPair;
  mode: ViewMode;
  options: ViewerOptions;
  onVideoStatus: (status: VideoStatus) => void;
  videoRef: React.Ref<VideoHandle>;
  /** Live gyro position for the parallax mode, shared with its controls. */
  tiltX: SharedValue<number>;
};

/**
 * Chooses a rendering surface for the current pair and mode.
 *
 * Each branch is a distinct component, so switching pair types unmounts one
 * surface and mounts another. That matters: the previous implementation
 * returned early from *inside* a surface when the pair happened to be a video,
 * which changed the number of hooks that component called between renders and
 * red-screened as soon as you selected a video after a photo.
 */
export function StereoViewer({
  pair,
  mode,
  options,
  onVideoStatus,
  videoRef,
  tiltX,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.fill}>
      {pair.mediaType === 'video' ? (
        <VideoSurface
          key={`${pair.id}-${mode}`}
          pair={pair}
          mode={mode}
          onStatus={onVideoStatus}
          handleRef={videoRef}
        />
      ) : (
        renderPhotoSurface()
      )}
    </View>
  );

  function renderPhotoSurface() {
    switch (mode) {
      case 'sbs':
        return (
          <SplitSurface
            pair={pair}
            ipdOffset={options.vrMode ? options.ipdOffset : 0}
          />
        );
      case 'cross_eye':
        return <CrossEyeSurface pair={pair} />;
      case 'anaglyph':
        return <AnaglyphSurface pair={pair} mode={options.anaglyphMode} />;
      case 'parallax_tilt':
        return <ParallaxSurface pair={pair} tiltX={tiltX} />;
      case 'wigglegram':
        return (
          <WiggleSurface
            pair={pair}
            fps={options.wiggleFps}
            playing={options.wigglePlaying}
          />
        );
      default:
        return <SurfaceMessage text={t('error')} />;
    }
  }
}

/** Video only has a meaningful rendering for these modes. */
export const VIDEO_MODES: ViewMode[] = ['sbs', 'cross_eye'];

export function isModeSupported(pair: StereoPair, mode: ViewMode): boolean {
  return pair.mediaType === 'photo' || VIDEO_MODES.includes(mode);
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
