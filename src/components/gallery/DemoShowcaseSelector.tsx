import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { StereoPair } from '../../types';
import { DEMO_STEREO_PAIRS, COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface DemoShowcaseSelectorProps {
  currentPairId: string;
  onSelectPair: (pair: StereoPair) => void;
}

export const DemoShowcaseSelector: React.FC<DemoShowcaseSelectorProps> = ({
  currentPairId,
  onSelectPair,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>{t('demo_showcases_title')}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {DEMO_STEREO_PAIRS.map((demo) => {
          const isSelected = demo.id === currentPairId;
          return (
            <TouchableOpacity
              key={demo.id}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => {
                hapticFeedback.selection();
                onSelectPair(demo);
              }}
              activeOpacity={0.7}
            >
              <View style={styles.badgeRow}>
                <Text style={styles.emoji}>
                  {demo.mediaType === 'video' ? '🎥' : demo.subjectCategory === 'mountain' ? '🏔️' : '👤'}
                </Text>
                <View style={styles.baselineTag}>
                  <Text style={styles.baselineText}>
                    {demo.mediaType === 'video'
                      ? 'Spatial Video'
                      : demo.baselineDistanceMeters && demo.baselineDistanceMeters >= 1
                      ? `${demo.baselineDistanceMeters}m Basis`
                      : `${((demo.baselineDistanceMeters || 0.065) * 100).toFixed(1)}cm Basis`}
                  </Text>
                </View>
              </View>

              <Text style={[styles.title, isSelected && styles.titleSelected]}>
                {demo.title}
              </Text>
              <Text style={styles.desc} numberOfLines={2}>
                {demo.description}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
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
    gap: 10,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 12,
    width: 210,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  emoji: {
    fontSize: 20,
  },
  baselineTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  baselineText: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  titleSelected: {
    color: COLORS.cyan,
  },
  desc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 14,
  },
});
