import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import type { SFSymbol } from 'expo-symbols';
import { Icon } from '../common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AnaglyphColorMode, ExportFormat, StereoPair } from '../../types';
import { type Palette, radius, spacing, type, useTheme, useThemedStyles } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import SpatialMedia from '../../../modules/spatial-media';
import { IOSSheet } from '../common/IOSSheet';

type Props = {
  visible: boolean;
  stereoPair: StereoPair;
  /** Mirrors whatever the viewer is currently showing. */
  anaglyphMode: AnaglyphColorMode;
  onClose: () => void;
};

type FormatRow = {
  id: ExportFormat;
  title: string;
  detail: string;
  symbol: SFSymbol;
};

export const ExportModal: React.FC<Props> = ({
  visible,
  stereoPair,
  anaglyphMode,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  const isPhoto = stereoPair.mediaType === 'photo';
  const [format, setFormat] = useState<ExportFormat>('sbs_full');
  const [busy, setBusy] = useState(false);

  const anaglyphFormat: ExportFormat =
    anaglyphMode === 'mono'
      ? 'anaglyph_mono'
      : anaglyphMode === 'half_color'
      ? 'anaglyph_half_color'
      : 'anaglyph_color';

  const formats = useMemo<FormatRow[]>(() => {
    if (!isPhoto) {
      return [
        {
          id: 'left_eye_only',
          title: t('export_left_only'),
          detail: t('badge_video'),
          symbol: 'video',
        },
        {
          id: 'right_eye_only',
          title: t('export_right_only'),
          detail: t('badge_video'),
          symbol: 'video',
        },
      ];
    }

    return [
      {
        id: 'sbs_full',
        title: t('export_format_sbs_full'),
        detail: t('sbs_explanation'),
        symbol: 'rectangle.split.2x1',
      },
      {
        id: 'sbs_half',
        title: t('export_format_sbs_half'),
        detail: t('viewer_vr_mode'),
        symbol: 'rectangle.compress.vertical',
      },
      {
        id: 'cross_eye',
        title: t('export_format_cross_eye'),
        detail: t('cross_eye_explanation'),
        symbol: 'eye',
      },
      {
        id: anaglyphFormat,
        title: t('export_format_anaglyph'),
        detail: t('anaglyph_explanation'),
        symbol: 'circle.lefthalf.filled',
      },
      {
        id: 'wigglegram_gif',
        title: t('export_format_wiggle_gif'),
        detail: t('wigglegram_explanation'),
        symbol: 'repeat',
      },
      {
        id: 'left_eye_only',
        title: t('export_left_only'),
        detail: t('badge_photo'),
        symbol: 'square.on.square',
      },
      {
        id: 'right_eye_only',
        title: t('export_right_only'),
        detail: t('badge_photo'),
        symbol: 'square.on.square',
      },
    ];
  }, [anaglyphFormat, isPhoto, t]);

  // Keep the selection valid when the pair — or the anaglyph variant — changes.
  useEffect(() => {
    setFormat((current) =>
      formats.some((row) => row.id === current)
        ? current
        : formats[0]?.id ?? 'sbs_full'
    );
  }, [formats]);

  async function createOutput(): Promise<string> {
    if (!isPhoto) {
      return format === 'right_eye_only' ? stereoPair.rightUri : stereoPair.leftUri;
    }
    return SpatialMedia.exportStereoPhoto(
      stereoPair.leftUri,
      stereoPair.rightUri,
      format
    );
  }

  async function run(action: 'share' | 'save') {
    setBusy(true);
    try {
      if (action === 'save') {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) {
          throw new Error(t('import_photos_permission_body'));
        }
      } else if (!(await Sharing.isAvailableAsync())) {
        throw new Error(t('export_failed'));
      }

      const output = await createOutput();

      if (action === 'save') {
        await MediaLibrary.saveToLibraryAsync(output);
        hapticFeedback.success();
        Alert.alert(t('export_saved_title'), t('export_saved_body'));
      } else {
        await Sharing.shareAsync(output);
        hapticFeedback.success();
      }
    } catch (error) {
      hapticFeedback.warning();
      Alert.alert(
        t('export_failed'),
        error instanceof Error ? error.message : t('error')
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <IOSSheet
      visible={visible}
      title={t('export_sheet_title')}
      subtitle={stereoPair.title}
      onClose={onClose}
    >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
      >
        <View style={styles.group}>
          {formats.map((row, index) => {
            const selected = format === row.id;
            return (
              <React.Fragment key={row.id}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    hapticFeedback.selection();
                    setFormat(row.id);
                  }}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <Icon
                    name={row.symbol}
                    size={19}
                    color={selected ? palette.blue : palette.labelSecondary}
                    style={styles.rowGlyph}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDetail} numberOfLines={2}>
                      {row.detail}
                    </Text>
                  </View>
                  {selected && (
                    <Icon
                      name="checkmark"
                      size={15}
                      weight="semibold"
                      color={palette.blue}
                      style={styles.checkGlyph}
                    />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {!isPhoto && <Text style={styles.note}>{t('export_video_note')}</Text>}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => run('save')}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondary,
            (busy) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          <Icon
            name="square.and.arrow.down"
            size={18}
            color={palette.label}
            style={styles.footerGlyph}
          />
          <Text style={styles.secondaryText}>{t('export_save_library_short')}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => run('share')}
          disabled={busy}
          style={({ pressed }) => [
            styles.primary,
            (busy) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color={palette.label} />
          ) : (
            <>
              <Icon
                name="square.and.arrow.up"
                size={18}
                color={palette.label}
                style={styles.footerGlyph}
              />
              <Text style={styles.primaryText}>{t('export_share_short')}</Text>
            </>
          )}
        </Pressable>
      </View>
    </IOSSheet>
  );
};

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  content: { padding: spacing.lg },
  group: {
    overflow: 'hidden',
    borderRadius: radius.group,
    backgroundColor: palette.fill,
  },
  row: {
    minHeight: 62,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowGlyph: { width: 22, height: 22 },
  checkGlyph: { width: 16, height: 16 },
  rowText: { flex: 1, paddingVertical: 10 },
  rowTitle: { ...type.callout, color: palette.label },
  rowDetail: { ...type.caption, fontSize: 11, marginTop: 2, color: palette.labelTertiary },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 49,
    backgroundColor: palette.separator,
  },
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.4 },
  note: {
    ...type.caption,
    color: palette.labelTertiary,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.separator,
    backgroundColor: palette.canvas,
  },
  footerGlyph: { width: 20, height: 20 },
  secondary: {
    flex: 1,
    height: 50,
    borderRadius: radius.group,
    backgroundColor: palette.fillElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryText: { ...type.subheadline, fontWeight: '600', color: palette.label },
  primary: {
    flex: 1,
    height: 50,
    borderRadius: radius.group,
    backgroundColor: palette.blue,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryText: { ...type.subheadline, fontWeight: '700', color: palette.label },
});
