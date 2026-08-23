import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StereoAlignment } from '../../types';
import { COLORS, DEFAULT_ALIGNMENT } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface StereoCalibrationOverlayProps {
  alignment: StereoAlignment;
  onChangeAlignment: (alignment: StereoAlignment) => void;
}

export const StereoCalibrationOverlay: React.FC<StereoCalibrationOverlayProps> = ({
  alignment,
  onChangeAlignment,
}) => {
  const updateProp = <K extends keyof StereoAlignment>(key: K, value: StereoAlignment[K]) => {
    hapticFeedback.light();
    onChangeAlignment({
      ...alignment,
      [key]: value,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('adjustments_title')}</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={() => {
            hapticFeedback.medium();
            onChangeAlignment({ ...DEFAULT_ALIGNMENT });
          }}
        >
          <Text style={styles.resetText}>{t('reset_alignment')}</Text>
        </TouchableOpacity>
      </View>

      {/* Horizontal Disparity (Convergence / Depth Plane) */}
      <View style={styles.controlItem}>
        <View style={styles.labelRow}>
          <Text style={styles.controlLabel}>{t('horizontal_disparity')}</Text>
          <Text style={styles.valueText}>{alignment.horizontalDisparity} px</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('horizontalDisparity', Math.max(-50, alignment.horizontalDisparity - 2))}
          >
            <Text style={styles.stepperBtnText}>-2</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('horizontalDisparity', Math.max(-50, alignment.horizontalDisparity - 1))}
          >
            <Text style={styles.stepperBtnText}>-1</Text>
          </TouchableOpacity>
          <View style={styles.indicatorTrack}>
            <View
              style={[
                styles.indicatorDot,
                { left: `${((alignment.horizontalDisparity + 50) / 100) * 100}%` },
              ]}
            />
          </View>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('horizontalDisparity', Math.min(50, alignment.horizontalDisparity + 1))}
          >
            <Text style={styles.stepperBtnText}>+1</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('horizontalDisparity', Math.min(50, alignment.horizontalDisparity + 2))}
          >
            <Text style={styles.stepperBtnText}>+2</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hintSubtext}>{t('convergence_hint')}</Text>
      </View>

      {/* Vertical Offset */}
      <View style={styles.controlItem}>
        <View style={styles.labelRow}>
          <Text style={styles.controlLabel}>{t('vertical_offset')}</Text>
          <Text style={styles.valueText}>{alignment.verticalOffset} px</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('verticalOffset', Math.max(-30, alignment.verticalOffset - 1))}
          >
            <Text style={styles.stepperBtnText}>↓ -1</Text>
          </TouchableOpacity>
          <View style={styles.indicatorTrack}>
            <View
              style={[
                styles.indicatorDot,
                { left: `${((alignment.verticalOffset + 30) / 60) * 100}%` },
              ]}
            />
          </View>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('verticalOffset', Math.min(30, alignment.verticalOffset + 1))}
          >
            <Text style={styles.stepperBtnText}>↑ +1</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rotation Tilt */}
      <View style={styles.controlItem}>
        <View style={styles.labelRow}>
          <Text style={styles.controlLabel}>{t('rotation_angle')}</Text>
          <Text style={styles.valueText}>{alignment.rotationAngle.toFixed(1)}°</Text>
        </View>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('rotationAngle', Math.max(-5, alignment.rotationAngle - 0.5))}
          >
            <Text style={styles.stepperBtnText}>↺ -0.5°</Text>
          </TouchableOpacity>
          <View style={styles.indicatorTrack}>
            <View
              style={[
                styles.indicatorDot,
                { left: `${((alignment.rotationAngle + 5) / 10) * 100}%` },
              ]}
            />
          </View>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => updateProp('rotationAngle', Math.min(5, alignment.rotationAngle + 0.5))}
          >
            <Text style={styles.stepperBtnText}>↻ +0.5°</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Invert Eyes Switch */}
      <TouchableOpacity
        style={[styles.invertButton, alignment.invertEyes && styles.invertButtonActive]}
        onPress={() => updateProp('invertEyes', !alignment.invertEyes)}
      >
        <Text style={[styles.invertButtonText, alignment.invertEyes && styles.invertButtonTextActive]}>
          ⇄ {t('invert_eyes')} {alignment.invertEyes ? '(R ↔ L Aktiv)' : '(L ↔ R Normal)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(20, 20, 26, 0.7)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.35)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  resetButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  resetText: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '700',
  },
  controlItem: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  valueText: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    minWidth: 42,
    alignItems: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  stepperBtnText: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  indicatorTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  indicatorDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.cyan,
    transform: [{ translateX: -6 }],
    shadowColor: COLORS.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
  },
  hintSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  invertButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 4,
  },
  invertButtonActive: {
    backgroundColor: 'rgba(255, 159, 10, 0.25)',
    borderColor: COLORS.orange,
  },
  invertButtonText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  invertButtonTextActive: {
    color: COLORS.orange,
    fontWeight: '800',
  },
});
