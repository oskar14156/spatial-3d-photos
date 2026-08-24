import React, { useEffect } from 'react';
import { Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import { useSharedValue } from 'react-native-reanimated';
import type { StereoPair, ViewMode, ViewerOptions } from '../../types';
import { mediaPalette, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import { Icon } from '../common/Icon';
import { StereoViewer } from './StereoViewer';
import type { VideoHandle, VideoStatus } from './VideoSurface';

type Props = {
  visible: boolean;
  pair: StereoPair;
  mode: ViewMode;
  options: ViewerOptions;
  onClose: () => void;
};

const noop = () => {};

/**
 * Edge-to-edge presentation for headset viewing.
 *
 * A stereo pair in a phone holder has to fill the panel: any margin, rounded
 * corner or status bar shows up as a bright edge inside the lenses, and the
 * two eye images must sit at fixed positions relative to the physical
 * screen — not inside a card that happens to be on it. So this deliberately
 * breaks the usual layout: no safe-area insets, no chrome, pure black, locked
 * to landscape, and the screen kept awake because nothing is being touched.
 */
export function ImmersiveViewer({ visible, pair, mode, options, onClose }: Props) {
  const { t } = useTranslation();
  const tiltX = useSharedValue(0);
  const videoRef = React.useRef<VideoHandle | null>(null);

  useEffect(() => {
    if (!visible) return;

    // A headset holder is landscape; rotating by hand mid-session is not an
    // option once the phone is inside one.
    void ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE
    );

    return () => {
      void ScreenOrientation.unlockAsync();
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="fade"
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeepAwake />
      <StatusBar hidden />

      <View style={styles.root}>
        <StereoViewer
          pair={pair}
          mode={mode}
          options={options}
          onVideoStatus={noop as (status: VideoStatus) => void}
          videoRef={videoRef}
          tiltX={tiltX}
        />

        {/* Small, dim, and in a corner: bright enough to find by touch,
            dark enough not to reflect in the lenses. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('viewer_exit_fullscreen')}
          hitSlop={16}
          onPress={() => {
            hapticFeedback.light();
            onClose();
          }}
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
        >
          <Icon name="xmark" size={15} color="rgba(255,255,255,0.55)" />
        </Pressable>

        <Text style={styles.hint}>{t('viewer_fullscreen_hint')}</Text>
      </View>
    </Modal>
  );
}

/** Split out so the hook only runs while the immersive view is mounted. */
function KeepAwake() {
  useKeepAwake();
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  close: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  pressed: { opacity: 0.5 },
  hint: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    ...type.caption,
    fontSize: 10,
    color: 'rgba(255,255,255,0.22)',
  },
});
