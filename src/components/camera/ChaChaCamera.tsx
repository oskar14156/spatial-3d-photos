import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChaChaReviewModal } from './ChaChaReviewModal';
import { HorizonLevelIndicator } from './HorizonLevelIndicator';
import { IOSIconButton } from '../common/IOSIconButton';
import { NativeGlass } from '../common/NativeGlass';
import {
  SUBJECT_PRESETS,
  formatBaselineInstruction,
  recommendStereoBaseline,
} from '../../utils/stereobaseCalculator';
import type { StereoPair } from '../../types';
import { hapticFeedback } from '../../utils/haptics';
import { SpatialDepthView } from '../../../modules/spatial-depth';

type Props = {
  onCaptureComplete: (pair: StereoPair) => void;
  onClose: () => void;
};

export const ChaChaCamera: React.FC<Props> = ({
  onCaptureComplete,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [step, setStep] = useState<1 | 2>(1);
  const [leftUri, setLeftUri] = useState<string | null>(null);
  const [rightUri, setRightUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [ghostOpacity] = useState(0.36);

  const [distanceMeters, setDistanceMeters] = useState(2);
  const [depthMode, setDepthMode] = useState(false);
  const [lidarAvailable, setLidarAvailable] = useState<boolean | null>(null);
  const [depthConfidence, setDepthConfidence] =
    useState<'low' | 'medium' | 'high'>('low');

  const rec = useMemo(
    () => recommendStereoBaseline(distanceMeters),
    [distanceMeters]
  );
  const instruction = formatBaselineInstruction(rec.baselineMeters, 'de');

  const capture = async () => {
    if (!cameraRef.current || busy || depthMode) return;
    try {
      setBusy(true);
      hapticFeedback.heavy();
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
        skipProcessing: false,
      });
      if (!photo?.uri) return;

      if (step === 1) {
        setLeftUri(photo.uri);
        setStep(2);
        hapticFeedback.success();
      } else {
        setRightUri(photo.uri);
        setReview(true);
        hapticFeedback.success();
      }
    } catch (error) {
      Alert.alert('Camera error', 'The photo could not be captured.');
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setStep(1);
    setLeftUri(null);
    setRightUri(null);
    setReview(false);
  };

  if (!permission) {
    return <View style={styles.permission}><ActivityIndicator color="#0A84FF" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permission, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <SymbolView name="camera.fill" tintColor="#FFFFFF" size={36} style={styles.permissionIcon} />
        <Text style={styles.permissionTitle}>Camera access</Text>
        <Text style={styles.permissionBody}>
          Spatial3D needs the rear camera for stereoscopic capture.
        </Text>
        <Pressable style={styles.permissionPrimary} onPress={requestPermission}>
          <Text style={styles.permissionPrimaryText}>Allow Camera</Text>
        </Pressable>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.permissionCancel}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {depthMode ? (
        <SpatialDepthView
          active
          style={StyleSheet.absoluteFill}
          onAvailabilityChange={(event) =>
            setLidarAvailable(event.nativeEvent.available)
          }
          onDistanceChange={(event) => {
            setDistanceMeters(event.nativeEvent.meters);
            setDepthConfidence(event.nativeEvent.confidence);
          }}
        />
      ) : (
        <CameraView
          ref={(ref) => { cameraRef.current = ref; }}
          style={StyleSheet.absoluteFill}
          facing="back"
        />
      )}

      {!depthMode && step === 2 && leftUri && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: leftUri }}
            resizeMode="cover"
            style={[StyleSheet.absoluteFill, { opacity: ghostOpacity }]}
          />
        </View>
      )}

      {!depthMode && <View pointerEvents="none" style={styles.grid}>
        <View style={[styles.gridLineV, { left: '33.333%' }]} />
        <View style={[styles.gridLineV, { left: '66.666%' }]} />
        <View style={[styles.gridLineH, { top: '33.333%' }]} />
        <View style={[styles.gridLineH, { top: '66.666%' }]} />
      </View>}

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <IOSIconButton symbol="xmark" accessibilityLabel="Close camera" onPress={onClose} />
        <NativeGlass style={styles.stepPill}>
          <Text style={styles.stepText}>
            {depthMode ? 'LiDAR DISTANCE' : step === 1 ? 'LEFT · 1 OF 2' : 'RIGHT · 2 OF 2'}
          </Text>
        </NativeGlass>
        <IOSIconButton
          symbol={depthMode ? 'camera.fill' : 'ruler.fill'}
          accessibilityLabel={depthMode ? 'Return to camera' : 'Measure with LiDAR'}
          selected={depthMode}
          onPress={() => setDepthMode((v) => !v)}
        />
      </View>

      {!depthMode && (
        <View
          pointerEvents="none"
          style={[
            styles.level,
            { top: insets.top + (landscape ? 56 : 72) },
          ]}
        >
          <HorizonLevelIndicator />
        </View>
      )}

      {depthMode && (
        <View style={styles.depthCenter} pointerEvents="none">
          <View style={styles.reticleOuter}>
            <View style={styles.reticleInner} />
          </View>
          <NativeGlass style={styles.depthReadout}>
            <Text style={styles.depthValue}>
              {lidarAvailable === false ? 'LiDAR unavailable' : `${distanceMeters.toFixed(distanceMeters < 10 ? 2 : 1)} m`}
            </Text>
            <Text style={styles.depthMeta}>
              {lidarAvailable === false
                ? 'Use a manual distance preset'
                : `${depthConfidence.toUpperCase()} CONFIDENCE · aim at subject`}
            </Text>
          </NativeGlass>
        </View>
      )}

      {step === 2 && !depthMode && (
        <View style={[styles.moveCardWrap, { bottom: insets.bottom + (landscape ? 92 : 172) }]}>
          <NativeGlass style={styles.moveCard}>
            <View>
              <Text style={styles.moveEyebrow}>MOVE SIDEWAYS</Text>
              <Text style={styles.moveValue}>{instruction.formatted}</Text>
            </View>
            <Text style={styles.moveHint}>{instruction.hint}</Text>
          </NativeGlass>
        </View>
      )}

      <View
        style={[
          styles.bottomWrap,
          { bottom: insets.bottom + 10 },
          landscape && styles.bottomWrapLandscape,
        ]}
      >
        <NativeGlass style={styles.bottomGlass}>
          <View style={styles.distanceRow}>
            <Pressable
              onPress={() => setDepthMode(true)}
              style={styles.distanceButton}
            >
              <SymbolView name="ruler.fill" tintColor="#0A84FF" size={15} />
              <Text style={styles.distanceText}>
                {distanceMeters < 10 ? distanceMeters.toFixed(2) : distanceMeters.toFixed(0)} m
              </Text>
              <Text style={styles.distanceLabel}>subject</Text>
            </Pressable>

            <View style={styles.baselineDivider} />

            <View style={styles.baselineSummary}>
              <Text style={styles.baselineLabel}>STEREO BASE</Text>
              <Text style={styles.baselineValue}>{instruction.formatted}</Text>
            </View>
          </View>

          {!landscape && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presets}
            >
              {SUBJECT_PRESETS.map((preset) => {
                const active =
                  Math.abs(distanceMeters - preset.defaultSubjectDistanceMeters) < 0.001;
                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      setDistanceMeters(preset.defaultSubjectDistanceMeters);
                      hapticFeedback.selection();
                    }}
                    style={[styles.preset, active && styles.presetActive]}
                  >
                    <Text style={[styles.presetText, active && styles.presetTextActive]}>
                      {preset.id === 'macro'
                        ? 'Macro'
                        : preset.id === 'portrait'
                        ? 'Portrait'
                        : preset.id === 'room'
                        ? 'Room'
                        : preset.id === 'architecture'
                        ? 'Building'
                        : 'Mountain'}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.shutterRow}>
            <View style={styles.sideAction}>
              {step === 2 && !depthMode ? (
                <Pressable onPress={reset} style={styles.smallAction}>
                  <SymbolView name="arrow.counterclockwise" tintColor="#FFFFFF" size={17} />
                  <Text style={styles.smallActionText}>Retake</Text>
                </Pressable>
              ) : null}
            </View>

            {depthMode ? (
              <Pressable
                onPress={() => {
                  hapticFeedback.success();
                  setDepthMode(false);
                }}
                style={styles.useDistanceButton}
              >
                <Text style={styles.useDistanceText}>Use Distance</Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={step === 1 ? 'Capture left image' : 'Capture right image'}
                onPress={capture}
                disabled={busy}
                style={({ pressed }) => [
                  styles.shutterOuter,
                  pressed && styles.shutterPressed,
                ]}
              >
                <View style={styles.shutterInner}>
                  {busy ? <ActivityIndicator color="#000" /> : null}
                </View>
              </Pressable>
            )}

            <View style={styles.sideAction} />
          </View>
        </NativeGlass>
      </View>

      {leftUri && rightUri && (
        <ChaChaReviewModal
          visible={review}
          leftUri={leftUri}
          rightUri={rightUri}
          subjectDistanceMeters={distanceMeters}
          baselineMeters={rec.baselineMeters}
          onSave={(pair) => {
            setReview(false);
            onCaptureComplete(pair);
          }}
          onRetake={reset}
          onClose={() => setReview(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  permission: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  permissionIcon: { width: 44, height: 44, marginBottom: 18 },
  permissionTitle: { color: '#FFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.7 },
  permissionBody: { color: 'rgba(235,235,245,0.60)', fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  permissionPrimary: { backgroundColor: '#0A84FF', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 13, marginBottom: 16 },
  permissionPrimaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  permissionCancel: { color: '#0A84FF', fontSize: 16, fontWeight: '600' },

  grid: { ...StyleSheet.absoluteFillObject },
  gridLineV: { position: 'absolute', top: 0, bottom: 0, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.20)' },
  gridLineH: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.20)' },

  topBar: { position: 'absolute', left: 14, right: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepPill: { height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: '#FFF', fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },

  level: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },

  depthCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  reticleOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center' },
  reticleInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
  depthReadout: { marginTop: 18, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center' },
  depthValue: { color: '#FFF', fontSize: 28, fontWeight: '700', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  depthMeta: { color: 'rgba(235,235,245,0.65)', marginTop: 3, fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },

  moveCardWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  moveCard: { width: '100%', maxWidth: 520, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18 },
  moveEyebrow: { color: '#30D158', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  moveValue: { color: '#FFF', fontSize: 24, fontWeight: '700', letterSpacing: -0.5, marginTop: 1 },
  moveHint: { flex: 1, color: 'rgba(235,235,245,0.72)', textAlign: 'right', fontSize: 12, lineHeight: 16 },

  bottomWrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bottomWrapLandscape: { left: undefined, right: 14, width: 410 },
  bottomGlass: { width: '100%', maxWidth: 620, borderRadius: 28, padding: 12 },
  distanceRow: { height: 45, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  distanceButton: { flexDirection: 'row', alignItems: 'baseline', gap: 5, flex: 1 },
  distanceText: { color: '#FFF', fontSize: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  distanceLabel: { color: 'rgba(235,235,245,0.55)', fontSize: 11, fontWeight: '600' },
  baselineDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 9, backgroundColor: 'rgba(255,255,255,0.12)' },
  baselineSummary: { flex: 1, alignItems: 'flex-end' },
  baselineLabel: { color: 'rgba(235,235,245,0.45)', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  baselineValue: { color: '#FFF', marginTop: 1, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },

  presets: { gap: 7, paddingVertical: 8 },
  preset: { borderRadius: 13, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  presetActive: { backgroundColor: 'rgba(10,132,255,0.22)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(90,170,255,0.55)' },
  presetText: { color: 'rgba(235,235,245,0.66)', fontSize: 12, fontWeight: '600' },
  presetTextActive: { color: '#FFF' },

  shutterRow: { height: 72, marginTop: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideAction: { width: 92, alignItems: 'center' },
  smallAction: { alignItems: 'center', gap: 3 },
  smallActionText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
  shutterOuter: { width: 68, height: 68, borderRadius: 34, borderWidth: 3, borderColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  useDistanceButton: { minWidth: 150, height: 48, borderRadius: 24, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' },
  useDistanceText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
