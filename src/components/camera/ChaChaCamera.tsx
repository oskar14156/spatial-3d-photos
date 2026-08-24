import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Icon } from '../common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SpatialCaptureView,
  type AvailabilityEvent,
  type DepthConfidence,
  type MotionEvent,
  type SpatialCaptureViewRef,
  type TrackingState,
} from '../../../modules/spatial-capture';
import type { StereoPair, SubjectPresetId } from '../../types';
import { Palette, radius, type, useTheme, useThemedStyles } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import {
  SUBJECT_PRESETS,
  formatBaselineInstruction,
  formatMetricDistance,
  recommendStereoBaseline,
} from '../../utils/stereobaseCalculator';
import {
  evaluateGuidance,
  LEVEL_TOLERANCE_DEGREES,
  type Guidance,
} from '../../utils/captureGuidance';
import { IOSIconButton } from '../common/IOSIconButton';
import { NativeGlass } from '../common/NativeGlass';
import { CaptureGuidanceHUD } from './CaptureGuidanceHUD';
import { HorizonLine } from './HorizonLine';
import { CaptureReviewSheet } from './CaptureReviewSheet';

type Props = {
  onCaptureComplete: (pair: StereoPair) => void;
  onClose: () => void;
};

const IDLE_MOTION: MotionEvent = {
  hasAnchor: false,
  lateral: 0,
  vertical: 0,
  forward: 0,
  rollDegrees: 0,
  tracking: 'initializing',
};

/**
 * Guided two-shot ("Cha-Cha") stereo capture.
 *
 * The viewfinder is an ARKit session rather than a plain camera preview,
 * because world tracking is what makes the promise of this screen real: it
 * measures the sideways distance actually travelled between the two shots
 * instead of asking the photographer to pace it out. LiDAR subject distance
 * and the horizon come from the same session.
 */
