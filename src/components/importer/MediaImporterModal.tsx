import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import type { SFSymbol } from 'expo-symbols';
import { Icon } from '../common/Icon';
import type { StereoPair } from '../../types';
import { DEFAULT_ALIGNMENT } from '../../constants';
import { type Palette, radius, spacing, type, useTheme, useThemedStyles } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import SpatialMedia from '../../../modules/spatial-media';
import {
  createStereoPairFromUris,
  splitSideBySideImage,
} from '../../utils/stereoImageProcessor';
import { IOSSheet } from '../common/IOSSheet';

type Props = {
  visible: boolean;
  onImportComplete: (pair: StereoPair) => void;
  onClose: () => void;
};

type PickedAsset = {
  /** Path to feed the native inspector — the original file where possible. */
  uri: string;
  fileName?: string;
  width?: number;
  height?: number;
};

export const MediaImporterModal: React.FC<Props> = ({
  visible,
  onImportComplete,
  onClose,
}) => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function pick(
    mediaTypes: ImagePicker.MediaType[],
    /**
     * Spatial detection needs the untouched original: the picker hands back a
     * transcoded JPEG/H.264 copy, and transcoding is exactly what strips the
     * HEIC stereo groups and the MV-HEVC eye buffers.
     */
    wantOriginal = false
  ): Promise<PickedAsset | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        t('import_photos_permission'),
        t('import_photos_permission_body')
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return null;

    const picked: PickedAsset = {
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      width: asset.width,
      height: asset.height,
    };

    if (wantOriginal && asset.assetId) {
      try {
        // Reading the original needs Photos access in its own right; the
        // picker's own permission does not cover it, and without this the
        // lookup fails silently and we fall back to the stripped copy.
        const library = await MediaLibrary.requestPermissionsAsync();
        if (library.granted) {
          const info = await MediaLibrary.getAssetInfoAsync(asset.assetId);
          if (info.localUri) picked.uri = info.localUri;
        }
      } catch {
        // Keep the picker copy; `inspect` reports it as transcoded and the
        // caller explains what to do about it.
      }
    }

    return picked;
  }

  async function importAppleSpatial() {
    const asset = await pick(['images', 'videos'], true);
    if (!asset) return;

    setBusy(true);
    try {
      setProgress(t('import_inspecting'));
      const inspection = await SpatialMedia.inspect(asset.uri);

      if (inspection.kind === 'spatial-photo') {
        setProgress(t('import_extracting_photo'));
        const result = await SpatialMedia.splitSpatialPhoto(asset.uri);
        await finish({
          id: `spatial_${Date.now()}`,
          title: asset.fileName || t('import_apple_title'),
          leftUri: result.leftUri,
          rightUri: result.rightUri,
          originalUri: result.originalUri,
          spatialEncoding: 'spatial-heic',
          mediaType: 'photo',
          sourceType: 'imported_spatial',
          createdAt: Date.now(),
          alignment: { ...DEFAULT_ALIGNMENT },
          aspectRatio:
            result.width && result.height ? result.width / result.height : undefined,
        });
        return;
      }

      if (inspection.kind === 'spatial-video') {
        setProgress(t('import_decoding_video'));
        const result = await SpatialMedia.splitSpatialVideo(asset.uri);
        await finish({
          id: `spatial_${Date.now()}`,
          title: asset.fileName || t('import_apple_title'),
          leftUri: result.leftUri,
          rightUri: result.rightUri,
          originalUri: result.originalUri,
          spatialEncoding: 'mv-hevc',
          mediaType: 'video',
          sourceType: 'imported_spatial',
          createdAt: Date.now(),
          alignment: { ...DEFAULT_ALIGNMENT },
          aspectRatio:
            result.width && result.height ? result.width / result.height : undefined,
          durationMs: result.duration ? result.duration * 1000 : undefined,
          isSpatialVideo: true,
        });
        return;
      }

      // Separate "you picked an ordinary photo" from "iOS gave us a copy with
      // the spatial data already stripped" — the fixes are completely different.
      if (inspection.unsupportedPlatform) {
        Alert.alert(
          t('import_platform_unsupported'),
          t('import_platform_unsupported_body')
        );
      } else if (inspection.transcoded) {
        Alert.alert(t('import_transcoded_title'), t('import_transcoded_body'));
      } else {
        Alert.alert(t('import_not_spatial_title'), t('import_not_spatial_body'));
      }
    } catch (error) {
      Alert.alert(
        t('import_failed'),
        error instanceof Error ? error.message : t('error')
      );
    } finally {
      setBusy(false);
    }
  }

  async function importSideBySide() {
    const asset = await pick(['images']);
    if (!asset) return;

    if (!asset.width || !asset.height) {
      Alert.alert(t('import_failed'), t('error'));
      return;
    }

    // A true SBS frame is roughly twice as wide as it is tall; warn rather
    // than refuse, since cropped panoramas are a legitimate edge case.
    if (asset.width < asset.height * 1.5) {
      Alert.alert(t('import_wide_warning_title'), t('import_wide_warning_body'));
    }

    setBusy(true);
    try {
      setProgress(t('import_splitting_sbs'));
      const split = await splitSideBySideImage(
        asset.uri,
        asset.width,
        asset.height
      );

      const pair = createStereoPairFromUris(
        split.leftEyeUri,
        split.rightEyeUri,
        asset.fileName || t('import_sbs_title'),
        'imported_sbs'
      );
      pair.spatialEncoding = 'sbs';
      pair.aspectRatio = split.width / split.height;
      await finish(pair);
    } catch (error) {
      Alert.alert(
        t('import_failed'),
        error instanceof Error ? error.message : t('error')
      );
    } finally {
      setBusy(false);
    }
  }

  async function importTwoPhotos() {
    const left = await pick(['images']);
    if (!left) return;

    hapticFeedback.selection();

    const right = await pick(['images']);
    if (!right) return;

    const pair = createStereoPairFromUris(
      left.uri,
      right.uri,
      t('import_dual_title'),
      'imported_dual'
    );
    pair.spatialEncoding = 'dual';
    if (left.width && left.height) pair.aspectRatio = left.width / left.height;
    await finish(pair);
  }

  async function finish(pair: StereoPair) {
    hapticFeedback.success();
    await Promise.resolve(onImportComplete(pair));
    setBusy(false);
    onClose();
  }

  return (
    <IOSSheet
      visible={visible}
      title={t('import_title')}
      subtitle={t('import_sheet_subtitle')}
      onClose={onClose}
    >
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color={palette.blue} />
          <Text style={styles.busyTitle}>{t('import_processing')}</Text>
          <Text style={styles.busyText}>{progress}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.group}>
            <ImportRow
              symbol="viewfinder.rectangular"
              title={t('import_apple_title')}
              detail={t('import_apple_detail')}
              onPress={importAppleSpatial}
            />
            <View style={styles.divider} />
            <ImportRow
              symbol="rectangle.split.2x1"
              title={t('import_sbs_title')}
              detail={t('import_sbs_detail')}
              onPress={importSideBySide}
            />
            <View style={styles.divider} />
            <ImportRow
              symbol="photo.stack"
              title={t('import_dual_title')}
              detail={t('import_dual_detail')}
              onPress={importTwoPhotos}
            />
          </View>

          <Text style={styles.note}>{t('import_note')}</Text>
        </ScrollView>
      )}
    </IOSSheet>
  );
};

