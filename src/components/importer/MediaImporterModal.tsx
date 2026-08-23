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
import * as ImagePicker from 'expo-image-picker';
import { StereoPair } from '../../types';
import { COLORS } from '../../constants';
import { t } from '../../i18n/translations';
import { hapticFeedback } from '../../utils/haptics';
import { splitSideBySideImage, createStereoPairFromUris } from '../../utils/stereoImageProcessor';

interface MediaImporterModalProps {
  visible: boolean;
  onImportComplete: (pair: StereoPair) => void;
  onClose: () => void;
}

export const MediaImporterModal: React.FC<MediaImporterModalProps> = ({
  visible,
  onImportComplete,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handlePickSpatialOrSBS = async () => {
    try {
      hapticFeedback.light();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('error'), 'Zugriff auf Fotomediathek erforderlich.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const isVideo = asset.type === 'video';

      setIsProcessing(true);
      setStatusMessage(isVideo ? 'Spatial Video wird vorbereitet...' : t('importing_progress'));

      if (isVideo) {
        // iPhone Spatial Video / Side-by-Side Video
        const newPair = createStereoPairFromUris(
          asset.uri,
          asset.uri,
          asset.fileName || 'iPhone Spatial Video 3D',
          'imported_spatial',
          'video'
        );
        newPair.isSpatialVideo = true;
        setIsProcessing(false);
        hapticFeedback.success();
        onImportComplete(newPair);
        onClose();
      } else {
        // Spatial / Side-by-Side Photo
        const splitted = await splitSideBySideImage(asset.uri, asset.width, asset.height);
        const newPair = createStereoPairFromUris(
          splitted.leftEyeUri,
          splitted.rightEyeUri,
          asset.fileName || 'Spatial Photo 3D',
          'imported_spatial',
          'photo'
        );
        setIsProcessing(false);
        hapticFeedback.success();
        onImportComplete(newPair);
        onClose();
      }
    } catch (err) {
      console.error('Import failed:', err);
      setIsProcessing(false);
      Alert.alert(t('error'), 'Fehler beim Verarbeiten des 3D-Mediums.');
    }
  };

  const handlePickDualImages = async () => {
    try {
      hapticFeedback.light();
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('error'), 'Zugriff auf Fotomediathek erforderlich.');
        return;
      }

      // Pick Left Eye
      Alert.alert('Schritt 1/2', 'Wähle bitte zuerst das LINKE Foto (Left Eye) aus.');
      const leftResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (leftResult.canceled || !leftResult.assets || !leftResult.assets[0]) return;
      const leftUri = leftResult.assets[0].uri;

      // Pick Right Eye
      Alert.alert('Schritt 2/2', 'Wähle nun das RECHTE Foto (Right Eye) aus.');
      const rightResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (rightResult.canceled || !rightResult.assets || !rightResult.assets[0]) return;
      const rightUri = rightResult.assets[0].uri;

      setIsProcessing(true);
      const newPair = createStereoPairFromUris(
        leftUri,
        rightUri,
        'Dual-Shot 3D Stereopaar',
        'imported_dual',
        'photo'
      );

      setIsProcessing(false);
      hapticFeedback.success();
      onImportComplete(newPair);
      onClose();
    } catch (err) {
      console.error('Dual import failed:', err);
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('import_title')}</Text>
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

          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={COLORS.blue} />
              <Text style={styles.processingText}>{statusMessage}</Text>
            </View>
          ) : (
            <View style={styles.optionsList}>
              {/* Option 1: Spatial / SBS Media */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handlePickSpatialOrSBS}
                activeOpacity={0.7}
              >
                <View style={styles.iconCircle}>
                  <Text style={styles.optionIcon}>✂️</Text>
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Spatial Photo / Video teilen</Text>
                  <Text style={styles.optionDesc}>
                    Automatisches Splitten von iPhone 15/16 Pro Spatial Videos & Side-by-Side (SBS) Fotos in L/R Kanäle.
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Option 2: 2 Separate Photos */}
              <TouchableOpacity
                style={styles.optionCard}
                onPress={handlePickDualImages}
                activeOpacity={0.7}
              >
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(94, 92, 230, 0.2)' }]}>
                  <Text style={styles.optionIcon}>📸</Text>
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>2 Einzelfotos auswählen</Text>
                  <Text style={styles.optionDesc}>
                    Wähle zwei nacheinander aufgenommene Fotos (Links + Rechts) für ein manuelles 3D-Paar.
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
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
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
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
  optionsList: {
    gap: 12,
    marginVertical: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionIcon: {
    fontSize: 22,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  optionDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  processingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 14,
  },
  processingText: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '700',
  },
});
