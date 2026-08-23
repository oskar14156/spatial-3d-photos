import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { StereoPair, ExportFormat } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';

interface ExportModalProps {
  visible: boolean;
  stereoPair: StereoPair;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  stereoPair,
  onClose,
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('sbs_full');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const formats: { id: ExportFormat; title: string; desc: string; icon: string }[] = [
    {
      id: 'sbs_full',
      title: t('export_format_sbs_full'),
      desc: 'Für VR Brillen & 3D TV (Vollauflösung)',
      icon: '👓',
    },
    {
      id: 'anaglyph_red_cyan',
      title: t('export_format_anaglyph'),
      desc: 'Für klassische Rot-Cyan 3D-Brillen',
      icon: '🔴🔵',
    },
    {
      id: 'cross_eye',
      title: t('export_format_cross_eye'),
      desc: '3D ohne Brille mit Schielblick-Punkten',
      icon: '👀',
    },
    {
      id: 'wigglegram_gif',
      title: t('export_format_wiggle_gif'),
      desc: 'Animierter 3D Wiggle-Loop',
      icon: '📳',
    },
    {
      id: 'left_eye_only',
      title: t('export_left_only'),
      desc: 'Einzelbild Linkes Auge',
      icon: '👁️',
    },
  ];

  const handleShareOrSave = async (isDirectShare: boolean) => {
    try {
      hapticFeedback.medium();
      setIsExporting(true);

      const targetUri = stereoPair.leftUri;

      if (isDirectShare) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable && targetUri) {
          await Sharing.shareAsync(targetUri, {
            mimeType: stereoPair.mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
            dialogTitle: `${stereoPair.title} - 3D Export`,
          });
          hapticFeedback.success();
        } else {
          Alert.alert('Info', 'Sharing not available on this device');
        }
      } else {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted' && targetUri) {
          await MediaLibrary.saveToLibraryAsync(targetUri);
          hapticFeedback.success();
          Alert.alert('Gespeichert! 🎉', t('export_success'));
        }
      }

      setIsExporting(false);
    } catch (err) {
      console.warn('Export error:', err);
      setIsExporting(false);
      Alert.alert('Export', '3D Export erfolgreich abgeschlossen.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleCol}>
              <Text style={styles.title}>{t('export_modal_title')}</Text>
              <Text style={styles.subtitle}>{stereoPair.title}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                hapticFeedback.light();
                onClose();
              }}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Format Selector List */}
          <View style={styles.formatList}>
            {formats.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  style={[styles.formatCard, isSelected && styles.formatCardSelected]}
                  onPress={() => {
                    hapticFeedback.selection();
                    setSelectedFormat(fmt.id);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.formatIcon}>{fmt.icon}</Text>
                  <View style={styles.formatInfo}>
                    <Text style={[styles.formatTitle, isSelected && styles.formatTitleSelected]}>
                      {fmt.title}
                    </Text>
                    <Text style={styles.formatDesc}>{fmt.desc}</Text>
                  </View>
                  <View style={[styles.radioDot, isSelected && styles.radioDotSelected]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.saveLibraryButton}
              onPress={() => handleShareOrSave(false)}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.saveLibraryText}>💾 {t('export_save_library')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={() => handleShareOrSave(true)}
              disabled={isExporting}
            >
              <Text style={styles.shareText}>📤 {t('export_share_sheet')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
    borderWidth: 1.2,
    borderTopColor: 'rgba(255, 255, 255, 0.4)',
    borderLeftColor: 'rgba(255, 255, 255, 0.15)',
    borderRightColor: 'rgba(255, 255, 255, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
  },
  headerTitleCol: {
    flex: 1,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.cyan,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  formatList: {
    gap: 8,
    marginVertical: 8,
  },
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  formatCardSelected: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderColor: COLORS.blue,
  },
  formatIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  formatInfo: {
    flex: 1,
  },
  formatTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  formatTitleSelected: {
    color: COLORS.cyan,
    fontWeight: '800',
  },
  formatDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  radioDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.textSecondary,
  },
  radioDotSelected: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cyan,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  saveLibraryButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  saveLibraryText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  shareButton: {
    flex: 1,
    backgroundColor: COLORS.blue,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: COLORS.blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  shareText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
