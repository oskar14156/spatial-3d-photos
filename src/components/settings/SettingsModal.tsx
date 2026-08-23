import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LanguageCode } from '../../types';
import { COLORS } from '../../constants';
import { t, setLanguage, getLanguage } from '../../i18n/translations';
import { saveLanguagePreference } from '../../utils/storage';
import { hapticFeedback } from '../../utils/haptics';

interface SettingsModalProps {
  visible: boolean;
  onLanguageChange: (lang: LanguageCode) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  onLanguageChange,
  onClose,
}) => {
  const currentLang = getLanguage();

  const handleSelectLang = async (lang: LanguageCode) => {
    hapticFeedback.selection();
    setLanguage(lang);
    await saveLanguagePreference(lang);
    onLanguageChange(lang);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('settings_title')}</Text>
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

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Language Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('settings_language')}</Text>
              <View style={styles.langRow}>
                <TouchableOpacity
                  style={[styles.langPill, currentLang === 'de' && styles.langPillActive]}
                  onPress={() => handleSelectLang('de')}
                >
                  <Text style={[styles.langPillText, currentLang === 'de' && styles.langPillTextActive]}>
                    🇩🇪 Deutsch
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.langPill, currentLang === 'en' && styles.langPillActive]}
                  onPress={() => handleSelectLang('en')}
                >
                  <Text style={[styles.langPillText, currentLang === 'en' && styles.langPillTextActive]}>
                    🇬🇧 English
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 3D Stereobase Science Guide */}
            <View style={styles.guideCard}>
              <Text style={styles.guideHeading}>📐 {t('stereobase_rule_title')}</Text>
              <Text style={styles.guideParagraph}>
                In der Stereofotografie bestimmt der Abstand zwischen den zwei Kamera-Positionen (die Basislinie) die wahrgenommene räumliche Tiefe:
              </Text>
              <View style={styles.formulaBox}>
                <Text style={styles.formulaText}>Basisabstand = Motiventfernung / 30</Text>
              </View>
              <View style={styles.bulletList}>
                <Text style={styles.bulletItem}>
                  🌸 <Text style={styles.bulletBold}>Makro (25cm Entfernung):</Text> ~8mm Versatz
                </Text>
                <Text style={styles.bulletItem}>
                  👤 <Text style={styles.bulletBold}>Porträt (2m Entfernung):</Text> ~6.5cm Versatz (menschlicher Augenabstand)
                </Text>
                <Text style={styles.bulletItem}>
                  🏛️ <Text style={styles.bulletBold}>Gebäude (25m Entfernung):</Text> ~85cm Versatz (1 großer Schritt)
                </Text>
                <Text style={styles.bulletItem}>
                  🏔️ <Text style={styles.bulletBold}>Berge / Landschaft (1.5km):</Text> ~50m Versatz (<Text style={styles.hyperstereoHighlight}>Hyperstereo</Text> für spektakuläre Tiefe!)
                </Text>
              </View>
            </View>

            {/* App Info & About */}
            <View style={styles.aboutCard}>
              <Text style={styles.aboutTitle}>Spatial 3D Studio for iOS</Text>
              <Text style={styles.aboutVersion}>Version 1.0.0 (Native Cupertino Build)</Text>
              <Text style={styles.aboutDesc}>
                {t('settings_about_desc')}
              </Text>
            </View>
          </ScrollView>
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
    maxHeight: '85%',
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
  scrollArea: {
    marginBottom: 10,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
  },
  langPill: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  langPillActive: {
    backgroundColor: 'rgba(10, 132, 255, 0.25)',
    borderColor: COLORS.blue,
  },
  langPillText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  langPillTextActive: {
    color: COLORS.cyan,
    fontWeight: '800',
  },
  guideCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  guideHeading: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  guideParagraph: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  formulaBox: {
    backgroundColor: 'rgba(10, 132, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.4)',
  },
  formulaText: {
    color: COLORS.cyan,
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'Courier',
  },
  bulletList: {
    marginTop: 8,
    gap: 6,
  },
  bulletItem: {
    color: COLORS.textPrimary,
    fontSize: 12,
    lineHeight: 16,
  },
  bulletBold: {
    fontWeight: '800',
    color: COLORS.cyan,
  },
  hyperstereoHighlight: {
    color: COLORS.yellow,
    fontWeight: '800',
  },
  aboutCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  aboutTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  aboutVersion: {
    color: COLORS.textSecondary,
    fontSize: 11,
  },
  aboutDesc: {
    color: COLORS.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
  },
});
