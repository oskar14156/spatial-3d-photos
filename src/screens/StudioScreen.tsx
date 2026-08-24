import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../components/common/Icon';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StereoPair, ViewMode, ViewerOptions } from '../types';
import {
  type Palette,
  radius,
  spacing,
  type,
  useTheme,
  useThemedStyles,
} from '../theme';
import { useTranslation } from '../i18n/useTranslation';
import { setLanguage } from '../i18n/translations';
import {
  deleteStereoPair,
  loadLanguagePreference,
  loadSavedStereoPairs,
  saveStereoPair,
  updateStereoPairAlignment,
} from '../utils/storage';
import { formatMetricDistance } from '../utils/stereobaseCalculator';
import { hapticFeedback } from '../utils/haptics';
import { IOSIconButton } from '../components/common/IOSIconButton';
import { NativeGlass } from '../components/common/NativeGlass';
import { TabBar, type TabId } from '../components/common/TabBar';
import { ChaChaCamera } from '../components/camera/ChaChaCamera';
import { MediaImporterModal } from '../components/importer/MediaImporterModal';
import { GalleryPicker } from '../components/importer/GalleryPicker';
import { EmptyState } from '../components/common/EmptyState';
import { ExportModal } from '../components/export/ExportModal';
import { SettingsModal } from '../components/settings/SettingsModal';
import { AlignmentPanel } from '../components/viewer/AlignmentPanel';
import { StereoViewer, isModeSupported } from '../components/viewer/StereoViewer';
import { ViewerControls } from '../components/viewer/ViewerControls';
import { ImmersiveViewer } from '../components/viewer/ImmersiveViewer';
import type { VideoHandle, VideoStatus } from '../components/viewer/VideoSurface';
import { LibraryScreen } from './LibraryScreen';

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
 * App shell: two tabs over one shared library, plus the capture takeover.
 *
 * Layout contract for the studio tab: the viewer owns one frame, and *nothing*
 * else draws inside it. Mode controls, metadata and alignment stack below it
 * in normal flow; only the tab bar floats.
 */
