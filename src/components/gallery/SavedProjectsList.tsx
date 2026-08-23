import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface SavedProjectsListProps {
  projects: StereoPair[];
  currentPairId: string;
  onSelectProject: (project: StereoPair) => void;
  onDeleteProject: (projectId: string) => void;
}

export const SavedProjectsList: React.FC<SavedProjectsListProps> = ({
  projects,
  currentPairId,
  onSelectProject,
  onDeleteProject,
}) => {
  if (projects.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>{t('tab_gallery')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {projects.map((project) => {
          const isSelected = project.id === currentPairId;
          const isDemo = project.sourceType === 'demo';

          return (
            <TouchableOpacity
              key={project.id}
              style={[styles.itemCard, isSelected && styles.itemCardSelected]}
              onPress={() => {
                hapticFeedback.selection();
                onSelectProject(project);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.thumbnailContainer}>
                {project.mediaType === 'video' ? (
                  <View style={styles.videoPlaceholder}>
                    <Text style={styles.videoIcon}>🎥</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: project.leftUri }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    {project.mediaType === 'video'
                      ? '🎥 Spatial Video'
                      : project.sourceType === 'camera_chacha'
                      ? '📸 Cha-Cha 3D'
                      : project.sourceType === 'demo'
                      ? '✨ Demo'
                      : '✂️ Spatial SBS'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={[styles.title, isSelected && styles.titleSelected]} numberOfLines={1}>
                  {project.title}
                </Text>
                {!isDemo && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => {
                      hapticFeedback.medium();
                      onDeleteProject(project.id);
                    }}
                  >
                    <Text style={styles.deleteText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  sectionHeader: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  itemCard: {
    width: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  itemCardSelected: {
    borderColor: COLORS.blue,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
  },
  thumbnailContainer: {
    width: '100%',
    height: 90,
    backgroundColor: '#0a0a0e',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121218',
  },
  videoIcon: {
    fontSize: 32,
  },
  tag: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    color: COLORS.cyan,
    fontSize: 9,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
  },
  title: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  titleSelected: {
    color: COLORS.cyan,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 2,
  },
  deleteText: {
    fontSize: 12,
  },
});
