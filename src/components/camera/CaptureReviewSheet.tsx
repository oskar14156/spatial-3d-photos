import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StereoPair, ViewMode } from '../../types';
import { DEFAULT_ALIGNMENT } from '../../constants';
import { palette, radius, spacing, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import { formatMetricDistance } from '../../utils/stereobaseCalculator';
import { baselineTolerance } from '../../utils/captureGuidance';
import { IOSSheet } from '../common/IOSSheet';
import { Segmented } from '../common/Segmented';
import { StereoViewer } from '../viewer/StereoViewer';

type Props = {
  visible: boolean;
  leftUri: string;
  rightUri: string;
  subjectDistanceMeters: number;
  /** What the 1/30 rule asked for. */
  baselineMeters: number;
  /** What world tracking says was actually travelled. */
  achievedBaselineMeters: number;
  onSave: (pair: StereoPair) => void;
  onRetake: () => void;
  onClose: () => void;
};

const PREVIEW_MODES: ViewMode[] = ['wigglegram', 'sbs', 'anaglyph'];

/**
 * Review step: preview the fused pair, name it, keep or retake. It also
 * reports the baseline that was actually achieved, which is the honest number
 * to judge the shot by.
 */
export function CaptureReviewSheet({
  visible,
  leftUri,
  rightUri,
  subjectDistanceMeters,
  baselineMeters,
  achievedBaselineMeters,
  onSave,
  onRetake,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<ViewMode>('wigglegram');

  const pair = useMemo<StereoPair>(
    () => ({
      // Stable across renders so the preview surfaces are not remounted while
      // the title is being typed.
      id: `capture_${leftUri}`,
      title: title.trim() || t('studio_untitled'),
      leftUri,
      rightUri,
      mediaType: 'photo',
      sourceType: 'camera_chacha',
      createdAt: Date.now(),
      subjectDistanceMeters,
      baselineDistanceMeters: achievedBaselineMeters || baselineMeters,
      alignment: { ...DEFAULT_ALIGNMENT },
    }),
    [
      achievedBaselineMeters,
      baselineMeters,
      leftUri,
      rightUri,
      subjectDistanceMeters,
      t,
      title,
    ]
  );

  const onTarget =
    Math.abs(achievedBaselineMeters - baselineMeters) <=
    baselineTolerance(baselineMeters);

  return (
    <IOSSheet visible={visible} title={t('review_title')} onClose={onClose}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 96 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.viewerFrame}>
            <StereoViewer
              pair={pair}
              mode={mode}
              options={{
                anaglyphMode: 'color',
                wiggleFps: 10,
                wigglePlaying: true,
                vrMode: false,
                ipdOffset: 0,
              }}
              onVideoStatus={noop}
              videoRef={noopRef}
            />
          </View>

          <Segmented<ViewMode>
            value={mode}
            onChange={setMode}
            items={PREVIEW_MODES.map((id) => ({
              id,
              label: t(`view_mode_${id}` as never),
            }))}
          />

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('review_name_placeholder')}
            placeholderTextColor={palette.labelTertiary}
            returnKeyType="done"
            accessibilityLabel={t('review_name_placeholder')}
          />

          <View style={styles.stats}>
            <Stat
              label={t('subject_distance_label')}
              value={formatMetricDistance(subjectDistanceMeters)}
            />
            <View style={styles.statDivider} />
            <Stat
              label={t('recommended_shift_label')}
              value={formatMetricDistance(baselineMeters)}
            />
            <View style={styles.statDivider} />
            <Stat
              label={t('guide_moved')}
              value={formatMetricDistance(achievedBaselineMeters)}
              tone={onTarget ? palette.green : palette.orange}
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hapticFeedback.light();
              onRetake();
            }}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{t('review_retake_button')}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => {
              hapticFeedback.success();
              onSave({ ...pair, title: title.trim() || t('studio_untitled') });
            }}
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{t('save')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </IOSSheet>
  );
}

function Stat({
  label,
  value,
  tone = palette.label,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function noop() {}
const noopRef = { current: null };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  viewerFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.viewer,
    overflow: 'hidden',
    backgroundColor: '#050505',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  input: {
    ...type.body,
    minHeight: 46,
    borderRadius: radius.control,
    paddingHorizontal: 14,
    color: palette.label,
    backgroundColor: palette.fill,
  },
  stats: {
    flexDirection: 'row',
    borderRadius: radius.group,
    paddingVertical: spacing.md,
    backgroundColor: palette.fill,
  },
  stat: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  statLabel: {
    ...type.caption,
    fontSize: 10,
    textAlign: 'center',
    color: palette.labelTertiary,
  },
  statValue: {
    ...type.headline,
    marginTop: 3,
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
    backgroundColor: palette.canvas,
  },
  secondary: {
    flex: 1,
    height: 50,
    borderRadius: radius.group,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.fillElevated,
  },
  secondaryText: { ...type.callout, fontWeight: '600', color: palette.label },
  primary: {
    flex: 1,
    height: 50,
    borderRadius: radius.group,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
  },
  primaryText: { ...type.callout, fontWeight: '700', color: palette.label },
  pressed: { opacity: 0.7 },
});
