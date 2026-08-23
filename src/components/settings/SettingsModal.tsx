import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SFSymbol, SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LanguageCode } from '../../types';
import { palette, radius, spacing, type } from '../../theme';
import { setLanguage } from '../../i18n/translations';
import { useTranslation } from '../../i18n/useTranslation';
import { saveLanguagePreference } from '../../utils/storage';
import { hapticFeedback } from '../../utils/haptics';
import { LEVEL_TOLERANCE_DEGREES } from '../../utils/captureGuidance';
import { IOSSheet } from '../common/IOSSheet';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export const SettingsModal: React.FC<Props> = ({ visible, onClose }) => {
  const { t, language } = useTranslation();
  const insets = useSafeAreaInsets();

  const changeLanguage = async (next: LanguageCode) => {
    if (next === language) return;
    hapticFeedback.selection();
    // The store notifies every `useTranslation` consumer, so the whole app —
    // including this sheet — re-renders in the new language immediately.
    setLanguage(next);
    await saveLanguagePreference(next);
  };

  return (
    <IOSSheet visible={visible} title={t('settings_title')} onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
      >
        <Text style={styles.groupTitle}>{t('settings_language_section')}</Text>
        <View style={styles.group}>
          <ActionRow
            symbol="globe"
            title="Deutsch"
            selected={language === 'de'}
            onPress={() => changeLanguage('de')}
          />
          <Divider />
          <ActionRow
            symbol="globe"
            title="English"
            selected={language === 'en'}
            onPress={() => changeLanguage('en')}
          />
        </View>

        <Text style={styles.groupTitle}>{t('settings_capture_section')}</Text>
        <View style={styles.group}>
          <InfoRow
            symbol="ruler"
            title={t('settings_stereo_base_row')}
            value={t('settings_stereo_base_value')}
          />
          <Divider />
          <InfoRow
            symbol="level"
            title={t('settings_level_tolerance')}
            value={`±${LEVEL_TOLERANCE_DEGREES.toFixed(1)}°`}
          />
          <Divider />
          <InfoRow
            symbol="viewfinder"
            title={t('settings_lidar_row')}
            value={t('settings_lidar_value')}
          />
        </View>
        <Text style={styles.footnote}>{t('settings_footnote')}</Text>

        <Text style={styles.groupTitle}>{t('settings_about_section')}</Text>
        <View style={styles.group}>
          <InfoRow symbol="cube.transparent" title="Spatial3D" value="1.0" />
          <Divider />
          <ActionRow
            symbol="gear"
            title={t('settings_open_ios')}
            onPress={() => Linking.openSettings()}
          />
        </View>
        <Text style={styles.footnote}>{t('settings_about_desc')}</Text>
      </ScrollView>
    </IOSSheet>
  );
};

function Divider() {
  return <View style={styles.divider} />;
}

function InfoRow({
  symbol,
  title,
  value,
}: {
  symbol: SFSymbol;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.row} accessible accessibilityLabel={`${title}, ${value}`}>
      <SymbolView name={symbol} size={18} tintColor={palette.blue} style={styles.glyph} />
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function ActionRow({
  symbol,
  title,
  selected,
  onPress,
}: {
  symbol: SFSymbol;
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { selected }}
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SymbolView name={symbol} size={18} tintColor={palette.blue} style={styles.glyph} />
      <Text style={styles.rowTitle}>{title}</Text>
      {selected ? (
        <SymbolView
          name="checkmark"
          size={16}
          weight="semibold"
          tintColor={palette.blue}
          style={styles.trailingGlyph}
        />
      ) : selected === undefined ? (
        <SymbolView
          name="arrow.up.forward.app"
          size={15}
          tintColor={palette.labelQuaternary}
          style={styles.trailingGlyph}
        />
      ) : (
        <View style={styles.trailingGlyph} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg },
  groupTitle: {
    ...type.eyebrow,
    fontWeight: '600',
    color: palette.labelTertiary,
    marginLeft: spacing.lg,
    marginBottom: 7,
    marginTop: spacing.lg,
  },
  group: {
    borderRadius: radius.group,
    overflow: 'hidden',
    backgroundColor: palette.fill,
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  glyph: { width: 22, height: 22 },
  trailingGlyph: { width: 18, height: 18 },
  rowTitle: { ...type.body, flex: 1, color: palette.label },
  rowValue: { ...type.callout, color: palette.labelSecondary },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 49,
    backgroundColor: palette.separator,
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  footnote: {
    ...type.caption,
    color: palette.labelTertiary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
});
