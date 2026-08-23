import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import type { StereoAlignment } from '../../types';
import { DEFAULT_ALIGNMENT } from '../../constants';
import { palette, radius, spacing, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import { Slider } from '../common/Slider';

type Props = {
  alignment: StereoAlignment;
  onChange: (alignment: StereoAlignment) => void;
};

/**
 * Fine stereo alignment. These corrections fix the small differences between
 * two hand-held shots — a bit of vertical drift, a degree of roll — that
 * otherwise make a pair uncomfortable to fuse.
 */
export function AlignmentPanel({ alignment, onChange }: Props) {
  const { t } = useTranslation();

  const set = <K extends keyof StereoAlignment>(
    key: K,
    value: StereoAlignment[K]
  ) => onChange({ ...alignment, [key]: value });

  const isDefault =
    alignment.horizontalDisparity === DEFAULT_ALIGNMENT.horizontalDisparity &&
    alignment.verticalOffset === DEFAULT_ALIGNMENT.verticalOffset &&
    alignment.rotationAngle === DEFAULT_ALIGNMENT.rotationAngle &&
    alignment.zoomScale === DEFAULT_ALIGNMENT.zoomScale &&
    alignment.invertEyes === DEFAULT_ALIGNMENT.invertEyes;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('adjustments_title')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('reset_alignment')}
          disabled={isDefault}
          onPress={() => {
            hapticFeedback.medium();
            onChange({ ...DEFAULT_ALIGNMENT });
          }}
          hitSlop={8}
        >
          <Text style={[styles.reset, isDefault && styles.resetDisabled]}>
            {t('reset_alignment')}
          </Text>
        </Pressable>
      </View>

      <Slider
        label={t('horizontal_disparity')}
        valueLabel={signed(alignment.horizontalDisparity, 'px')}
        value={alignment.horizontalDisparity}
        min={-50}
        max={50}
        step={1}
        originValue={0}
        onChange={(value) => set('horizontalDisparity', value)}
      />
      <Text style={styles.hint}>{t('convergence_hint')}</Text>

      <Slider
        label={t('vertical_offset')}
        valueLabel={signed(alignment.verticalOffset, 'px')}
        value={alignment.verticalOffset}
        min={-30}
        max={30}
        step={1}
        originValue={0}
        onChange={(value) => set('verticalOffset', value)}
      />

      <Slider
        label={t('rotation_angle')}
        valueLabel={`${alignment.rotationAngle > 0 ? '+' : ''}${alignment.rotationAngle.toFixed(1)}°`}
        value={alignment.rotationAngle}
        min={-5}
        max={5}
        step={0.1}
        originValue={0}
        onChange={(value) => set('rotationAngle', value)}
      />

      <Slider
        label={t('zoom_scale')}
        valueLabel={`${alignment.zoomScale.toFixed(2)}×`}
        value={alignment.zoomScale}
        min={0.85}
        max={1.15}
        step={0.01}
        originValue={1}
        onChange={(value) => set('zoomScale', value)}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{t('invert_eyes')}</Text>
        <Switch
          value={alignment.invertEyes}
          onValueChange={(value) => {
            hapticFeedback.light();
            set('invertEyes', value);
          }}
          trackColor={{ true: palette.green, false: palette.fillSubtle }}
        />
      </View>
    </View>
  );
}

function signed(value: number, unit: string) {
  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: radius.panel,
    padding: spacing.lg,
    backgroundColor: palette.fill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  heading: {
    ...type.headline,
    flex: 1,
    color: palette.label,
  },
  reset: {
    ...type.subheadline,
    fontWeight: '600',
    color: palette.blue,
  },
  resetDisabled: {
    color: palette.labelQuaternary,
  },
  hint: {
    ...type.caption,
    color: palette.labelTertiary,
    marginTop: -2,
    marginBottom: spacing.sm,
  },
  switchRow: {
    minHeight: 44,
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    ...type.callout,
    flex: 1,
    color: palette.label,
  },
});
