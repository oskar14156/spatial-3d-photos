import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IOSIconButton } from '../components/common/IOSIconButton';
import { NativeGlass } from '../components/common/NativeGlass';
import { SplitEyeSBSView } from '../components/viewer/SplitEyeSBSView';
import { CrossEyeView } from '../components/viewer/CrossEyeView';
import { Anaglyph3DView } from '../components/viewer/Anaglyph3DView';
import { Wigglegram3DView } from '../components/viewer/Wigglegram3DView';
import { ParallaxTilt3DView } from '../components/viewer/ParallaxTilt3DView';
import { StereoCalibrationOverlay } from '../components/viewer/StereoCalibrationOverlay';
import { ChaChaCamera } from '../components/camera/ChaChaCamera';
import { SavedProjectsList } from '../components/gallery/SavedProjectsList';
import { MediaImporterModal } from '../components/importer/MediaImporterModal';
import { ExportModal } from '../components/export/ExportModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import type { LanguageCode, StereoPair, ViewMode } from '../types';
import { DEMO_STEREO_PAIRS } from '../constants';
import { setLanguage } from '../i18n/translations';
import {
  deleteStereoPair,
  loadLanguagePreference,
  loadSavedStereoPairs,
  saveStereoPair,
} from '../utils/storage';
import { hapticFeedback } from '../utils/haptics';

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'wigglegram', label: 'Wiggle' },
  { id: 'sbs', label: 'Side by Side' },
  { id: 'cross_eye', label: 'Cross Eye' },
  { id: 'anaglyph', label: 'Anaglyph' },
  { id: 'parallax_tilt', label: 'Parallax' },
];

