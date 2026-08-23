import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Dimensions,
} from 'react-native';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';
import { Wigglegram3DView } from '../viewer/Wigglegram3DView';
import { SplitEyeSBSView } from '../viewer/SplitEyeSBSView';

interface ChaChaReviewModalProps {
  visible: boolean;
  leftUri: string;
  rightUri: string;
  subjectDistanceMeters: number;
  baselineMeters: number;
  onSave: (pair: StereoPair) => void;
  onRetake: () => void;
  onClose: () => void;
}

export const ChaChaReviewModal: React.FC<ChaChaReviewModalProps> = ({
  visible,
  leftUri,
  rightUri,
  subjectDistanceMeters,
  baselineMeters,
  onSave,
  onRetake,
  onClose,
}) => {
  const [title, setTitle] = useState<string>('3D Capture');
  const [previewMode, setPreviewMode] = useState<'wiggle' | 'sbs'>('wiggle');

  const tempStereoPair: StereoPair = {
    id: `temp_${Date.now()}`,
    title,
    leftUri,
    rightUri,
    mediaType: 'photo',
    sourceType: 'camera_chacha',
    createdAt: Date.now(),
    subjectDistanceMeters,
    baselineDistanceMeters: baselineMeters,
    alignment: {
      horizontalDisparity: 0,
      verticalOffset: 0,
      rotationAngle: 0,
      zoomScale: 1.0,
      invertEyes: false,
    },
  };

  const handleSaveAndOpen = () => {
    hapticFeedback.success();
    onSave({
      ...tempStereoPair,
      title: title.trim() || 'My 3D Stereo Photo',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => {
                hapticFeedback.light();
                onRetake();
              }}
            >
              <Text style={styles.cancelText}>{t('camera_retake_step1')}</Text>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t('review_title')}</Text>
              <Text style={styles.subtitle}>{t('review_subtitle')}</Text>
            </View>

            <TouchableOpacity
              style={[styles.headerButton, styles.saveButton]}
              onPress={handleSaveAndOpen}
            >
              <Text style={styles.saveButtonText}>{t('save')}</Text>
            </TouchableOpacity>
          </View>

          {/* Title Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Name für 3D-Aufnahme..."
              placeholderTextColor={COLORS.textTertiary}
            />
          </View>

          {/* Mode Selector for Preview */}
          <View style={styles.previewModeRow}>
            <TouchableOpacity
              style={[styles.modeTab, previewMode === 'wiggle' && styles.modeTabActive]}
              onPress={() => {
                hapticFeedback.selection();
                setPreviewMode('wiggle');
              }}
            >
              <Text style={[styles.modeTabText, previewMode === 'wiggle' && styles.modeTabTextActive]}>
                📳 Wiggle 3D Preview
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeTab, previewMode === 'sbs' && styles.modeTabActive]}
              onPress={() => {
                hapticFeedback.selection();
                setPreviewMode('sbs');
              }}
            >
              <Text style={[styles.modeTabText, previewMode === 'sbs' && styles.modeTabTextActive]}>
                👓 Split SBS Preview
              </Text>
            </TouchableOpacity>
          </View>

          {/* Live 3D Preview */}
          <View style={styles.previewContainer}>
            {previewMode === 'wiggle' ? (
              <Wigglegram3DView stereoPair={tempStereoPair} />
            ) : (
              <SplitEyeSBSView stereoPair={tempStereoPair} />
            )}
          </View>

          {/* Bottom Primary Action Button */}
          <TouchableOpacity
            style={styles.primaryActionButton}
            onPress={handleSaveAndOpen}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>🚀 {t('review_save_button')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: screenHeight * 0.9,
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: COLORS.red,
    fontSize: 15,
    fontWeight: '700',
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  saveButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  inputContainer: {
    marginVertical: 8,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  previewModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 8,
  },
  modeTab: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  modeTabActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: COLORS.blue,
  },
  modeTabText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  modeTabTextActive: {
    color: COLORS.cyan,
    fontWeight: '800',
  },
  previewContainer: {
    height: 340,
    marginVertical: 6,
  },
  primaryActionButton: {
    backgroundColor: COLORS.blue,
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
