import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../components/common/Header';
import { SegmentedControl, SegmentOption } from '../components/common/SegmentedControl';
import { SplitEyeSBSView } from '../components/viewer/SplitEyeSBSView';
import { CrossEyeView } from '../components/viewer/CrossEyeView';
import { Anaglyph3DView } from '../components/viewer/Anaglyph3DView';
import { Wigglegram3DView } from '../components/viewer/Wigglegram3DView';
import { ParallaxTilt3DView } from '../components/viewer/ParallaxTilt3DView';
import { StereoCalibrationOverlay } from '../components/viewer/StereoCalibrationOverlay';
import { ChaChaCamera } from '../components/camera/ChaChaCamera';
import { DemoShowcaseSelector } from '../components/gallery/DemoShowcaseSelector';
import { SavedProjectsList } from '../components/gallery/SavedProjectsList';
import { MediaImporterModal } from '../components/importer/MediaImporterModal';
import { ExportModal } from '../components/export/ExportModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { LiquidGlassView } from '../components/common/LiquidGlassView';
import { LiquidGlassButton } from '../components/common/LiquidGlassButton';
import { StereoPair, ViewMode, LanguageCode } from '../types';
import { DEMO_STEREO_PAIRS, COLORS } from '../constants';
import { t, setLanguage } from '../i18n/translations';
import {
  loadSavedStereoPairs,
  saveStereoPair,
  deleteStereoPair,
  loadLanguagePreference,
} from '../utils/storage';
import { hapticFeedback } from '../utils/haptics';

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isLandscape = windowWidth > windowHeight;

  // Active Stereo Pair State
  const [stereoPairs, setStereoPairs] = useState<StereoPair[]>(DEMO_STEREO_PAIRS);
  const [currentPair, setCurrentPair] = useState<StereoPair>(DEMO_STEREO_PAIRS[0]);

  // Viewing Modes
  const [activeViewMode, setActiveViewMode] = useState<ViewMode>('wigglegram');
  const [showAdjustments, setShowAdjustments] = useState<boolean>(false);
  const [isVRHeadsetMode, setIsVRHeadsetMode] = useState<boolean>(false);

  // Modals & Navigation
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isImporterVisible, setIsImporterVisible] = useState<boolean>(false);
  const [isExportVisible, setIsExportVisible] = useState<boolean>(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState<boolean>(false);
  const [, setCurrentLanguage] = useState<LanguageCode>('de');

  // Load Persisted Data on Launch
  useEffect(() => {
    async function init() {
      const savedLang = await loadLanguagePreference();
      setLanguage(savedLang);
      setCurrentLanguage(savedLang);

      const savedPairs = await loadSavedStereoPairs();
      if (savedPairs.length > 0) {
        setStereoPairs(savedPairs);
        setCurrentPair(savedPairs[0]);
      }
    }
    init();
  }, []);

  const handleSelectStereoPair = (pair: StereoPair) => {
    setCurrentPair(pair);
  };

  const handleCaptureComplete = async (newPair: StereoPair) => {
    setIsCameraActive(false);
    await saveStereoPair(newPair);
    setStereoPairs((prev) => [newPair, ...prev]);
    setCurrentPair(newPair);
  };

  const handleImportComplete = async (newPair: StereoPair) => {
    await saveStereoPair(newPair);
    setStereoPairs((prev) => [newPair, ...prev]);
    setCurrentPair(newPair);
  };

  const handleDeletePair = async (pairId: string) => {
    await deleteStereoPair(pairId);
    setStereoPairs((prev) => {
      const filtered = prev.filter((p) => p.id !== pairId);
      if (currentPair.id === pairId && filtered.length > 0) {
        setCurrentPair(filtered[0]);
      }
      return filtered;
    });
  };

  const viewModeOptions: SegmentOption<ViewMode>[] = [
    { id: 'wigglegram', label: t('view_mode_wigglegram') },
    { id: 'sbs', label: t('view_mode_sbs') },
    { id: 'cross_eye', label: t('view_mode_cross_eye') },
    { id: 'anaglyph', label: t('view_mode_anaglyph') },
    { id: 'parallax_tilt', label: t('view_mode_parallax_tilt') },
  ];

  if (isCameraActive) {
    return (
      <View style={[styles.fullScreen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ChaChaCamera
          onCaptureComplete={handleCaptureComplete}
          onClose={() => setIsCameraActive(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Liquid Glass Header */}
      <Header
        title={t('app_title')}
        subtitle={currentPair.title}
        mediaTypeTag={currentPair.mediaType === 'video' ? '🎥 Spatial Video' : undefined}
        leftAction={{
          icon: <Text style={styles.headerIcon}>⚙️</Text>,
          onPress: () => setIsSettingsVisible(true),
        }}
        rightSecondaryAction={{
          icon: <Text style={styles.headerIcon}>✂️</Text>,
          onPress: () => setIsImporterVisible(true),
        }}
        rightAction={{
          icon: <Text style={styles.headerIcon}>📤</Text>,
          onPress: () => setIsExportVisible(true),
        }}
      />

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.scrollInner, isLandscape && styles.scrollInnerLandscape]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top 3D Mode Selector Pills */}
        <View style={styles.segmentedWrapper}>
          <SegmentedControl
            options={viewModeOptions}
            selectedId={activeViewMode}
            onSelect={setActiveViewMode}
            scrollable={true}
          />
        </View>

        {/* Central 3D Interactive Viewer Card */}
        <LiquidGlassView
          style={[styles.viewerGlassCard, isLandscape && styles.viewerGlassCardLandscape]}
          glowColor={COLORS.liquidGlassGlow}
          borderRadius={24}
        >
          {activeViewMode === 'wigglegram' && (
            <Wigglegram3DView stereoPair={currentPair} />
          )}

          {activeViewMode === 'sbs' && (
            <SplitEyeSBSView
              stereoPair={currentPair}
              isVRHeadsetMode={isVRHeadsetMode}
              onToggleVRMode={() => setIsVRHeadsetMode(!isVRHeadsetMode)}
            />
          )}

          {activeViewMode === 'cross_eye' && (
            <CrossEyeView stereoPair={currentPair} />
          )}

          {activeViewMode === 'anaglyph' && (
            <Anaglyph3DView stereoPair={currentPair} />
          )}

          {activeViewMode === 'parallax_tilt' && (
            <ParallaxTilt3DView stereoPair={currentPair} />
          )}
        </LiquidGlassView>

        {/* Floating Action Controls */}
        <View style={styles.actionButtonsRow}>
          <LiquidGlassButton
            title="📸 3D Kamera Starten"
            variant="primary"
            style={styles.primaryActionButton}
            onPress={() => setIsCameraActive(true)}
          />

          <LiquidGlassButton
            title={showAdjustments ? '✕ Justierung' : '⚙️ 3D Ausrichten'}
            variant="secondary"
            style={styles.secondaryActionButton}
            onPress={() => {
              hapticFeedback.light();
              setShowAdjustments(!showAdjustments);
            }}
          />
        </View>

        {/* Collapsible Stereo Calibration & Alignment Deck */}
        {showAdjustments && (
          <View style={styles.adjustmentsContainer}>
            <StereoCalibrationOverlay
              alignment={currentPair.alignment}
              onChangeAlignment={(newAlignment) => {
                const updated = { ...currentPair, alignment: newAlignment };
                setCurrentPair(updated);
                setStereoPairs((prev) =>
                  prev.map((p) => (p.id === currentPair.id ? updated : p))
                );
              }}
            />
          </View>
        )}

        {/* Gallery Showcases & Saved Pairs */}
        <DemoShowcaseSelector
          currentPairId={currentPair.id}
          onSelectPair={handleSelectStereoPair}
        />

        <SavedProjectsList
          projects={stereoPairs}
          currentPairId={currentPair.id}
          onSelectProject={handleSelectStereoPair}
          onDeleteProject={handleDeletePair}
        />
      </ScrollView>

      {/* Media Importer Modal */}
      <MediaImporterModal
        visible={isImporterVisible}
        onImportComplete={handleImportComplete}
        onClose={() => setIsImporterVisible(false)}
      />

      {/* Export Modal */}
      <ExportModal
        visible={isExportVisible}
        stereoPair={currentPair}
        onClose={() => setIsExportVisible(false)}
      />

      {/* Settings Modal */}
      <SettingsModal
        visible={isSettingsVisible}
        onLanguageChange={(lang) => setCurrentLanguage(lang)}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerIcon: {
    fontSize: 16,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 40,
  },
  scrollInnerLandscape: {
    paddingHorizontal: 12,
  },
  segmentedWrapper: {
    marginHorizontal: 12,
    marginVertical: 10,
  },
  viewerGlassCard: {
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 10,
    backgroundColor: 'rgba(16, 16, 22, 0.65)',
  },
  viewerGlassCardLandscape: {
    marginHorizontal: 6,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginVertical: 10,
  },
  primaryActionButton: {
    flex: 1.2,
  },
  secondaryActionButton: {
    flex: 1,
  },
  adjustmentsContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
  },
});