export const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [pairs, setPairs] = useState<StereoPair[]>(DEMO_STEREO_PAIRS);
  const [currentPair, setCurrentPair] = useState<StereoPair>(DEMO_STEREO_PAIRS[0]);
  const [mode, setMode] = useState<ViewMode>('wigglegram');
  const [camera, setCamera] = useState(false);
  const [adjust, setAdjust] = useState(false);
  const [vr, setVr] = useState(false);
  const [importer, setImporter] = useState(false);
  const [exporter, setExporter] = useState(false);
  const [settings, setSettings] = useState(false);
  const [, setCurrentLanguage] = useState<LanguageCode>('de');

  useEffect(() => {
    (async () => {
      const lang = await loadLanguagePreference();
      setLanguage(lang);
      setCurrentLanguage(lang);

      const saved = await loadSavedStereoPairs();
      if (saved.length) {
        setPairs(saved);
        setCurrentPair(saved[0]);
      }
    })();
  }, []);

  const viewerHeight = useMemo(() => {
    if (landscape) return Math.max(300, height - insets.top - insets.bottom - 132);
    return Math.min(width * 0.92, 430);
  }, [height, insets.bottom, insets.top, landscape, width]);

  const addPair = async (pair: StereoPair) => {
    await saveStereoPair(pair);
    setPairs((prev) => [pair, ...prev.filter((p) => p.id !== pair.id)]);
    setCurrentPair(pair);
  };

  if (camera) {
    return (
      <ChaChaCamera
        onClose={() => setCamera(false)}
        onCaptureComplete={async (pair) => {
          await addPair(pair);
          setCamera(false);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + 8,
            paddingBottom: insets.bottom + 118,
          },
          landscape && styles.contentLandscape,
        ]}
      >
        <View style={styles.nav}>
          <IOSIconButton
            symbol="gearshape.fill"
            accessibilityLabel="Settings"
            onPress={() => setSettings(true)}
          />

          <View style={styles.navRight}>
            <IOSIconButton
              symbol="square.and.arrow.down.fill"
              accessibilityLabel="Import media"
              onPress={() => setImporter(true)}
            />
            <IOSIconButton
              symbol="square.and.arrow.up.fill"
              accessibilityLabel="Export"
              onPress={() => setExporter(true)}
            />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>
            {currentPair.mediaType === 'video' ? 'SPATIAL VIDEO' : 'STEREO PHOTO'}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {currentPair.title || 'Spatial Studio'}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRail}
        >
          {MODES.map((item) => {
            const active = mode === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  hapticFeedback.selection();
                  setMode(item.id);
                }}
                style={[styles.modeChip, active && styles.modeChipActive]}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.viewer, { height: viewerHeight }]}>
          {mode === 'wigglegram' && <Wigglegram3DView stereoPair={currentPair} />}
          {mode === 'sbs' && (
            <SplitEyeSBSView
              stereoPair={currentPair}
              isVRHeadsetMode={vr}
              onToggleVRMode={() => setVr((v) => !v)}
            />
          )}
          {mode === 'cross_eye' && <CrossEyeView stereoPair={currentPair} />}
          {mode === 'anaglyph' && <Anaglyph3DView stereoPair={currentPair} />}
          {mode === 'parallax_tilt' && <ParallaxTilt3DView stereoPair={currentPair} />}

          <View style={styles.viewerTopLeft}>
            <NativeGlass style={styles.viewerBadge}>
              <Text style={styles.viewerBadgeText}>
                {currentPair.mediaType === 'video' ? 'VIDEO' : 'PHOTO'}
              </Text>
            </NativeGlass>
          </View>

          <View style={styles.viewerTopRight}>
            <IOSIconButton
              symbol="slider.horizontal.3"
              accessibilityLabel="Stereo alignment"
              selected={adjust}
              onPress={() => setAdjust((v) => !v)}
            />
          </View>
        </View>

        {adjust && (
          <View style={styles.adjust}>
            <Text style={styles.sectionTitle}>Stereo Alignment</Text>
            <StereoCalibrationOverlay
              alignment={currentPair.alignment}
              onChangeAlignment={(alignment) => {
                const updated = { ...currentPair, alignment };
                setCurrentPair(updated);
                setPairs((prev) => prev.map((p) => p.id === updated.id ? updated : p));
              }}
            />
          </View>
        )}

        {!landscape && (
          <View style={styles.librarySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Library</Text>
              <Text style={styles.sectionMeta}>{pairs.length} projects</Text>
            </View>
            <SavedProjectsList
              projects={pairs}
              currentPairId={currentPair.id}
              onSelectProject={setCurrentPair}
              onDeleteProject={async (id) => {
                await deleteStereoPair(id);
                setPairs((prev) => prev.filter((p) => p.id !== id));
              }}
            />
          </View>
        )}
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[styles.captureDockWrap, { bottom: insets.bottom + 10 }]}
      >
        <NativeGlass interactive style={styles.captureDock}>
          <Pressable
            onPress={() => {
              hapticFeedback.medium();
              setCamera(true);
            }}
            style={({ pressed }) => [
              styles.captureButton,
              pressed && styles.capturePressed,
            ]}
          >
            <SymbolView
              name="camera.fill"
              tintColor="#FFFFFF"
              size={19}
              weight="semibold"
              style={styles.captureIcon}
            />
            <Text style={styles.captureText}>Capture Stereo</Text>
          </Pressable>

          <View style={styles.dockDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Import"
            onPress={() => setImporter(true)}
            style={styles.dockIcon}
          >
            <SymbolView name="photo.on.rectangle.angled" tintColor="#FFFFFF" size={19} />
          </Pressable>
        </NativeGlass>
      </View>

      <MediaImporterModal
        visible={importer}
        onClose={() => setImporter(false)}
        onImportComplete={addPair}
      />
      <ExportModal
        visible={exporter}
        stereoPair={currentPair}
        onClose={() => setExporter(false)}
      />
      <SettingsModal
        visible={settings}
        onClose={() => setSettings(false)}
        onLanguageChange={setCurrentLanguage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  content: { paddingHorizontal: 16 },
  contentLandscape: { paddingHorizontal: 14 },

  nav: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navRight: { flexDirection: 'row', gap: 8 },

  titleBlock: { marginTop: 22, marginBottom: 16 },
  eyebrow: { color: 'rgba(235,235,245,0.48)', fontSize: 11, fontWeight: '700', letterSpacing: 0.9 },
  title: { color: '#FFF', marginTop: 5, fontSize: 34, lineHeight: 38, fontWeight: '700', letterSpacing: -1.1 },

  modeRail: { gap: 8, paddingBottom: 14 },
  modeChip: { height: 34, borderRadius: 17, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  modeChipActive: { backgroundColor: '#FFF' },
  modeText: { color: 'rgba(235,235,245,0.65)', fontSize: 13, fontWeight: '600' },
  modeTextActive: { color: '#000' },

  viewer: { width: '100%', backgroundColor: '#050505', borderRadius: 28, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  viewerTopLeft: { position: 'absolute', top: 12, left: 12 },
  viewerTopRight: { position: 'absolute', top: 10, right: 10 },
  viewerBadge: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5 },
  viewerBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },

  adjust: { marginTop: 22 },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionTitle: { color: '#FFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.5, marginBottom: 10 },
  sectionMeta: { color: 'rgba(235,235,245,0.45)', fontSize: 12, fontWeight: '600' },
  librarySection: { marginTop: 28 },

  captureDockWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  captureDock: { height: 64, width: 262, borderRadius: 32, padding: 6, flexDirection: 'row', alignItems: 'center' },
  captureButton: { flex: 1, height: 52, borderRadius: 26, backgroundColor: '#0A84FF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  capturePressed: { transform: [{ scale: 0.97 }] },
  captureIcon: { width: 22, height: 22 },
  captureText: { color: '#FFF', fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  dockDivider: { height: 28, width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.14)', marginHorizontal: 5 },
  dockIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
