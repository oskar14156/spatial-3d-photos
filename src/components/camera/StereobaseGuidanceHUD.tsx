import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SUBJECT_PRESETS, formatBaselineInstruction, formatMetricDistance, calculateStereoBaseline } from '../../utils/stereobaseCalculator';
import { SubjectPreset, SubjectPresetId } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface StereobaseGuidanceHUDProps {
  selectedPresetId: SubjectPresetId;
  onSelectPreset: (preset: SubjectPreset) => void;
  customDistanceMeters: number;
  onChangeDistance: (meters: number) => void;
  ruleDivisor?: number;
}

export const StereobaseGuidanceHUD: React.FC<StereobaseGuidanceHUDProps> = ({
  selectedPresetId,
  onSelectPreset,
  customDistanceMeters,
  onChangeDistance,
  ruleDivisor = 30,
}) => {
  const currentBaseline = calculateStereoBaseline(customDistanceMeters, ruleDivisor);
  const instruction = formatBaselineInstruction(currentBaseline, 'de');

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsRow}
      >
        {SUBJECT_PRESETS.map((preset) => {
          const isSelected = preset.id === selectedPresetId;
          const baselineStr = formatMetricDistance(preset.recommendedBaselineMeters);
          return (
            <TouchableOpacity
              key={preset.id}
              style={[styles.presetCard, isSelected && styles.presetCardSelected]}
              onPress={() => {
                hapticFeedback.selection();
                onSelectPreset(preset);
                onChangeDistance(preset.defaultSubjectDistanceMeters);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.presetIcon}>
                {preset.id === 'macro' && '🌸'}
                {preset.id === 'portrait' && '👤'}
                {preset.id === 'room' && '🛋️'}
                {preset.id === 'architecture' && '🏛️'}
                {preset.id === 'mountain' && '🏔️'}
              </Text>
              <Text style={[styles.presetName, isSelected && styles.presetNameSelected]}>
                {t(preset.nameKey as any)}
              </Text>
              <View style={[styles.baselineBadge, isSelected && styles.baselineBadgeSelected]}>
                <Text style={[styles.baselineBadgeText, isSelected && styles.baselineBadgeTextSelected]}>
                  ← {baselineStr}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Dynamic 1/30 Rule Instruction Banner */}
      <View style={styles.guidanceBanner}>
        <View style={styles.guidanceTopRow}>
          <View style={styles.targetDistanceCol}>
            <Text style={styles.miniLabel}>{t('subject_distance_label')}</Text>
            <Text style={styles.distanceValue}>{formatMetricDistance(customDistanceMeters)}</Text>
          </View>

          <View style={styles.arrowCol}>
            <Text style={styles.arrowIcon}>➔</Text>
            <Text style={styles.ruleTag}>1/30 Regel</Text>
          </View>

          <View style={styles.shiftCol}>
            <Text style={styles.miniLabel}>{t('recommended_shift_label')}</Text>
            <Text style={styles.shiftValue}>← {instruction.formatted}</Text>
          </View>
        </View>

        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            💡 <Text style={styles.hintBold}>{instruction.hint}</Text>
          </Text>
          {selectedPresetId === 'mountain' && (
            <Text style={styles.hyperstereoNote}>
              ⛰️ <Text style={styles.hyperstereoBold}>Hyperstereo:</Text> Bei Bergen in 1.5 km Distanz musst du ca. 50 Meter nach links gehen für echte 3D-Tiefe!
            </Text>
          )}
          {selectedPresetId === 'portrait' && (
            <Text style={styles.hyperstereoNote}>
              👤 <Text style={styles.hyperstereoBold}>Porträt:</Text> 6.5 cm entspricht exakt dem normalen Augenabstand des Menschen.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  presetCard: {
    backgroundColor: 'rgba(20, 20, 26, 0.75)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    minWidth: 95,
  },
  presetCardSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: COLORS.blue,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
  },
  presetIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  presetName: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  presetNameSelected: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  baselineBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  baselineBadgeSelected: {
    backgroundColor: COLORS.blue,
  },
  baselineBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  baselineBadgeTextSelected: {
    color: '#FFFFFF',
  },
  guidanceBanner: {
    backgroundColor: 'rgba(16, 16, 22, 0.85)',
    borderRadius: 16,
    marginHorizontal: 12,
    padding: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  guidanceTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  targetDistanceCol: {
    flex: 1,
  },
  arrowCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  arrowIcon: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  ruleTag: {
    color: COLORS.textTertiary,
    fontSize: 9,
    fontWeight: '600',
  },
  shiftCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  miniLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  distanceValue: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  shiftValue: {
    color: COLORS.cyan,
    fontSize: 16,
    fontWeight: '800',
  },
  hintContainer: {
    marginTop: 8,
    gap: 4,
  },
  hintText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  hintBold: {
    color: COLORS.cyan,
    fontWeight: '700',
  },
  hyperstereoNote: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
  hyperstereoBold: {
    color: COLORS.yellow,
    fontWeight: '700',
  },
});