export const ChaChaCamera: React.FC<Props> = ({ onCaptureComplete, onClose }) => {
  const { t, language } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const captureRef = useRef<SpatialCaptureViewRef | null>(null);

  const [permission, setPermission] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [leftUri, setLeftUri] = useState<string | null>(null);
  const [rightUri, setRightUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [distanceMeters, setDistanceMeters] = useState(2);
  const [depthConfidence, setDepthConfidence] = useState<DepthConfidence>('low');
  const [availability, setAvailability] = useState<AvailabilityEvent>({
    worldTracking: true,
    lidar: false,
  });
  const [trackingState, setTrackingState] = useState<TrackingState>('initializing');
  const [motion, setMotion] = useState<MotionEvent>(IDLE_MOTION);
  const [autoShutter, setAutoShutter] = useState(true);
  const [manualDistance, setManualDistance] = useState(false);
  const [manualDistanceText, setManualDistanceText] = useState('2');

  const selectedDistance = manualDistance
    ? parseDistanceInput(manualDistanceText) ?? distanceMeters
    : distanceMeters;
  const recommendation = useMemo(
    () => recommendStereoBaseline(selectedDistance),
    [selectedDistance]
  );
  const targetBaseline = recommendation.baselineMeters;

  const guidance: Guidance = useMemo(
    () => evaluateGuidance(motion, targetBaseline),
    [motion, targetBaseline]
  );

  const instruction = formatBaselineInstruction(targetBaseline, language);

  const trackingOk =
    availability.worldTracking &&
    trackingState !== 'unavailable' &&
    trackingState !== 'failed';

  useEffect(() => {
    Camera.requestCameraPermissionsAsync().then((result) =>
      setPermission(result.granted)
    );
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Capture                                                                */
  /* ---------------------------------------------------------------------- */

  const capture = useCallback(async () => {
    const view = captureRef.current;
    if (!view || busy) return;

    setBusy(true);
    try {
      hapticFeedback.heavy();
      const uri = await view.capturePhoto();

      if (step === 1) {
        // Zero the displacement origin the instant the first frame is taken,
        // so the guidance measures from exactly where the shot was made.
        await view.setAnchor();
        setLeftUri(uri);
        setMotion({ ...IDLE_MOTION, hasAnchor: true });
        setStep(2);
      } else {
        setRightUri(uri);
        setReviewing(true);
      }
      hapticFeedback.success();
    } catch (error) {
      hapticFeedback.warning();
      Alert.alert(
        t('camera_error_title'),
        error instanceof Error ? error.message : t('camera_error_body')
      );
    } finally {
      setBusy(false);
    }
  }, [busy, step, t]);

  const reset = useCallback(() => {
    captureRef.current?.clearAnchor();
    setStep(1);
    setLeftUri(null);
    setRightUri(null);
    setReviewing(false);
    setMotion(IDLE_MOTION);
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Auto shutter                                                           */
  /* ---------------------------------------------------------------------- */

  const wasReady = useRef(false);

  useEffect(() => {
    if (step !== 2) {
      wasReady.current = false;
      return;
    }

    const ready = guidance.canShoot;
    if (ready && !wasReady.current) {
      hapticFeedback.success();
      if (autoShutter && !busy) capture();
    }
    wasReady.current = ready;
  }, [autoShutter, busy, capture, guidance.canShoot, step]);

  /* ---------------------------------------------------------------------- */
  /* Permission gate                                                        */
  /* ---------------------------------------------------------------------- */

  if (permission === null) {
    return (
      <View style={styles.permission}>
        <ActivityIndicator color={palette.blue} />
      </View>
    );
  }

  if (!permission) {
    return (
      <View
        style={[
          styles.permission,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
      >
        <Icon
          name="camera.fill"
          color={palette.label}
          size={36}
          style={styles.permissionIcon}
        />
        <Text style={styles.permissionTitle}>{t('camera_permission_required')}</Text>
        <Text style={styles.permissionBody}>{t('camera_permission_body')}</Text>
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.permissionPrimary, pressed && styles.pressed]}
          onPress={() =>
            Camera.requestCameraPermissionsAsync().then((result) =>
              setPermission(result.granted)
            )
          }
        >
          <Text style={styles.permissionPrimaryText}>{t('camera_permission_allow')}</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.permissionCancel}>{t('cancel')}</Text>
        </Pressable>
      </View>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Viewfinder                                                             */
  /* ---------------------------------------------------------------------- */

  const level = Math.abs(motion.rollDegrees) <= LEVEL_TOLERANCE_DEGREES;

  return (
    <View style={styles.root}>
      <SpatialCaptureView
        ref={captureRef}
        active
        style={StyleSheet.absoluteFill}
        onAvailabilityChange={(event) => setAvailability(event.nativeEvent)}
        onTrackingStateChange={(event) => setTrackingState(event.nativeEvent.state)}
        onMotionChange={(event) => setMotion(event.nativeEvent)}
        onDistanceChange={(event) => {
          // Only follow LiDAR while framing the first shot; locking the
          // distance afterwards keeps the target baseline from moving under
          // the photographer as they walk.
          if (step === 1 && !manualDistance && Number.isFinite(event.nativeEvent.meters)) {
            setDistanceMeters(event.nativeEvent.meters);
          }
          setDepthConfidence(event.nativeEvent.confidence);
        }}
      />

      {/* Onion skin of the first shot, for matching the framing. */}
      {step === 2 && leftUri && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: leftUri }}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, styles.ghost]}
          />
        </View>
      )}

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={[styles.gridLineV, { left: '33.333%' }]} />
        <View style={[styles.gridLineV, { left: '66.666%' }]} />
        <View style={[styles.gridLineH, { top: '33.333%' }]} />
        <View style={[styles.gridLineH, { top: '66.666%' }]} />
      </View>

      {/* Centre reticle doubles as the LiDAR sampling point. */}
      <View pointerEvents="none" style={styles.reticleWrap}>
        <View style={[styles.reticle, level && styles.reticleLevel]} />
      </View>

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <IOSIconButton
          symbol="xmark"
          accessibilityLabel={t('close')}
          onPress={onClose}
        />

        <NativeGlass style={styles.stepPill}>
          <Text style={styles.stepText}>
            {step === 1 ? t('guide_step_left') : t('guide_step_right')}
          </Text>
        </NativeGlass>

        <IOSIconButton
          symbol="bolt.badge.automatic.fill"
          accessibilityLabel={t('guide_auto_capture')}
          selected={autoShutter}
          onPress={() => setAutoShutter((value) => !value)}
        />
      </View>

      <HorizonLine rollDegrees={motion.rollDegrees} />

      <View
        pointerEvents="none"
        style={[styles.levelWrap, { top: insets.top + (landscape ? 58 : 74) }]}
      >
        <NativeGlass style={styles.levelPill}>
          <Icon
            name="level.fill"
            size={11}
            color={level ? palette.green : palette.labelSecondary}
            style={styles.levelGlyph}
          />
          <Text style={[styles.levelText, level && styles.levelTextOk]}>
            {level
              ? 'LEVEL'
              : `${motion.rollDegrees > 0 ? '+' : ''}${motion.rollDegrees.toFixed(1)}°`}
          </Text>
        </NativeGlass>
      </View>

      {step === 2 && (
        <View
          style={[
            styles.guidanceWrap,
            { bottom: insets.bottom + (landscape ? 96 : 184) },
          ]}
        >
          <CaptureGuidanceHUD
            guidance={guidance}
            targetBaseline={targetBaseline}
            trackingOk={trackingOk}
          />
        </View>
      )}

      <View
        style={[
          styles.dockWrap,
          { bottom: insets.bottom + 10 },
          landscape && styles.dockWrapLandscape,
        ]}
      >
        <NativeGlass style={styles.dock}>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>
                {availability.lidar ? t('lidar_title') : t('subject_label')}
              </Text>
              <Text style={styles.metricValue}>
                {formatMetricDistance(distanceMeters)}
              </Text>
              {availability.lidar && (
                <Text style={styles.metricFootnote}>
                  {t(`lidar_confidence_${depthConfidence}` as const)}
                </Text>
              )}
            </View>

            <View style={styles.metricDivider} />

            <View style={[styles.metric, styles.metricRight]}>
              <Text style={styles.metricLabel}>{t('stereo_base_label')}</Text>
              <Text style={styles.metricValue}>{instruction.formatted}</Text>
              <Text style={styles.metricFootnote} numberOfLines={1}>
                {instruction.hint}
              </Text>
            </View>
          </View>

          {step === 1 && (
            <View style={styles.manualDistanceRow}>
              <View style={styles.manualDistanceCopy}>
                <Text style={styles.manualDistanceLabel}>
                  {t('manual_distance_label')}
                </Text>
                <Text style={styles.manualDistanceHint} numberOfLines={1}>
                  {t('manual_distance_hint')}
                </Text>
              </View>
              {manualDistance ? (
                <TextInput
                  accessibilityLabel={t('manual_distance_label')}
                  keyboardType="decimal-pad"
                  value={manualDistanceText}
                  onChangeText={(value) => {
                    setManualDistanceText(value);
                    const parsed = parseDistanceInput(value);
                    if (parsed !== undefined) setDistanceMeters(parsed);
                  }}
                  placeholder={t('manual_distance_placeholder')}
                  placeholderTextColor={palette.labelTertiary}
                  selectTextOnFocus
                  style={styles.manualDistanceInput}
                />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: manualDistance }}
                onPress={() => {
                  hapticFeedback.selection();
                  if (!manualDistance) {
                    setManualDistanceText(formatManualDistance(distanceMeters));
                  }
                  setManualDistance((value) => !value);
                }}
                style={({ pressed }) => [
                  styles.manualDistanceButton,
                  manualDistance && styles.manualDistanceButtonSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.manualDistanceButtonText,
                    manualDistance && styles.manualDistanceButtonTextSelected,
                  ]}
                >
                  {t('manual_override')}
                </Text>
              </Pressable>
            </View>
          )}

          {step === 1 && !landscape && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presets}
            >
              {SUBJECT_PRESETS.map((preset) => (
                <PresetChip
                  key={preset.id}
                  id={preset.id}
                  label={t(preset.nameKey as never)}
                  selected={isNear(distanceMeters, preset.defaultSubjectDistanceMeters)}
                  onPress={() => {
                    hapticFeedback.selection();
                    setManualDistance(true);
                    setManualDistanceText(formatManualDistance(preset.defaultSubjectDistanceMeters));
                    setDistanceMeters(preset.defaultSubjectDistanceMeters);
                  }}
                />
              ))}
            </ScrollView>
          )}

          <View style={styles.shutterRow}>
            <View style={styles.shutterSide}>
              {step === 2 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('capture_retake')}
                  onPress={reset}
                  style={({ pressed }) => [styles.sideAction, pressed && styles.pressed]}
                >
                  <Icon
                    name="arrow.counterclockwise"
                    color={palette.label}
                    size={17}
                    style={styles.sideGlyph}
                  />
                  <Text style={styles.sideActionText}>{t('capture_retake')}</Text>
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                step === 1 ? t('camera_shutter_left') : t('camera_shutter_right')
              }
              accessibilityState={{ disabled: busy }}
              onPress={capture}
              disabled={busy}
              style={({ pressed }) => [
                styles.shutterOuter,
                step === 2 && guidance.canShoot && styles.shutterReady,
                pressed && styles.shutterPressed,
              ]}
            >
              <View style={styles.shutterInner}>
                {busy ? <ActivityIndicator color={palette.canvas} /> : null}
              </View>
            </Pressable>

            <View style={styles.shutterSide} />
          </View>
        </NativeGlass>
      </View>

      {leftUri && rightUri && (
        <CaptureReviewSheet
          visible={reviewing}
          leftUri={leftUri}
          rightUri={rightUri}
          subjectDistanceMeters={distanceMeters}
          baselineMeters={targetBaseline}
          achievedBaselineMeters={Math.abs(motion.lateral)}
          onSave={(pair) => {
            setReviewing(false);
            onCaptureComplete(pair);
          }}
          onRetake={reset}
          onClose={() => setReviewing(false)}
        />
      )}
    </View>
  );
};

