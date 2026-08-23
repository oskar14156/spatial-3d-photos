import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { palette, radius, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { formatMetricDistance } from '../../utils/stereobaseCalculator';
import type { Guidance } from '../../utils/captureGuidance';
import { NativeGlass } from '../common/NativeGlass';

type Props = {
  guidance: Guidance;
  targetBaseline: number;
  /** Null while ARKit is still deciding whether it can track. */
  trackingOk: boolean;
};

/**
 * The live "how far have I actually moved" readout.
 *
 * The bar is the whole point: it maps the measured sideways displacement onto
 * the required stereo base, so the photographer walks until the marker lands
 * in the target window instead of guessing at "about two steps".
 */
export function CaptureGuidanceHUD({ guidance, targetBaseline, trackingOk }: Props) {
  const { t } = useTranslation();

  if (!trackingOk) {
    return (
      <NativeGlass style={styles.card}>
        <View style={styles.headlineRow}>
          <SymbolView
            name="exclamationmark.triangle.fill"
            size={16}
            tintColor={palette.orange}
            style={styles.glyph}
          />
          <Text style={styles.headline}>{t('guide_tracking_unavailable')}</Text>
        </View>
        <Text style={styles.hint}>{t('guide_tracking_hint')}</Text>
      </NativeGlass>
    );
  }

  const tone = toneFor(guidance);

  const headline =
    guidance.status === 'ready'
      ? t('guide_ready')
      : guidance.status === 'overshoot'
      ? t('guide_overshoot')
      : guidance.status === 'unlevel' || guidance.status === 'drifted'
      ? t('guide_hold_level')
      : `${t(
          guidance.direction === 'right' ? 'guide_move_right' : 'guide_move_left'
        )} · ${t('guide_remaining', {
          value: formatMetricDistance(Math.abs(guidance.remaining)),
        })}`;

  return (
    <NativeGlass style={styles.card}>
      <View style={styles.headlineRow}>
        <SymbolView
          name={iconFor(guidance)}
          size={16}
          tintColor={tone}
          style={styles.glyph}
        />
        <Text style={[styles.headline, { color: tone }]} numberOfLines={1}>
          {headline}
        </Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${guidance.progress * 100}%`, backgroundColor: tone },
          ]}
        />
        {/* The target window the marker has to land inside. */}
        <View style={styles.targetWindow} />
      </View>

      <View style={styles.readoutRow}>
        <View>
          <Text style={styles.readoutLabel}>{t('guide_moved')}</Text>
          <Text style={styles.readoutValue}>
            {formatMetricDistance(Math.abs(guidance.lateral))}
          </Text>
        </View>

        <View style={styles.readoutRight}>
          <Text style={styles.readoutLabel}>{t('guide_target')}</Text>
          <Text style={styles.readoutValue}>
            {formatMetricDistance(targetBaseline)}
          </Text>
        </View>
      </View>
    </NativeGlass>
  );
}

function toneFor(guidance: Guidance) {
  switch (guidance.status) {
    case 'ready':
      return palette.green;
    case 'overshoot':
    case 'unlevel':
    case 'drifted':
      return palette.orange;
    default:
      return palette.label;
  }
}

function iconFor(guidance: Guidance) {
  switch (guidance.status) {
    case 'ready':
      return 'checkmark.circle.fill' as const;
    case 'overshoot':
      return 'arrow.left.circle.fill' as const;
    case 'unlevel':
      return 'level.fill' as const;
    case 'drifted':
      return 'arrow.up.and.down.circle.fill' as const;
    default:
      return 'arrow.right.circle.fill' as const;
  }
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 520,
    borderRadius: radius.panel,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  glyph: {
    width: 18,
    height: 18,
  },
  headline: {
    ...type.callout,
    flex: 1,
    fontWeight: '600',
    color: palette.label,
  },
  hint: {
    ...type.caption,
    color: palette.labelSecondary,
  },
  track: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  targetWindow: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    // 10% of the bar mirrors the 10%-of-baseline positional tolerance.
    width: '10%',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.55)',
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  readoutRight: {
    alignItems: 'flex-end',
  },
  readoutLabel: {
    ...type.eyebrow,
    fontSize: 9,
    color: palette.labelTertiary,
  },
  readoutValue: {
    ...type.headline,
    marginTop: 1,
    color: palette.label,
    fontVariant: ['tabular-nums'],
  },
});