export const StudioScreen: React.FC = () => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  const [tab, setTab] = useState<TabId>('studio');
  const [pairs, setPairs] = useState<StereoPair[]>([]);
  const [currentId, setCurrentId] = useState<string>('');
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<ViewMode>('wigglegram');
  const [options, setOptions] = useState<ViewerOptions>(DEFAULT_OPTIONS);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(IDLE_VIDEO_STATUS);

  const [showCamera, setShowCamera] = useState(false);
  const [showAlignment, setShowAlignment] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [immersive, setImmersive] = useState(false);

  const videoRef = useRef<VideoHandle | null>(null);

  // Owned here so the parallax surface and its readout share one value and
  // neither has to round-trip through React state at 30 Hz.
  const tiltX = useSharedValue(0);

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
      setPairs(saved);
      if (saved.length) setCurrentId(saved[0].id);
      setLoaded(true);
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
      return Math.max(240, height - insets.top - insets.bottom - 200);
    }
    // Leaves room for the header, the mode rail, the controls and the tab bar
    // without the page needing to scroll on a standard phone.
    return Math.min((width - spacing.lg * 2) * 0.84, height * 0.42);
  }, [height, insets.bottom, insets.top, landscape, width]);

  const addPair = useCallback(async (pair: StereoPair) => {
    await saveStereoPair(pair);
    setPairs((prev) => [pair, ...prev.filter((item) => item.id !== pair.id)]);
    setCurrentId(pair.id);
    setTab('studio');
  }, []);

  const addPairs = useCallback(async (incoming: StereoPair[]) => {
    for (const pair of incoming) await saveStereoPair(pair);
    setPairs((prev) => {
      const ids = new Set(incoming.map((pair) => pair.id));
      return [...incoming, ...prev.filter((pair) => !ids.has(pair.id))];
    });
    if (incoming.length) setCurrentId(incoming[0].id);
    setTab(incoming.length > 1 ? 'library' : 'studio');
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
    setPairs((prev) => prev.filter((pair) => pair.id !== id));
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

  const availableModes = current
    ? MODES.filter((item) => isModeSupported(current, item))
    : [];

  return (
    <View style={styles.root}>
      {tab === 'library' ? (
        <LibraryScreen
          projects={pairs}
          currentPairId={current?.id ?? ''}
          onOpen={(pair) => {
            setCurrentId(pair.id);
            setTab('studio');
          }}
          onDelete={removePair}
          onImport={() => setShowGallery(true)}
          onCapture={() => setShowCamera(true)}
        />
      ) : !current ? (
        // Only once loading has settled: flashing an empty state over a
        // library that is about to appear reads as data loss.
        loaded && (
          <EmptyState
            symbol="cube.transparent"
            title={t('empty_studio_title')}
            body={t('empty_library_body')}
            actions={[
              {
                label: t('capture_stereo'),
                symbol: 'camera.fill',
                primary: true,
                onPress: () => setShowCamera(true),
              },
              {
                label: t('action_open_gallery'),
                symbol: 'photo.on.rectangle',
                onPress: () => setShowGallery(true),
              },
            ]}
          />
        )
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + 110,
            },
          ]}
        >
          <View style={styles.nav}>
            <View style={styles.navTitle}>
              <Text style={styles.eyebrow}>
                {current.mediaType === 'video'
                  ? t('studio_eyebrow_video')
                  : t('studio_eyebrow_photo')}
              </Text>
              <Text style={styles.title} numberOfLines={1}>
                {current.title || t('studio_untitled')}
              </Text>
            </View>

            <View style={styles.navActions}>
              <IOSIconButton
                symbol="square.and.arrow.up"
                accessibilityLabel={t('action_export')}
                onPress={() => setShowExporter(true)}
              />
              <IOSIconButton
                symbol="gearshape"
                accessibilityLabel={t('action_settings')}
                onPress={() => setShowSettings(true)}
              />
            </View>
          </View>

          <View style={[styles.viewerFrame, { height: viewerHeight }]}>
            <StereoViewer
              pair={current}
              mode={mode}
              options={options}
              onVideoStatus={setVideoStatus}
              videoRef={videoRef}
              tiltX={tiltX}
            />

            <View pointerEvents="box-none" style={styles.viewerOverlay}>
              <NativeGlass overMedia style={styles.viewerBadge}>
                <Text style={styles.viewerBadgeText}>
                  {current.mediaType === 'video'
                    ? t('badge_video')
                    : t('badge_photo')}
                </Text>
              </NativeGlass>

              <IOSIconButton
                symbol="slider.horizontal.3"
                overMedia
                accessibilityLabel={t('action_adjust')}
                selected={showAlignment}
                onPress={() => setShowAlignment((value) => !value)}
              />
            </View>
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
                  <Text
                    style={[styles.modeText, active && styles.modeTextActive]}
                  >
                    {t(`view_mode_${item}` as never)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
              tiltX={tiltX}
              onEnterFullscreen={() => setImmersive(true)}
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

          <View style={styles.metaCard}>
            <MetaRow
              label={t('meta_baseline')}
              value={
                current.baselineDistanceMeters
                  ? formatMetricDistance(current.baselineDistanceMeters)
                  : t('meta_unknown')
              }
            />
            <View style={styles.metaDivider} />
            <MetaRow
              label={t('meta_distance')}
              value={
                current.subjectDistanceMeters
                  ? formatMetricDistance(current.subjectDistanceMeters)
                  : t('meta_unknown')
              }
            />
            <View style={styles.metaDivider} />
            <MetaRow label={t('meta_source')} value={sourceLabel(current, t)} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={() => setTab('library')}
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>{t('studio_open_in_library')}</Text>
            <Icon
              name="chevron.right"
              size={12}
              weight="semibold"
              color={palette.blue}
              style={styles.linkGlyph}
            />
          </Pressable>
        </ScrollView>
      )}

      <TabBar
        active={tab}
        onChange={setTab}
        onCapture={() => setShowCamera(true)}
        captureLabel={t('capture_stereo')}
        tabs={TAB_ITEMS(t)}
      />

      <GalleryPicker
        visible={showGallery}
        onClose={() => setShowGallery(false)}
        onImported={addPairs}
        onOpenManual={() => {
          setShowGallery(false);
          setShowImporter(true);
        }}
      />
      <MediaImporterModal
        visible={showImporter}
        onClose={() => setShowImporter(false)}
        onImportComplete={addPair}
      />
      {current && (
        <ExportModal
          visible={showExporter}
          stereoPair={current}
          anaglyphMode={options.anaglyphMode}
          onClose={() => setShowExporter(false)}
        />
      )}
      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
      />
      {current && (
        <ImmersiveViewer
          visible={immersive}
          pair={current}
          mode={mode}
          options={options}
          onClose={() => setImmersive(false)}
        />
      )}
    </View>
  );
};

