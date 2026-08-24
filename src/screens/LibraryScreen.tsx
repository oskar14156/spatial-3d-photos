import React, { useCallback } from 'react';
import {
  ActionSheetIOS,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Icon } from '../components/common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StereoPair } from '../types';
import { type Palette, radius, spacing, type, useTheme, useThemedStyles } from '../theme';
import { useTranslation } from '../i18n/useTranslation';
import { hapticFeedback } from '../utils/haptics';
import { IOSIconButton } from '../components/common/IOSIconButton';
import { EmptyState } from '../components/common/EmptyState';

type Props = {
  projects: StereoPair[];
  currentPairId: string;
  onOpen: (pair: StereoPair) => void;
  onDelete: (pairId: string) => void;
  onImport: () => void;
  onCapture: () => void;
};

const GUTTER = spacing.md;

/**
 * Browsable grid of everything in the library.
 *
 * Split out of the studio screen: a single horizontal rail under the viewer
 * could only ever show two and a half items, which is not a library.
 */
export const LibraryScreen: React.FC<Props> = ({
  projects,
  currentPairId,
  onOpen,
  onDelete,
  onImport,
  onCapture,
}) => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Two columns on phones, three once there is room for them.
  const columns = width >= 700 ? 3 : 2;
  const cardWidth =
    (width - spacing.lg * 2 - GUTTER * (columns - 1)) / columns;

  const confirmDelete = useCallback(
    (project: StereoPair) => {
      hapticFeedback.medium();

      if (Platform.OS !== 'ios') {
        onDelete(project.id);
        return;
      }

      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: project.title,
          options: [t('cancel'), t('action_delete')],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
        },
        (index) => {
          if (index === 1) onDelete(project.id);
        }
      );
    },
    [onDelete, t]
  );

  if (!projects.length) {
    return (
      <View style={[styles.emptyRoot, { paddingTop: insets.top }]}>
        <View style={styles.nav}>
          <Text style={styles.title}>{t('library_title')}</Text>
        </View>
        <EmptyState
          symbol="photo.on.rectangle.angled"
          title={t('empty_library_title')}
          body={t('empty_library_body')}
          actions={[
            {
              label: t('action_open_gallery'),
              symbol: 'photo.on.rectangle',
              primary: true,
              onPress: onImport,
            },
            {
              label: t('capture_stereo'),
              symbol: 'camera.fill',
              onPress: onCapture,
            },
          ]}
        />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + 120 },
      ]}
    >
      <View style={styles.nav}>
        <Text style={styles.title}>{t('library_title')}</Text>
        <IOSIconButton
          symbol="photo.on.rectangle"
          accessibilityLabel={t('action_open_gallery')}
          onPress={onImport}
        />
      </View>

      <Text style={styles.hint}>{t('library_grid_hint')}</Text>

      <View style={styles.grid}>
        {projects.map((project) => {
          const selected = project.id === currentPairId;
          return (
            <Pressable
              key={project.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={project.title}
              accessibilityHint={t('source_hold_options')}
              onPress={() => {
                hapticFeedback.selection();
                onOpen(project);
              }}
              onLongPress={() => confirmDelete(project)}
              style={({ pressed }) => [
                { width: cardWidth },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.thumb, selected && styles.thumbSelected]}>
                {project.mediaType === 'photo' ? (
                  <Image
                    source={{ uri: project.leftUri }}
                    style={styles.thumbImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.videoPlaceholder}>
                    <Icon
                      name="video.fill"
                      size={26}
                      color="rgba(255,255,255,0.7)"
                      style={styles.videoGlyph}
                    />
                  </View>
                )}

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {project.spatialEncoding === 'mv-hevc' ||
                    project.spatialEncoding === 'spatial-heic'
                      ? t('badge_spatial')
                      : project.sourceType === 'camera_chacha'
                      ? t('badge_captured')
                      : t('badge_stereo')}
                  </Text>
                </View>

                {selected && (
                  <View style={styles.tick}>
                    <Icon
                      name="checkmark"
                      size={11}
                      weight="bold"
                      color={palette.onAccent}
                      style={styles.tickGlyph}
                    />
                  </View>
                )}
              </View>

              <Text numberOfLines={1} style={styles.cardTitle}>
                {project.title}
              </Text>
              <Text numberOfLines={1} style={styles.cardMeta}>
                {formatDate(project.createdAt)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onImport}
        style={({ pressed }) => [styles.importCta, pressed && styles.pressed]}
      >
        <Icon
          name="plus"
          size={16}
          weight="semibold"
          color={palette.blue}
          style={styles.importGlyph}
        />
        <Text style={styles.importText}>{t('action_open_gallery')}</Text>
      </Pressable>
    </ScrollView>
  );
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    content: { paddingHorizontal: spacing.lg },
    emptyRoot: { flex: 1, paddingHorizontal: spacing.lg },
    nav: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    title: { ...type.largeTitle, color: palette.label },
    hint: {
      ...type.footnote,
      color: palette.labelTertiary,
      marginTop: 2,
      marginBottom: spacing.lg,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GUTTER,
    },
    thumb: {
      aspectRatio: 1,
      borderRadius: radius.card,
      overflow: 'hidden',
      backgroundColor: '#141416',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.separator,
    },
    thumbSelected: { borderWidth: 2, borderColor: palette.blue },
    thumbImage: { width: '100%', height: '100%' },
    videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    videoGlyph: { width: 30, height: 30 },
    badge: {
      position: 'absolute',
      left: 8,
      bottom: 8,
      height: 20,
      paddingHorizontal: 7,
      borderRadius: 10,
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    badgeText: { ...type.eyebrow, fontSize: 8, color: '#FFFFFF' },
    tick: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.blue,
    },
    tickGlyph: { width: 12, height: 12 },
    cardTitle: {
      ...type.footnote,
      fontWeight: '600',
      marginTop: 7,
      color: palette.label,
    },
    cardMeta: { ...type.caption, fontSize: 11, marginTop: 1, color: palette.labelTertiary },
    importCta: {
      minHeight: 50,
      marginTop: spacing.xl,
      borderRadius: radius.group,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.fill,
    },
    importGlyph: { width: 18, height: 18 },
    importText: { ...type.callout, fontWeight: '600', color: palette.blue },
    pressed: { opacity: 0.7 },
  });