function PresetChip({
  id,
  label,
  selected,
  onPress,
}: {
  id: SubjectPresetId;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      key={id}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.preset,
        selected && styles.presetSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.presetText, selected && styles.presetTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Presets are matched loosely so a LiDAR reading can still light one up. */
function isNear(value: number, target: number) {
  return Math.abs(value - target) <= Math.max(0.02, target * 0.05);
}

function parseDistanceInput(value: string): number | undefined {
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0.05 && parsed <= 100_000
    ? parsed
    : undefined;
}

function formatManualDistance(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

const createStyles = (palette: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },

  permission: {
    flex: 1,
    backgroundColor: palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionIcon: { width: 44, height: 44, marginBottom: 18 },
  permissionTitle: { ...type.title2, fontSize: 26, color: palette.label },
  permissionBody: {
    ...type.body,
    color: palette.labelSecondary,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permissionPrimary: {
    backgroundColor: palette.blue,
    borderRadius: radius.control,
    paddingHorizontal: 22,
    paddingVertical: 13,
    marginBottom: 16,
  },
  permissionPrimaryText: { ...type.headline, color: palette.label },
  permissionCancel: { ...type.body, fontWeight: '600', color: palette.blue },

  ghost: { opacity: 0.36 },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  reticleWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reticle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  reticleLevel: { borderColor: palette.green },

  topBar: {
    position: 'absolute',
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepPill: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { ...type.eyebrow, color: palette.label },

  levelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  levelPill: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  levelGlyph: { width: 12, height: 12 },
  levelText: {
    ...type.eyebrow,
    fontSize: 10,
    color: palette.labelSecondary,
    fontVariant: ['tabular-nums'],
  },
  levelTextOk: { color: palette.green },

  guidanceWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
  },

  dockWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  dockWrapLandscape: { left: undefined, right: 14, width: 400 },
  dock: {
    width: '100%',
    maxWidth: 620,
    borderRadius: radius.viewer,
    padding: 12,
  },
  metricsRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 2 },
  manualDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  manualDistanceCopy: { flex: 1, minWidth: 0 },
  manualDistanceLabel: { ...type.caption, color: palette.label },
  manualDistanceHint: { ...type.caption, fontSize: 10, color: palette.labelTertiary },
  manualDistanceInput: {
    width: 78,
    height: 34,
    borderRadius: radius.control,
    paddingHorizontal: 9,
    paddingVertical: 0,
    textAlign: 'right',
    color: palette.label,
    backgroundColor: 'rgba(255,255,255,0.1)',
    fontVariant: ['tabular-nums'],
  },
  manualDistanceButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radius.control,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  manualDistanceButtonSelected: { backgroundColor: palette.label },
  manualDistanceButtonText: { ...type.caption, color: palette.labelSecondary, fontWeight: '600' },
  manualDistanceButtonTextSelected: { color: palette.canvas },
  metric: { flex: 1 },
  metricRight: { alignItems: 'flex-end' },
  metricLabel: { ...type.eyebrow, fontSize: 9, color: palette.labelTertiary },
  metricValue: {
    ...type.title3,
    marginTop: 2,
    color: palette.label,
    fontVariant: ['tabular-nums'],
  },
  metricFootnote: { ...type.caption, fontSize: 10, color: palette.labelTertiary },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginHorizontal: 12,
    backgroundColor: palette.separator,
  },

  presets: { gap: 7, paddingTop: 12, paddingBottom: 4 },
  preset: {
    minHeight: 30,
    justifyContent: 'center',
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  presetSelected: { backgroundColor: palette.label },
  presetText: { ...type.caption, color: palette.labelSecondary },
  presetTextSelected: { color: palette.canvas, fontWeight: '600' },

  shutterRow: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shutterSide: { width: 92, alignItems: 'center' },
  sideAction: { alignItems: 'center', gap: 3, padding: 4 },
  sideGlyph: { width: 20, height: 20 },
  sideActionText: { ...type.caption, fontSize: 11, color: palette.label },
  shutterOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: palette.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterReady: { borderColor: palette.green },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.label,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: { transform: [{ scale: 0.94 }] },

  pressed: { opacity: 0.65 },
});
