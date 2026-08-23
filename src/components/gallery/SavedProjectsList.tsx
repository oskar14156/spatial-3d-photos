import React from 'react';
import {
  ActionSheetIOS,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { StereoPair } from '../../types';
import { palette, radius, spacing, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  projects: StereoPair[];
  currentPairId: string;
  onSelectProject: (project: StereoPair) => void;
  onDeleteProject: (projectId: string) => void;
};

export const SavedProjectsList: React.FC<Props> = ({
  projects,
  currentPairId,
  onSelectProject,
  onDeleteProject,
}) => {
  const { t } = useTranslation();

  if (!projects.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t('library_empty_title')}</Text>
        <Text style={styles.emptyBody}>{t('library_empty_body')}</Text>
      </View>
    );
  }

  const confirmDelete = (project: StereoPair) => {
    // Samples ship with the app; there is nothing to delete.
    if (project.sourceType === 'demo') return;
    hapticFeedback.medium();

    if (Platform.OS !== 'ios') {
      onDeleteProject(project.id);
      return;
    }

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: project.title,
        options: [t('cancel'), t('action_delete')],
        cancelButtonIndex: 0,
        destructiveButtonIndex: 1,
        userInterfaceStyle: 'dark',
      },
      (index) => {
        if (index === 1) onDeleteProject(project.id);
      }
    );
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {projects.map((project) => {
        const selected = project.id === currentPairId;
        const isDemo = project.sourceType === 'demo';

        return (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={project.title}
            accessibilityHint={isDemo ? undefined : t('source_hold_options')}
            onPress={() => {
              if (selected) return;
              hapticFeedback.selection();
              onSelectProject(project);
            }}
            onLongPress={() => confirmDelete(project)}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
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
                  <SymbolView
                    name="video.fill"
                    size={24}
                    tintColor={palette.labelSecondary}
                    style={styles.videoGlyph}
                  />
                </View>
              )}

              <View style={styles.badge}>
                <SymbolView
                  name={project.mediaType === 'video' ? 'video.fill' : 'photo.fill'}
                  size={9}
                  tintColor={palette.label}
                  style={styles.badgeGlyph}
                />
                <Text style={styles.badgeText}>
                  {project.spatialEncoding === 'mv-hevc' ||
                  project.spatialEncoding === 'spatial-heic'
                    ? t('badge_spatial')
                    : project.sourceType === 'camera_chacha'
                    ? t('badge_captured')
                    : isDemo
                    ? t('badge_demo')
                    : t('badge_stereo')}
                </Text>
              </View>

              {selected && (
                <View style={styles.selectedTick}>
                  <SymbolView
                    name="checkmark"
                    size={10}
                    weight="bold"
                    tintColor={palette.canvas}
                    style={styles.tickGlyph}
                  />
                </View>
              )}
            </View>

            <Text numberOfLines={1} style={styles.title}>
              {project.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {isDemo ? t('source_built_in') : t('source_hold_options')}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rail: { gap: spacing.md, paddingRight: spacing.sm },
  card: { width: 164 },
  pressed: { opacity: 0.7 },

  thumb: {
    height: 112,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: 'rgb(19,19,21)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: palette.separator,
  },
  thumbSelected: {
    borderWidth: 2,
    borderColor: palette.blue,
  },
  thumbImage: { width: '100%', height: '100%' },
  videoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoGlyph: { width: 28, height: 28 },

  badge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  badgeGlyph: { width: 10, height: 10 },
  badgeText: { ...type.eyebrow, fontSize: 8, color: palette.label },

  selectedTick: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.blue,
  },
  tickGlyph: { width: 11, height: 11 },

  title: { ...type.footnote, fontWeight: '600', marginTop: 7, color: palette.label },
  subtitle: { ...type.caption, fontSize: 10, marginTop: 1, color: palette.labelTertiary },

  empty: {
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    backgroundColor: palette.fill,
  },
  emptyTitle: { ...type.headline, color: palette.label },
  emptyBody: {
    ...type.footnote,
    marginTop: 4,
    textAlign: 'center',
    color: palette.labelTertiary,
  },
});
