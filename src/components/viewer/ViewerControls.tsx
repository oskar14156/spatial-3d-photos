import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../common/Icon';
import type { AnaglyphColorMode, StereoPair, ViewMode, ViewerOptions } from '../../types';
import { type Palette, radius, type, useTheme, useThemedStyles } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import { Segmented } from '../common/Segmented';
import { Slider } from '../common/Slider';
import type { VideoHandle, VideoStatus } from './VideoSurface';
import { TiltIndicator } from './TiltIndicator';

type Props = {
  pair: StereoPair;
  mode: ViewMode;
  options: ViewerOptions;
  onChangeOptions: (patch: Partial<ViewerOptions>) => void;
  videoStatus: VideoStatus;
  videoRef: React.RefObject<VideoHandle | null>;
  /** Live gyro position, shared with the parallax surface. */
  tiltX: SharedValue<number>;
  onEnterFullscreen: () => void;
};

const WIGGLE_RATES = [6, 10, 15, 20];

/**
 * The one place mode-specific controls live. Keeping them out of the render
 * surfaces means the viewer frame has a single fixed size and nothing ever
 * gets clipped by its `overflow: hidden`.
 */
export function ViewerControls({
  pair,
  mode,
  options,
  onChangeOptions,
  videoStatus,
  videoRef,
  tiltX,
  onEnterFullscreen,
}: Props) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  if (pair.mediaType === 'video') {
    return (
      <VideoControls status={videoStatus} videoRef={videoRef} />
    );
  }

  switch (mode) {
    case 'wigglegram':
      return (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              options.wigglePlaying ? t('viewer_pause') : t('viewer_play')
            }
            onPress={() => {
              hapticFeedback.light();
              onChangeOptions({ wigglePlaying: !options.wigglePlaying });
            }}
            style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
          >
            <Icon
              name={options.wigglePlaying ? 'pause.fill' : 'play.fill'}
              size={15}
              color={palette.canvas}
              style={styles.roundGlyph}
            />
          </Pressable>

          <Text style={styles.rowLabel}>{t('viewer_speed')}</Text>

          <View style={styles.segmentedSlot}>
            <Segmented
              accessibilityLabel={t('viewer_speed')}
              value={String(options.wiggleFps)}
              items={WIGGLE_RATES.map((rate) => ({
                id: String(rate),
                label: `${rate}`,
              }))}
              onChange={(value) => onChangeOptions({ wiggleFps: Number(value) })}
            />
          </View>
        </View>
      );

    case 'anaglyph':
      return (
        <Segmented<AnaglyphColorMode>
          accessibilityLabel={t('anaglyph_mode_color')}
          value={options.anaglyphMode}
          items={[
            { id: 'color', label: t('anaglyph_mode_color') },
            { id: 'half_color', label: t('anaglyph_mode_half_color') },
            { id: 'mono', label: t('anaglyph_mode_pure') },
          ]}
          onChange={(value) => onChangeOptions({ anaglyphMode: value })}
        />
      );

    case 'sbs':
      return (
        <View>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: options.vrMode }}
            accessibilityLabel={t('viewer_vr_mode')}
            onPress={() => {
              hapticFeedback.light();
              onChangeOptions({ vrMode: !options.vrMode });
            }}
            style={({ pressed }) => [
              styles.toggleRow,
              options.vrMode && styles.toggleRowOn,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name="visionpro"
              size={17}
              color={options.vrMode ? palette.blue : palette.labelSecondary}
              style={styles.toggleGlyph}
            />
            <Text style={[styles.toggleLabel, options.vrMode && styles.toggleLabelOn]}>
              {t('viewer_vr_mode')}
            </Text>
            {options.vrMode && (
              <Icon name="checkmark" size={13} weight="semibold" color={palette.blue} />
            )}
          </Pressable>

          {options.vrMode && (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                hapticFeedback.medium();
                onEnterFullscreen();
              }}
              style={({ pressed }) => [
                styles.fullscreenRow,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name="arrow.up.left.and.arrow.down.right"
                size={16}
                weight="semibold"
                color={palette.onAccent}
              />
              <Text style={styles.fullscreenLabel}>
                {t('viewer_enter_fullscreen')}
              </Text>
            </Pressable>
          )}

          {options.vrMode && (
            <Slider
              label={t('viewer_ipd')}
              valueLabel={`${options.ipdOffset > 0 ? '+' : ''}${options.ipdOffset} px`}
              value={options.ipdOffset}
              min={-24}
              max={24}
              step={1}
              originValue={0}
              onChange={(value) => onChangeOptions({ ipdOffset: value })}
            />
          )}
        </View>
      );

    case 'parallax_tilt':
      return (
        <TiltIndicator
          tiltX={tiltX}
          leftLabel={t('viewer_eye_left')}
          rightLabel={t('viewer_eye_right')}
          hint={t('viewer_tilt_hint')}
        />
      );

    default:
      return null;
  }
}

function VideoControls({
  status,
  videoRef,
}: {
  status: VideoStatus;
  videoRef: React.RefObject<VideoHandle | null>;
}) {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const duration = status.duration > 0 ? status.duration : 1;

  return (
    <View>
      <Slider
        label={formatTime(status.time)}
        valueLabel={formatTime(status.duration)}
        value={Math.min(status.time, duration)}
        min={0}
        max={duration}
        step={0.1}
        onChange={(value) => videoRef.current?.seekTo(value)}
      />

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="-5s"
          hitSlop={10}
          onPress={() => videoRef.current?.seekBy(-5)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Icon name="gobackward.5" size={21} color={palette.label} style={styles.glyph} />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.playing ? t('viewer_pause') : t('viewer_play')}
          onPress={() => {
            hapticFeedback.light();
            if (status.playing) videoRef.current?.pause();
            else videoRef.current?.play();
          }}
          style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
        >
          <Icon
            name={status.playing ? 'pause.fill' : 'play.fill'}
            size={15}
            color={palette.canvas}
            style={styles.roundGlyph}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="+5s"
          hitSlop={10}
          onPress={() => videoRef.current?.seekBy(5)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Icon name="goforward.5" size={21} color={palette.label} style={styles.glyph} />
        </Pressable>

        <View style={styles.spacer} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={status.muted ? t('viewer_unmute') : t('viewer_mute')}
          hitSlop={10}
          onPress={() => videoRef.current?.setMuted(!status.muted)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Icon
            name={status.muted ? 'speaker.slash.fill' : 'speaker.wave.2.fill'}
            size={19}
            color={palette.label}
            style={styles.glyph}
          />
        </Pressable>
      </View>
    </View>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    fullscreenRow: {
      minHeight: 46,
      marginTop: 10,
      borderRadius: radius.control,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: palette.blue,
    },
    fullscreenLabel: {
      ...type.callout,
      fontWeight: '600',
      color: palette.onAccent,
    },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowLabel: {
    ...type.footnote,
    color: palette.labelSecondary,
  },
  segmentedSlot: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  glyph: {
    width: 24,
    height: 24,
  },
  roundButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundGlyph: {
    width: 17,
    height: 17,
  },
  pressed: {
    opacity: 0.6,
  },
  toggleRow: {
    minHeight: 46,
    paddingHorizontal: 14,
    borderRadius: radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.fillSubtler,
  },
  toggleRowOn: {
    backgroundColor: 'rgba(10,132,255,0.16)',
  },
  toggleGlyph: {
    width: 20,
    height: 20,
  },
  toggleLabel: {
    ...type.callout,
    flex: 1,
    color: palette.labelSecondary,
  },
  toggleLabelOn: {
    color: palette.label,
    fontWeight: '600',
  },
});
