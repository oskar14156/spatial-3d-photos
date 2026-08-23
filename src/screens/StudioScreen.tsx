import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { StereoPair, ViewMode, ViewerOptions } from '../types';
import { DEMO_STEREO_PAIRS } from '../constants';
import { palette, radius, spacing, type } from '../theme';
import { useTranslation } from '../i18n/useTranslation';
import { setLanguage } from '../i18n/translations';
import {
  deleteStereoPair,
  loadLanguagePreference,
  loadSavedStereoPairs,
  saveStereoPair,
  updateStereoPairAlignment,
} from '../utils/storage';
import { hapticFeedback } from '../utils/haptics';
import { IOSIconButton } from '../components/common/IOSIconButton';
import { NativeGlass } from '../components/common/NativeGlass';
import { ChaChaCamera } from '../components/camera/ChaChaCamera';
import { SavedProjectsList } from '../components/gallery/SavedProjectsList';
import { MediaImporterModal } from '../components/importer/MediaImporterModal';
import { ExportModal } from '../components/export/ExportModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { AlignmentPanel } from '../components/viewer/AlignmentPanel';
import { StereoViewer, isModeSupported } from '../components/viewer/StereoViewer';
import { ViewerControls } from '../components/viewer/ViewerControls';
import type { VideoHandle, VideoStatus } from '../components/viewer/VideoSurface';

const MODES: ViewMode[] = [
  'wigglegram',
  'sbs',
  'cross_eye',
  'anaglyph',
  'parallax_tilt',
];

const DEFAULT_OPTIONS: ViewerOptions = {
  anaglyphMode: 'color',
  wiggleFps: 10,
  wigglePlaying: true,
  vrMode: false,
  ipdOffset: 0,
};

const IDLE_VIDEO_STATUS: VideoStatus = {
  playing: false,
  muted: false,
  time: 0,
  duration: 0,
};

/**
 * The single screen of the app.
 *
 * Layout contract: the viewer owns one fixed frame, and *nothing* else draws
 * inside it. Mode controls, alignment and the library all stack below it in
 * normal document flow, with only the capture dock floating. That is what
 * keeps the chrome from piling up on the image.
 */
