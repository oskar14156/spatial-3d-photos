import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { StereobaseGuidanceHUD } from './StereobaseGuidanceHUD';
import { HorizonLevelIndicator } from './HorizonLevelIndicator';
import { ChaChaReviewModal } from './ChaChaReviewModal';
import { calculateStereoBaseline, formatBaselineInstruction } from '../../utils/stereobaseCalculator';
import { SubjectPreset, SubjectPresetId, StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface ChaChaCameraProps {
  onCaptureComplete: (pair: StereoPair) => void;
  onClose: () => void;
}

export const ChaChaCamera: React.FC<ChaChaCameraProps> = ({
  onCaptureComplete,
  onClose,
}) => {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  // Cha-Cha Capture Steps: 1 = Left Eye, 2 = Right Eye
  const [captureStep, setCaptureStep] = useState<1 | 2>(1);
  const [leftPhotoUri, setLeftPhotoUri] = useState<string | null>(null);
  const [rightPhotoUri, setRightPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ghostOpacity, setGhostOpacity] = useState<number>(0.45);

  // Subject Distance & Baseline Calculator State
  const [selectedPresetId, setSelectedPresetId] = useState<SubjectPresetId>('portrait');
  const [customDistanceMeters, setCustomDistanceMeters] = useState<number>(2.0);

  // Review Modal State
  const [isReviewModalVisible, setIsReviewModalVisible] = useState<boolean>(false);

  const currentBaseline = calculateStereoBaseline(customDistanceMeters, 30);
  const instruction = formatBaselineInstruction(currentBaseline, 'de');

  const handleSelectPreset = (preset: SubjectPreset) => {
    setSelectedPresetId(preset.id);
    setCustomDistanceMeters(preset.defaultSubjectDistanceMeters);
  };

  const handleCapture = async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      hapticFeedback.heavy();
      setIsProcessing(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.92,
        skipProcessing: false,
      });

      if (!photo?.uri) {
        setIsProcessing(false);
        return;
      }

      if (captureStep === 1) {
        // Step 1: Left Photo Captured! Move to Step 2
        setLeftPhotoUri(photo.uri);
        setCaptureStep(2);
        setIsProcessing(false);
        hapticFeedback.success();
      } else {
        // Step 2: Right Photo Captured!
        setRightPhotoUri(photo.uri);
        setIsProcessing(false);
        setIsReviewModalVisible(true);
        hapticFeedback.success();
      }
    } catch (err) {
      console.error('Failed to take picture:', err);
      setIsProcessing(false);
    }
  };

  const handleResetStep = () => {
    hapticFeedback.medium();
    setCaptureStep(1);
    setLeftPhotoUri(null);
    setRightPhotoUri(null);
  };

  // Permission handling
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.blue} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permTitle}>{t('camera_permission_required')}</Text>
        <Text style={styles.permDesc}>{t('camera_permission_desc')}</Text>
        <TouchableOpacity style={styles.permButton} onPress={requestPermission}>
          <Text style={styles.permButtonText}>Kamerazugriff erlauben</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closePermButton} onPress={onClose}>
          <Text style={styles.closePermText}>{t('close')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const cameraHeight = isLandscape ? windowHeight : windowHeight * 0.52;

  return (
    <View style={[styles.container, isLandscape && styles.containerLandscape]}>
      {/* Live Camera Viewfinder */}
      <View style={[styles.cameraContainer, { height: cameraHeight }, isLandscape && styles.cameraLandscape]}>
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={styles.camera}
          facing="back"
        >
          {/* Grid Overlay */}
          <View style={styles.gridOverlay}>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
            <View style={styles.gridRow}>
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
              <View style={styles.gridCell} />
            </View>
          </View>

          {/* Onion Skin / Ghosting Overlay for Step 2 */}
          {captureStep === 2 && leftPhotoUri && (
            <View style={[styles.ghostOverlay, { opacity: ghostOpacity }]} pointerEvents="none">
              <Image source={{ uri: leftPhotoUri }} style={styles.ghostImage} resizeMode="cover" />
            </View>
          )}

          {/* Top Liquid Bar: Close Button, Step Badge, Horizon Level */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.liquidCircleButton}
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
            >
              <Text style={styles.circleButtonText}>✕</Text>
            </TouchableOpacity>

            {/* Step Status Pill */}
            <View style={[styles.liquidStepPill, captureStep === 2 && styles.liquidStepPillStep2]}>
              <Text style={styles.stepPillText}>
                {captureStep === 1 ? '1/2 LINKS' : '2/2 RECHTS'}
              </Text>
            </View>

            {/* Real-time Horizon Bubble Level */}
            <HorizonLevelIndicator />
          </View>

          {/* Step 2 Move Guidance Overlay */}
          {captureStep === 2 && (
            <View style={styles.step2GuideOverlay}>
              <View style={styles.liquidArrowBanner}>
                <Text style={styles.arrowSymbol}>⬅ ⬅ ⬅</Text>
                <Text style={styles.moveInstructionText}>
                  {instruction.hint}
                </Text>
                <Text style={styles.moveSubText}>
                  Bewege dich {instruction.formatted} nach links & richte das Geisterbild aus.
                </Text>
              </View>

              {/* Ghost Opacity Controller */}
              <View style={styles.ghostOpacityRow}>
                <Text style={styles.opacityLabel}>Ghost:</Text>
                {[0.25, 0.45, 0.65].map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[
                      styles.opacityPill,
                      ghostOpacity === val && styles.opacityPillActive,
                    ]}
                    onPress={() => {
                      hapticFeedback.selection();
                      setGhostOpacity(val);
                    }}
                  >
                    <Text
                      style={[
                        styles.opacityPillText,
                        ghostOpacity === val && styles.opacityPillTextActive,
                      ]}
                    >
                      {Math.round(val * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* In Landscape: Floating Shutter & Guidance Rails */}
          {isLandscape && (
            <View style={styles.landscapeSideControls}>
              <TouchableOpacity
                style={[
                  styles.shutterOuterRing,
                  captureStep === 2 && styles.shutterOuterRingStep2,
                ]}
                onPress={handleCapture}
                disabled={isProcessing}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.shutterInnerCircle,
                    captureStep === 2 && styles.shutterInnerCircleStep2,
                  ]}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="#000000" size="small" />
                  ) : (
                    <Text style={styles.shutterIcon}>
                      {captureStep === 1 ? '📸 L' : '📸 R'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}
        </CameraView>
      </View>

      {/* Bottom Control Deck (Portrait Mode) */}
      {!isLandscape && (
        <View style={styles.bottomDeck}>
          <StereobaseGuidanceHUD
            selectedPresetId={selectedPresetId}
            onSelectPreset={handleSelectPreset}
            customDistanceMeters={customDistanceMeters}
            onChangeDistance={setCustomDistanceMeters}
          />

          {/* Shutter Bar */}
          <View style={styles.shutterRow}>
            {captureStep === 2 ? (
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleResetStep}
              >
                <Text style={styles.retakeText}>↺ {t('camera_retake_step1')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 80 }} />
            )}

            {/* Main Camera Shutter Button */}
            <TouchableOpacity
              style={[
                styles.shutterOuterRing,
                captureStep === 2 && styles.shutterOuterRingStep2,
              ]}
              onPress={handleCapture}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.shutterInnerCircle,
                  captureStep === 2 && styles.shutterInnerCircleStep2,
                ]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="#000000" size="small" />
                ) : (
                  <Text style={styles.shutterIcon}>
                    {captureStep === 1 ? '📸 L' : '📸 R'}
                  </Text>
                )}
              </View>
            </TouchableOpacity>

            <View style={{ width: 80 }} />
          </View>
        </View>
      )}

      {/* Cha-Cha Review Modal */}
      {leftPhotoUri && rightPhotoUri && (
        <ChaChaReviewModal
          visible={isReviewModalVisible}
          leftUri={leftPhotoUri}
          rightUri={rightPhotoUri}
          subjectDistanceMeters={customDistanceMeters}
          baselineMeters={currentBaseline}
          onSave={(pair) => {
            setIsReviewModalVisible(false);
            onCaptureComplete(pair);
          }}
          onRetake={() => {
            setIsReviewModalVisible(false);
            handleResetStep();
          }}
          onClose={() => {
            setIsReviewModalVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  containerLandscape: {
    flexDirection: 'row',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  permDesc: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permButton: {
    backgroundColor: COLORS.blue,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  permButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  closePermButton: {
    marginTop: 16,
    padding: 8,
  },
  closePermText: {
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  cameraContainer: {
    width: '100%',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  cameraLandscape: {
    flex: 1,
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    opacity: 0.18,
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#FFFFFF',
  },
  gridCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#FFFFFF',
  },
  ghostOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  ghostImage: {
    width: '100%',
    height: '100%',
  },
  topControls: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  liquidCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(20, 20, 26, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  circleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  liquidStepPill: {
    backgroundColor: 'rgba(10, 132, 255, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  liquidStepPillStep2: {
    backgroundColor: 'rgba(48, 209, 88, 0.9)',
    borderColor: 'rgba(100, 255, 150, 0.4)',
  },
  stepPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  step2GuideOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    alignItems: 'center',
    gap: 8,
  },
  liquidArrowBanner: {
    backgroundColor: 'rgba(10, 10, 15, 0.85)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: COLORS.cyan,
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  arrowSymbol: {
    color: COLORS.cyan,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },
  moveInstructionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  moveSubText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  ghostOpacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 10, 15, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  opacityLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  opacityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  opacityPillActive: {
    backgroundColor: COLORS.cyan,
  },
  opacityPillText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  opacityPillTextActive: {
    color: '#000000',
  },
  landscapeSideControls: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -38 }],
    zIndex: 40,
  },
  bottomDeck: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 8,
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  retakeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  retakeText: {
    color: COLORS.red,
    fontSize: 12,
    fontWeight: '700',
  },
  shutterOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  shutterOuterRingStep2: {
    borderColor: COLORS.green,
    shadowColor: COLORS.green,
  },
  shutterInnerCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInnerCircleStep2: {
    backgroundColor: COLORS.green,
  },
  shutterIcon: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
});
