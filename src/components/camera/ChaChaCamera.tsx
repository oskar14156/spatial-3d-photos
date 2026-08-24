import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
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

const ANDROID_MANUAL_MOTION: MotionEvent = {
  ...IDLE_MOTION,
  hasAnchor: true,
  tracking: 'unavailable',
};

/**
 * Guided two-shot ("Cha-Cha") stereo capture.
 *
 * On iOS the viewfinder is an ARKit session because world tracking measures
 * the sideways distance actually travelled between the two shots. Android
 * uses a stable plain-camera fallback; it keeps capture usable on devices
 * without the custom ARKit view.
 */
export const ChaChaCamera: React.FC<Props> = ({ onCaptureComplete, onClose }) => {
  const { t, language } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const isAndroid = Platform.OS === 'android';

  const captureRef = useRef<SpatialCaptureViewRef | null>(null);
  const androidCameraRef = useRef<CameraView | null>(null);

  const [permission, setPermission] = useState<boolean | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [leftUri, setLeftUri] = useState<string | null>(null);
  const [rightUri, setRightUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const [distanceMeters, setDistanceMeters] = useState(2);
  const [depthConfidence, setDepthConfidence] = useState<DepthConfidence>('low');
  const [availability, setAvailability] = useState<AvailabilityEvent>({
    worldTracking: !isAndroid,
    lidar: false,
  });
  const [trackingState, setTrackingState] = useState<TrackingState>(
    isAndroid ? 'unavailable' : 'initializing'
  );
  const [motion, setMotion] = useState<MotionEvent>(
    isAndroid ? ANDROID_MANUAL_MOTION : IDLE_MOTION
  );
  const [cameraReady, setCameraReady] = useState(!isAndroid);
  const [cameraLuminance, setCameraLuminance] = useState<number | null>(null);
  // Manual capture is the safe default. Auto capture is opt-in via the
  // clearly labelled AUTO AN/AUS control and never surprises a manual press.
  const [autoShutter, setAutoShutter] = useState(false);
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
    const spatialView = captureRef.current;
    if (
      busy ||
      (isAndroid ? !androidCameraRef.current || !cameraReady : !spatialView)
    ) {
      return;
    }

    setBusy(true);
    try {
      hapticFeedback.heavy();
      const uri = isAndroid
        ? (await androidCameraRef.current!.takePictureAsync({ quality: 0.95 })).uri
        : await spatialView!.capturePhoto();

      if (step === 1) {
        // Zero the displacement origin the instant the first frame is taken,
        // so the guidance measures from exactly where the shot was made.
        if (!isAndroid) await spatialView!.setAnchor();
        setLeftUri(uri);
        setMotion(isAndroid ? ANDROID_MANUAL_MOTION : { ...IDLE_MOTION, hasAnchor: true });
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
  }, [androidCameraRef, busy, cameraReady, isAndroid, step, t]);

  const reset = useCallback(() => {
    captureRef.current?.clearAnchor();
    setStep(1);
    setLeftUri(null);
    setRightUri(null);
    setReviewing(false);
    setMotion(isAndroid ? ANDROID_MANUAL_MOTION : IDLE_MOTION);
    setCameraLuminance(null);
  }, [isAndroid]);

  /* ---------------------------------------------------------------------- */
  /* Auto shutter                                                           */
  /* ---------------------------------------------------------------------- */

  const wasReady = useRef(false);

  const manualCapture = useCallback(() => {
    // A deliberate shutter press must not be followed by a second automatic
    // shot just because the current position already happens to be ready.
    wasReady.current = guidance.canShoot;
    void capture();
  }, [capture, guidance.canShoot]);

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
  const cameraTextColor =
    cameraLuminance !== null
      ? cameraLuminance > 0.55
        ? '#111114'
        : '#FFFFFF'
      : palette.label;
  const cameraSecondaryTextColor =
    cameraLuminance !== null
      ? cameraLuminance > 0.55
        ? 'rgba(17,17,20,0.68)'
        : 'rgba(255,255,255,0.76)'
      : palette.labelSecondary;

  return (
    <View style={styles.root}>
      {isAndroid ? (
        <CameraView
          ref={androidCameraRef}
          facing="back"
          mode="picture"
          style={StyleSheet.absoluteFill}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => {
            setCameraReady(false);
            Alert.alert(t('camera_error_title'), event.message);
          }}
        />
      ) : (
        <SpatialCaptureView
          ref={captureRef}
          active
          style={StyleSheet.absoluteFill}
          onAvailabilityChange={(event) => setAvailability(event.nativeEvent)}
          onTrackingStateChange={(event) => setTrackingState(event.nativeEvent.state)}
          onMotionChange={(event) => {
            setMotion(event.nativeEvent);
            const luminance = event.nativeEvent.luminance;
            if (typeof luminance === 'number' && Number.isFinite(luminance)) {
              setCameraLuminance(luminance);
            }
          }}
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
      )}

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
          color={cameraTextColor}
          onPress={onClose}
        />

        <NativeGlass style={styles.stepPill}>
          <Text style={[styles.stepText, { color: cameraTextColor }]}>
            {step === 1 ? t('guide_step_left') : t('guide_step_right')}
          </Text>
        </NativeGlass>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            autoShutter ? t('guide_auto_disable') : t('guide_auto_enable')
          }
          accessibilityState={{ selected: autoShutter }}
          onPress={() => {
            hapticFeedback.light();
            // Allow enabling auto capture while the phone is already in the
            // target position; the edge-trigger will fire on the next effect.
            wasReady.current = false;
            setAutoShutter((value) => !value);
          }}
          style={({ pressed }) => [styles.autoButton, pressed && styles.pressed]}
        >
          <NativeGlass
            interactive
            tintColor={autoShutter ? 'rgba(10,132,255,0.28)' : undefined}
            style={[styles.autoPill, autoShutter && styles.autoPillOn]}
          >
            <Icon
              name={autoShutter ? 'bolt.badge.automatic.fill' : 'bolt.slash.fill'}
              color={autoShutter ? palette.blue : cameraSecondaryTextColor}
              size={16}
              weight="semibold"
            />
            <Text style={[styles.autoText, { color: cameraTextColor }]}>
              {autoShutter ? t('guide_auto_on') : t('guide_auto_off')}
            </Text>
          </NativeGlass>
        </Pressable>
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
            color={level ? palette.green : cameraSecondaryTextColor}
            style={styles.levelGlyph}
          />
          <Text
            style={[
              styles.levelText,
              { color: level ? palette.green : cameraSecondaryTextColor },
              level && styles.levelTextOk,
            ]}
          >
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
            landscape ? styles.guidanceWrapLandscape : null,
            { bottom: insets.bottom + (landscape ? 18 : 184) },
          ]}
        >
          <CaptureGuidanceHUD
            guidance={guidance}
            targetBaseline={targetBaseline}
            trackingOk={trackingOk}
            foregroundColor={cameraTextColor}
            secondaryColor={cameraSecondaryTextColor}
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
              <Text style={[styles.metricLabel, { color: cameraSecondaryTextColor }]}>
                {availability.lidar ? t('lidar_title') : t('subject_label')}
              </Text>
              <Text style={[styles.metricValue, { color: cameraTextColor }]}>
                {formatMetricDistance(distanceMeters)}
              </Text>
              {availability.lidar && (
                <Text style={[styles.metricFootnote, { color: cameraSecondaryTextColor }]}>
                  {t(`lidar_confidence_${depthConfidence}` as const)}
                </Text>
              )}
            </View>

            <View style={styles.metricDivider} />

            <View style={[styles.metric, styles.metricRight]}>
              <Text style={[styles.metricLabel, { color: cameraSecondaryTextColor }]}>
                {t('stereo_base_label')}
              </Text>
              <Text style={[styles.metricValue, { color: cameraTextColor }]}>
                {instruction.formatted}
              </Text>
              <Text
                style={[styles.metricFootnote, { color: cameraSecondaryTextColor }]}
                numberOfLines={1}
              >
                {instruction.hint}
              </Text>
            </View>
          </View>

          {step === 1 && (
            <View style={styles.manualDistanceRow}>
              <View style={styles.manualDistanceCopy}>
                <Text style={[styles.manualDistanceLabel, { color: cameraTextColor }]}>
                  {t('manual_distance_label')}
                </Text>
                <Text
                  style={[styles.manualDistanceHint, { color: cameraSecondaryTextColor }]}
                  numberOfLines={1}
                >
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
                  style={[styles.manualDistanceInput, { color: cameraTextColor }]}
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
                    { color: cameraSecondaryTextColor },
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
                  secondaryColor={cameraSecondaryTextColor}
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
                    color={cameraTextColor}
                    size={17}
                    style={styles.sideGlyph}
                  />
                  <Text style={[styles.sideActionText, { color: cameraTextColor }]}>
                    {t('capture_retake')}
                  </Text>
                </Pressable>
              )}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                step === 1 ? t('camera_shutter_left') : t('camera_shutter_right')
              }
              accessibilityState={{ disabled: busy }}
              onPress={manualCapture}
              disabled={busy || (isAndroid && !cameraReady)}
              style={({ pressed }) => [
                styles.shutterOuter,
                {
                  borderColor:
                    step === 2 && guidance.canShoot ? palette.green : cameraTextColor,
                },
                pressed && styles.shutterPressed,
              ]}
            >
              <View style={[styles.shutterInner, { backgroundColor: cameraTextColor }]}>
                {busy ? (
                  <ActivityIndicator
                    color={
                      cameraLuminance !== null && cameraLuminance > 0.55
                        ? '#FFFFFF'
                        : '#111114'
                    }
                  />
                ) : null}
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
  secondaryColor,
  onPress,
}: {
  id: SubjectPresetId;
  label: string;
  selected: boolean;
  secondaryColor: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();
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
      <Text
        style={[
          styles.presetText,
          { color: selected ? palette.canvas : secondaryColor },
          selected && styles.presetTextSelected,
        ]}
      >
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
  autoButton: { height: 44, minWidth: 44 },
  autoPill: {
    height: 44,
    minWidth: 44,
    borderRadius: 22,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  autoPillOn: { paddingHorizontal: 11 },
  autoText: { ...type.eyebrow, fontSize: 9, color: palette.label, fontWeight: '700' },

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
  guidanceWrapLandscape: {
    right: 430,
    alignItems: 'stretch',
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