export const StudioScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [pairs, setPairs] = useState<StereoPair[]>(DEMO_STEREO_PAIRS);
  const [currentId, setCurrentId] = useState<string>(DEMO_STEREO_PAIRS[0].id);
  const [mode, setMode] = useState<ViewMode>('wigglegram');
  const [options, setOptions] = useState<ViewerOptions>(DEFAULT_OPTIONS);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(IDLE_VIDEO_STATUS);

  const [showCamera, setShowCamera] = useState(false);
  const [showAlignment, setShowAlignment] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const videoRef = useRef<VideoHandle | null>(null);

  // Falling back to the first pair keeps the screen valid if the selected
  // project is deleted while it is on screen.
  const current = useMemo(
    () => pairs.find((pair) => pair.id === currentId) ?? pairs[0],
    [currentId, pairs]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [language, saved] = await Promise.all([
        loadLanguagePreference(),
        loadSavedStereoPairs(),
      ]);
      if (cancelled) return;

      setLanguage(language);
      if (saved.length) {
        setPairs(saved);
        setCurrentId(saved[0].id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Video has no meaningful anaglyph/wiggle/parallax rendering, so fall back
  // rather than showing a mono frame and calling it 3D.
  useEffect(() => {
    if (current && !isModeSupported(current, mode)) setMode('sbs');
  }, [current, mode]);

  const viewerHeight = useMemo(() => {
    if (landscape) {
      return Math.max(240, height - insets.top - insets.bottom - 210);
    }
    return Math.min(width - spacing.lg * 2, 430) * 0.78;
  }, [height, insets.bottom, insets.top, landscape, width]);

  const addPair = useCallback(async (pair: StereoPair) => {
    await saveStereoPair(pair);
    setPairs((prev) => [pair, ...prev.filter((item) => item.id !== pair.id)]);
    setCurrentId(pair.id);
  }, []);

  const changeAlignment = useCallback(
    (alignment: StereoPair['alignment']) => {
      if (!current) return;
      setPairs((prev) =>
        prev.map((pair) =>
          pair.id === current.id ? { ...pair, alignment } : pair
        )
      );
      // Persisting here — not only on unmount — means calibration survives a
      // crash or a swipe-to-close mid-session.
      void updateStereoPairAlignment(current.id, alignment);
    },
    [current]
  );

  const removePair = useCallback(async (id: string) => {
    await deleteStereoPair(id);
    setPairs((prev) => {
      const next = prev.filter((pair) => pair.id !== id);
      return next.length ? next : DEMO_STEREO_PAIRS;
    });
  }, []);

  if (showCamera) {
    return (
      <ChaChaCamera
        onClose={() => setShowCamera(false)}
        onCaptureComplete={async (pair) => {
          await addPair(pair);
          setShowCamera(false);
        }}
      />
    );
  }

  if (!current) return <View style={styles.root} />;

  const availableModes = MODES.filter((item) => isModeSupported(current, item));

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + 118,
          },
        ]}
      >
        <View style={styles.nav}>
          <IOSIconButton
            symbol="gearshape.fill"
            accessibilityLabel={t('action_settings')}
            onPress={() => setShowSettings(true)}
          />
          <View style={styles.navRight}>
            <IOSIconButton
              symbol="square.and.arrow.down.fill"
              accessibilityLabel={t('action_import')}
              onPress={() => setShowImporter(true)}
            />
            <IOSIconButton
              symbol="square.and.arrow.up.fill"
              accessibilityLabel={t('action_export')}
              onPress={() => setShowExporter(true)}
            />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.eyebrow}>
            {current.mediaType === 'video'
              ? t('studio_eyebrow_video')
              : t('studio_eyebrow_photo')}
          </Text>
          <Text style={styles.title} numberOfLines={2}>
            {current.title || t('studio_untitled')}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeRail}
        >
          {availableModes.map((item) => {
            const active = mode === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  hapticFeedback.selection();
                  setMode(item);
                }}
                style={({ pressed }) => [
                  styles.modeChip,
                  active && styles.modeChipActive,
                  pressed && !active && styles.modeChipPressed,
                ]}
              >
                <Text style={[styles.modeText, active && styles.modeTextActive]}>
                  {t(`view_mode_${item}` as never)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={[styles.viewerFrame, { height: viewerHeight }]}>
          <StereoViewer
            pair={current}
            mode={mode}
            options={options}
            onVideoStatus={setVideoStatus}
            videoRef={videoRef}
          />

          <View pointerEvents="box-none" style={styles.viewerOverlay}>
            <NativeGlass style={styles.viewerBadge}>
              <Text style={styles.viewerBadgeText}>
                {current.mediaType === 'video' ? t('badge_video') : t('badge_photo')}
              </Text>
            </NativeGlass>

            <IOSIconButton
              symbol="slider.horizontal.3"
              accessibilityLabel={t('action_adjust')}
              selected={showAlignment}
              onPress={() => setShowAlignment((value) => !value)}
            />
          </View>
        </View>

        <View style={styles.controlsSlot}>
          <ViewerControls
            pair={current}
            mode={mode}
            options={options}
            onChangeOptions={(patch) =>
              setOptions((prev) => ({ ...prev, ...patch }))
            }
            videoStatus={videoStatus}
            videoRef={videoRef}
          />
        </View>

        {showAlignment && (
          <View style={styles.section}>
            <AlignmentPanel
              alignment={current.alignment}
              onChange={changeAlignment}
            />
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('library_title')}</Text>
            <Text style={styles.sectionMeta}>
              {pairs.length === 1
                ? t('library_count_one')
                : t('library_count_other', { count: pairs.length })}
            </Text>
          </View>
          <SavedProjectsList
            projects={pairs}
            currentPairId={current.id}
            onSelectProject={(pair) => setCurrentId(pair.id)}
            onDeleteProject={removePair}
          />
        </View>
      </ScrollView>

      <View
        pointerEvents="box-none"
        style={[styles.dockWrap, { bottom: insets.bottom + 10 }]}
      >
        <NativeGlass interactive style={styles.dock}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('capture_stereo')}
            onPress={() => {
              hapticFeedback.medium();
              setShowCamera(true);
            }}
            style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}
          >
            <SymbolView
              name="camera.fill"
              tintColor={palette.label}
              size={19}
              weight="semibold"
              style={styles.captureGlyph}
            />
            <Text style={styles.captureText}>{t('capture_stereo')}</Text>
          </Pressable>

          <View style={styles.dockDivider} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('action_import')}
            onPress={() => setShowImporter(true)}
            style={({ pressed }) => [styles.dockIcon, pressed && styles.pressed]}
          >
            <SymbolView
              name="photo.on.rectangle.angled"
              tintColor={palette.label}
              size={19}
              style={styles.dockGlyph}
            />
          </Pressable>
        </NativeGlass>
      </View>

      <MediaImporterModal
        visible={showImporter}
        onClose={() => setShowImporter(false)}
        onImportComplete={addPair}
      />
      <ExportModal
        visible={showExporter}
        stereoPair={current}
        anaglyphMode={options.anaglyphMode}
        onClose={() => setShowExporter(false)}
      />
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.canvas },
  content: { paddingHorizontal: spacing.lg },

  nav: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navRight: { flexDirection: 'row', gap: spacing.sm },

  titleBlock: { marginTop: spacing.xl, marginBottom: spacing.lg },
  eyebrow: { ...type.eyebrow, color: palette.labelTertiary },
  title: { ...type.largeTitle, marginTop: 5, color: palette.label },

  modeRail: { gap: spacing.sm, paddingBottom: spacing.md },
  modeChip: {
    height: 34,
    borderRadius: radius.chip,
    paddingHorizontal: 14,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  modeChipActive: { backgroundColor: palette.label },
  modeChipPressed: { backgroundColor: 'rgba(255,255,255,0.14)' },
  modeText: { ...type.footnote, fontWeight: '600', color: palette.labelSecondary },
  modeTextActive: { color: palette.canvas },

  viewerFrame: {
    width: '100%',
    borderRadius: radius.viewer,
    overflow: 'hidden',
    backgroundColor: '#050505',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  viewerOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  viewerBadge: {
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    justifyContent: 'center',
  },
  viewerBadgeText: { ...type.eyebrow, fontSize: 9, color: palette.label },

  controlsSlot: { minHeight: 44, marginTop: spacing.md },

  section: { marginTop: spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: { ...type.title2, color: palette.label },
  sectionMeta: { ...type.caption, color: palette.labelTertiary },

  dockWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  dock: {
    height: 64,
    width: 262,
    borderRadius: 32,
    padding: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  captureButton: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.blue,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  captureGlyph: { width: 22, height: 22 },
  captureText: { ...type.callout, fontWeight: '700', color: palette.label },
  dockDivider: {
    height: 28,
    width: StyleSheet.hairlineWidth,
    backgroundColor: palette.separator,
    marginHorizontal: 5,
  },
  dockIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockGlyph: { width: 22, height: 22 },
  pressed: { opacity: 0.72 },
});
