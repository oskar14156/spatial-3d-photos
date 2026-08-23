import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { LanguageCode } from '../../types';
import { getLanguage, setLanguage } from '../../i18n/translations';
import { saveLanguagePreference } from '../../utils/storage';
import { hapticFeedback } from '../../utils/haptics';
import { IOSSheet } from '../common/IOSSheet';

type Props = {
  visible: boolean;
  onLanguageChange: (lang: LanguageCode) => void;
  onClose: () => void;
};

export const SettingsModal: React.FC<Props> = ({
  visible,
  onLanguageChange,
  onClose,
}) => {
  const current = getLanguage();

  const changeLanguage = async (language: LanguageCode) => {
    hapticFeedback.selection();
    setLanguage(language);
    await saveLanguagePreference(language);
    onLanguageChange(language);
  };

  return (
    <IOSSheet visible={visible} title="Settings" onClose={onClose}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <Text style={styles.groupTitle}>LANGUAGE</Text>
        <View style={styles.group}>
          <SettingRow
            symbol="globe"
            title="Deutsch"
            selected={current === 'de'}
            onPress={() => changeLanguage('de')}
          />
          <Divider />
          <SettingRow
            symbol="globe"
            title="English"
            selected={current === 'en'}
            onPress={() => changeLanguage('en')}
          />
        </View>

        <Text style={styles.groupTitle}>CAPTURE</Text>
        <View style={styles.group}>
          <InfoRow
            symbol="ruler"
            title="Stereo base"
            value="Automatic"
          />
          <Divider />
          <InfoRow
            symbol="move.3d"
            title="Level tolerance"
            value="±1.0°"
          />
          <Divider />
          <InfoRow
            symbol="viewfinder"
            title="LiDAR distance"
            value="Auto when available"
          />
        </View>

        <Text style={styles.footnote}>
          Stereo distance is a comfort recommendation, not a fixed law.
          Near subjects are clamped; distant scenes may intentionally use
          hyperstereo.
        </Text>

        <Text style={styles.groupTitle}>ABOUT</Text>
        <View style={styles.group}>
          <InfoRow
            symbol="cube.transparent"
            title="Spatial3D"
            value="1.0"
          />
          <Divider />
          <SettingRow
            symbol="gear"
            title="Open iOS Settings"
            onPress={() => Linking.openSettings()}
          />
        </View>
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
  symbol: any;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <SymbolView name={symbol} size={18} tintColor="#0A84FF" />
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function SettingRow({
  symbol,
  title,
  selected,
  onPress,
}: {
  symbol: any;
  title: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SymbolView name={symbol} size={18} tintColor="#0A84FF" />
      <Text style={styles.rowTitle}>{title}</Text>
      {selected ? (
        <SymbolView name="checkmark" size={16} tintColor="#0A84FF" weight="semibold" />
      ) : (
        <SymbolView
          name="chevron.right"
          size={12}
          tintColor="rgba(235,235,245,0.28)"
          weight="semibold"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  groupTitle: {
    color: 'rgba(235,235,245,0.42)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.6,
    marginLeft: 16,
    marginBottom: 7,
    marginTop: 18,
  },
  group: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgb(28,28,30)',
  },
  row: {
    minHeight: 50,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: -0.25,
  },
  rowValue: {
    color: 'rgba(235,235,245,0.50)',
    fontSize: 15,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 45,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footnote: {
    color: 'rgba(235,235,245,0.42)',
    fontSize: 12,
    lineHeight: 17,
    marginHorizontal: 16,
    marginTop: 8,
  },
});
