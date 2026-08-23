import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing, type } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
};

/**
 * A standard iOS page sheet with a grabber-height header.
 *
 * `edges` excludes the bottom so content can run under the home indicator and
 * each sheet can apply its own inset — footers need it, scroll views don't.
 */
export function IOSSheet({ visible, title, subtitle, children, onClose }: Props) {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            hitSlop={10}
            onPress={() => {
              hapticFeedback.light();
              onClose();
            }}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <SymbolView
              name="xmark"
              tintColor={palette.labelSecondary}
              size={13}
              weight="bold"
              style={styles.closeGlyph}
            />
          </Pressable>
        </View>

        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: palette.separator,
  },
  titleColumn: { flex: 1 },
  title: { ...type.title2, color: palette.label },
  subtitle: { ...type.caption, marginTop: 2, color: palette.labelSecondary },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.fillSubtle,
  },
  closeGlyph: { width: 14, height: 14 },
  pressed: { opacity: 0.62 },
  body: { flex: 1 },
});