function ImportRow({
  symbol,
  title,
  detail,
  onPress,
}: {
  symbol: SFSymbol;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={detail}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <Icon name={symbol} size={21} color={palette.blue} style={styles.iconGlyph} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>
      <Icon
        name="chevron.right"
        size={12}
        weight="semibold"
        color={palette.labelQuaternary}
        style={styles.chevron}
      />
    </Pressable>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
  content: { padding: spacing.lg },
  group: {
    borderRadius: radius.group,
    overflow: 'hidden',
    backgroundColor: palette.fill,
  },
  row: {
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(10,132,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconGlyph: { width: 24, height: 24 },
  chevron: { width: 14, height: 14 },
  rowText: { flex: 1, paddingVertical: 11 },
  rowTitle: { ...type.headline, fontWeight: '600', color: palette.label },
  rowDetail: { ...type.caption, marginTop: 2, color: palette.labelTertiary },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
    backgroundColor: palette.separator,
  },
  note: {
    ...type.caption,
    color: palette.labelTertiary,
    marginTop: spacing.md,
    marginHorizontal: spacing.xs,
  },
  busy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  busyTitle: { ...type.title3, marginTop: spacing.lg, color: palette.label },
  busyText: {
    ...type.footnote,
    textAlign: 'center',
    marginTop: 5,
    color: palette.labelTertiary,
  },
});
