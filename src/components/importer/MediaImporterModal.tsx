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
import { SymbolView } from 'expo-symbols';
import type { StereoPair } from '../../types';
import { DEFAULT_ALIGNMENT } from '../../constants';
import { IOSSheet } from '../common/IOSSheet';
import SpatialMedia from '../../../modules/spatial-media';
import {
  createStereoPairFromUris,
  splitSideBySideImage,
} from '../../utils/stereoImageProcessor';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  visible: boolean;
  onImportComplete: (pair: StereoPair) => void;
  onClose: () => void;
};

export const MediaImporterModal: React.FC<Props> = ({
  visible,
  onImportComplete,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');

  async function pickAsset(mediaTypes: ['images'] | ['videos'] | ['images', 'videos']) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Photos access required',
        'Allow access to import spatial and stereo media.'
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });

    return result.canceled ? null : result.assets[0] ?? null;
  }

  async function importAppleSpatial() {
    const asset = await pickAsset(['images', 'videos']);
    if (!asset) return;

    try {
      setBusy(true);
      setProgress('Inspecting Apple spatial media…');

      const inspection = await SpatialMedia.inspect(asset.uri);

      if (inspection.kind === 'spatial-photo') {
        setProgress('Extracting left and right images…');
        const result = await SpatialMedia.splitSpatialPhoto(asset.uri);
        const pair: StereoPair = {
          id: `spatial_${Date.now()}`,
          title: asset.fileName || 'Spatial Photo',
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
        };
        await finish(pair);
        return;
      }

      if (inspection.kind === 'spatial-video') {
        setProgress('Decoding MV-HEVC left and right eye video…');
        const result = await SpatialMedia.splitSpatialVideo(asset.uri);
        const pair: StereoPair = {
          id: `spatial_${Date.now()}`,
          title: asset.fileName || 'Spatial Video',
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
        };
        await finish(pair);
        return;
      }

      Alert.alert(
        'Not Apple spatial media',
        'Choose “Side-by-side image” for an SBS photo, or “Two photos” for a stereo pair.'
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert(
        'Could not import',
        error?.message || 'The spatial media could not be decoded.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function importSBS() {
    const asset = await pickAsset(['images']);
    if (!asset) return;

    if (!asset.width || !asset.height) {
      Alert.alert('Unsupported image', 'Image dimensions could not be read.');
      return;
    }

    if (asset.width < asset.height * 1.5) {
      Alert.alert(
        'This may not be side-by-side',
        'The selected image is not especially wide. It can still be split, but verify the result.'
      );
    }

    try {
      setBusy(true);
      setProgress('Splitting side-by-side image…');
      const split = await splitSideBySideImage(
        asset.uri,
        asset.width,
        asset.height
      );

      const pair = createStereoPairFromUris(
        split.leftEyeUri,
        split.rightEyeUri,
        asset.fileName || 'Side-by-Side',
        'imported_sbs',
        'photo'
      );
      pair.spatialEncoding = 'sbs';
      pair.aspectRatio = split.width / split.height;
      await finish(pair);
    } catch (error) {
      console.error(error);
      Alert.alert('Import failed', 'The side-by-side image could not be split.');
    } finally {
      setBusy(false);
    }
  }

  async function importDual() {
    const left = await pickAsset(['images']);
    if (!left) return;

    hapticFeedback.selection();

    const right = await pickAsset(['images']);
    if (!right) return;

    const pair = createStereoPairFromUris(
      left.uri,
      right.uri,
      'Stereo Pair',
      'imported_dual',
      'photo'
    );
    pair.spatialEncoding = 'dual';
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
      title="Import"
      subtitle="Choose the actual source format"
      onClose={onClose}
    >
      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator size="large" color="#0A84FF" />
          <Text style={styles.busyTitle}>Processing</Text>
          <Text style={styles.busyText}>{progress}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <ImportRow
            symbol="viewfinder.rectangular"
            title="Apple Spatial Photo or Video"
            detail="HEIC stereo pair or MV-HEVC from iPhone"
            onPress={importAppleSpatial}
          />
          <Divider />
          <ImportRow
            symbol="rectangle.split.2x1"
            title="Side-by-side image"
            detail="One image containing left and right views"
            onPress={importSBS}
          />
          <Divider />
          <ImportRow
            symbol="photo.stack"
            title="Two photos"
            detail="Select left image, then right image"
            onPress={importDual}
          />

          <Text style={styles.note}>
            Spatial media is inspected before import. Normal photos are no
            longer silently treated as side-by-side.
          </Text>
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
  symbol: any;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <SymbolView name={symbol} size={22} tintColor="#0A84FF" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <SymbolView
        name="chevron.right"
        size={12}
        weight="semibold"
        tintColor="rgba(235,235,245,0.28)"
      />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  content: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgb(28,28,30)',
  },
  row: {
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(10,132,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    paddingVertical: 11,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  detail: {
    color: 'rgba(235,235,245,0.48)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 68,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  note: {
    color: 'rgba(235,235,245,0.42)',
    fontSize: 12,
    lineHeight: 17,
    padding: 16,
    backgroundColor: '#000',
  },
  busy: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  busyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  busyText: {
    color: 'rgba(235,235,245,0.48)',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
});