/** Kept in one place so both the empty and populated shells stay in step. */
const TAB_ITEMS = (t: (key: never) => string) => {
  const translate = t as unknown as (key: string) => string;
  return [
    {
      id: 'studio' as const,
      label: translate('tab_studio_short'),
      symbol: 'cube.transparent' as const,
    },
    {
      id: 'library' as const,
      label: translate('tab_library_short'),
      symbol: 'square.grid.2x2' as const,
    },
  ];
};

function MetaRow({ label, value }: { label: string; value: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function sourceLabel(pair: StereoPair, t: (key: never) => string): string {
  const translate = t as unknown as (key: string) => string;
  switch (pair.sourceType) {
    case 'camera_chacha':
      return translate('source_camera');
    case 'imported_spatial':
      return translate('source_imported_spatial');
    case 'imported_sbs':
      return translate('source_imported_sbs');
    case 'imported_dual':
      return translate('source_imported_dual');
    default:
      return translate('source_built_in');
  }
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.canvas },
    content: { paddingHorizontal: spacing.lg },

    nav: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    navTitle: { flex: 1 },
    navActions: { flexDirection: 'row', gap: spacing.sm },
    eyebrow: { ...type.eyebrow, color: palette.labelTertiary },
    title: { ...type.title2, fontSize: 26, marginTop: 3, color: palette.label },

    viewerFrame: {
      width: '100%',
      borderRadius: radius.viewer,
      overflow: 'hidden',
      // Media stays on black in both appearances so depth reads correctly.
      backgroundColor: '#050505',
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
    viewerBadgeText: { ...type.eyebrow, fontSize: 9, color: '#FFFFFF' },

    modeRail: { gap: spacing.sm, paddingVertical: spacing.md },
    modeChip: {
      height: 34,
      borderRadius: radius.chip,
      paddingHorizontal: 14,
      justifyContent: 'center',
      backgroundColor: palette.fillSubtler,
    },
    modeChipActive: { backgroundColor: palette.inverted },
    modeChipPressed: { backgroundColor: palette.fillSubtle },
    modeText: {
      ...type.footnote,
      fontWeight: '600',
      color: palette.labelSecondary,
    },
    modeTextActive: { color: palette.onInverted },

    controlsSlot: { minHeight: 44 },

    section: { marginTop: spacing.xl },

    metaCard: {
      marginTop: spacing.xl,
      borderRadius: radius.group,
      paddingHorizontal: spacing.lg,
      backgroundColor: palette.fill,
    },
    metaRow: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    metaLabel: { ...type.callout, color: palette.labelSecondary },
    metaValue: {
      ...type.callout,
      fontWeight: '600',
      color: palette.label,
      fontVariant: ['tabular-nums'],
    },
    metaDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: palette.separator,
    },

    linkRow: {
      minHeight: 44,
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    },
    linkText: { ...type.callout, fontWeight: '600', color: palette.blue },
    linkGlyph: { width: 14, height: 14 },
    pressed: { opacity: 0.7 },
  });
