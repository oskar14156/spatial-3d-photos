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
import { hapticFeedback } from '../../utils/haptics';

interface Props {
  projects: StereoPair[];
  currentPairId: string;
  onSelectProject: (project: StereoPair) => void;
  onDeleteProject: (projectId: string) => void;
}

export const SavedProjectsList: React.FC<Props> = ({
  projects,
  currentPairId,
  onSelectProject,
  onDeleteProject,
}) => {
  if (!projects.length) return null;

  const requestDelete = (project: StereoPair) => {
    if (project.sourceType === 'demo') return;
    hapticFeedback.medium();

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: project.title,
          options: ['Cancel', 'Delete Project'],
          cancelButtonIndex: 0,
          destructiveButtonIndex: 1,
          userInterfaceStyle: 'dark',
        },
        (index) => {
          if (index === 1) onDeleteProject(project.id);
        }
      );
      return;
    }

    onDeleteProject(project.id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.rail}
    >
      {projects.map((project) => {
        const selected = project.id === currentPairId;

        return (
          <Pressable
            key={project.id}
            accessibilityRole="button"
            accessibilityLabel={`Open ${project.title}`}
            onPress={() => {
              hapticFeedback.selection();
              onSelectProject(project);
            }}
            onLongPress={() => requestDelete(project)}
            style={({ pressed }) => [
              styles.card,
              selected && styles.selectedCard,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.thumbnailWrap}>
              {project.mediaType === 'photo' ? (
                <Image
                  source={{ uri: project.leftUri }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <SymbolView
                    name="video.fill"
                    size={24}
                    tintColor="rgba(255,255,255,0.82)"
                  />
                </View>
              )}

              <View style={styles.typeBadge}>
                <SymbolView
                  name={project.mediaType === 'video' ? 'video.fill' : 'photo.fill'}
                  size={10}
                  tintColor="#FFFFFF"
                />
                <Text style={styles.typeText}>
                  {project.spatialEncoding === 'mv-hevc'
                    ? 'SPATIAL'
                    : project.sourceType === 'camera_chacha'
                    ? 'CAPTURED'
                    : project.sourceType === 'demo'
                    ? 'DEMO'
                    : 'STEREO'}
                </Text>
              </View>
            </View>

            <View style={styles.meta}>
              <Text numberOfLines={1} style={styles.title}>
                {project.title}
              </Text>
              <Text style={styles.hint}>
                {project.sourceType === 'demo'
                  ? 'Built-in sample'
                  : 'Hold for options'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  rail: {
    gap: 12,
    paddingRight: 8,
  },
  card: {
    width: 164,
  },
  selectedCard: {},
  pressed: {
    opacity: 0.68,
  },
  thumbnailWrap: {
    height: 112,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgb(19,19,21)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    height: 23,
    paddingHorizontal: 8,
    borderRadius: 11.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.62)',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.65,
  },
  meta: {
    paddingHorizontal: 2,
    paddingTop: 7,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  hint: {
    color: 'rgba(235,235,245,0.42)',
    fontSize: 10,
    marginTop: 2,
  },
});
