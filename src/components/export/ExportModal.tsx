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
import { SymbolView } from 'expo-symbols';
import type { ExportFormat, StereoPair } from '../../types';
import { IOSSheet } from '../common/IOSSheet';
import SpatialMedia from '../../../modules/spatial-media';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  visible: boolean;
  stereoPair: StereoPair;
  onClose: () => void;
};

const PHOTO_FORMATS: {
  id: ExportFormat;
  title: string;
  detail: string;
  symbol: any;
}[] = [
  {
    id: 'sbs_full',
    title: 'Side by Side · Full',
    detail: 'Full left + right eye resolution',
    symbol: 'rectangle.split.2x1',
  },
  {
    id: 'sbs_half',
    title: 'Side by Side · Half',
    detail: 'Standard packed SBS width',
    symbol: 'rectangle.compress.vertical',
  },
  {
    id: 'cross_eye',
    title: 'Cross Eye',
    detail: 'Right eye first for free viewing',
    symbol: 'eye.trianglebadge.exclamationmark',
  },
  {
    id: 'anaglyph_red_cyan',
    title: 'Red / Cyan Anaglyph',
    detail: 'For red-cyan glasses',
    symbol: 'circle.lefthalf.filled',
  },
  {
    id: 'wigglegram_gif',
    title: 'Wiggle GIF',
    detail: 'Alternating stereo loop',
    symbol: 'repeat',
  },
  {
    id: 'left_eye_only',
    title: 'Left Eye',
    detail: 'Single left image',
    symbol: 'eye',
  },
  {
    id: 'right_eye_only',
    title: 'Right Eye',
    detail: 'Single right image',
    symbol: 'eye',
  },
];

export const ExportModal: React.FC<Props> = ({
  visible,
  stereoPair,
  onClose,
}) => {
  const [format, setFormat] = useState<ExportFormat>(
    stereoPair.mediaType === 'photo' ? 'sbs_full' : 'left_eye_only'
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFormat(stereoPair.mediaType === 'photo' ? 'sbs_full' : 'left_eye_only');
  }, [stereoPair.mediaType]);

  const formats = useMemo(() => {
    if (stereoPair.mediaType === 'photo') return PHOTO_FORMATS;

    return [
      {
        id: 'left_eye_only' as ExportFormat,
        title: 'Left Eye Video',
        detail: 'Decoded left-eye movie',
        symbol: 'video',
      },
      {
        id: 'right_eye_only' as ExportFormat,
        title: 'Right Eye Video',
        detail: 'Decoded right-eye movie',
        symbol: 'video',
      },
    ];
  }, [stereoPair.mediaType]);

  async function createOutput(): Promise<string> {
    if (stereoPair.mediaType === 'video') {
      if (format === 'right_eye_only') return stereoPair.rightUri;
      return stereoPair.leftUri;
    }

    return SpatialMedia.exportStereoPhoto(
      stereoPair.leftUri,
      stereoPair.rightUri,
      format
    );
  }

  async function share() {
    try {
      setBusy(true);
      const output = await createOutput();
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Share Sheet is unavailable.');
      await Sharing.shareAsync(output);
      hapticFeedback.success();
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Could not create the export.');
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    try {
      setBusy(true);
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Photos permission is required to save media.');
      }

      const output = await createOutput();
      await MediaLibrary.saveToLibraryAsync(output);
      hapticFeedback.success();
      Alert.alert('Saved', 'The export was added to Photos.');
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Could not save the export.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <IOSSheet
      visible={visible}
      title="Export"
      subtitle={stereoPair.title}
      onClose={onClose}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.group}>
          {formats.map((item, index) => {
            const selected = format === item.id;
            return (
              <React.Fragment key={item.id}>
                {index > 0 && <View style={styles.divider} />}
                <Pressable
                  onPress={() => {
                    setFormat(item.id);
                    hapticFeedback.selection();
                  }}
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    name={item.symbol}
                    size={19}
                    tintColor={selected ? '#0A84FF' : 'rgba(235,235,245,0.72)'}
                  />
                  <View style={styles.rowText}>
                    <Text style={styles.title}>{item.title}</Text>
                    <Text style={styles.detail}>{item.detail}</Text>
                  </View>
                  {selected && (
                    <SymbolView
                      name="checkmark"
                      size={15}
                      weight="semibold"
                      tintColor="#0A84FF"
                    />
                  )}
                </Pressable>
              </React.Fragment>
            );
          })}
        </View>

        {stereoPair.mediaType === 'video' && (
          <Text style={styles.note}>
            Spatial MV-HEVC is decoded into actual left and right eye movies
            during import. Video composite export can be added later without
            pretending the original file is already SBS.
          </Text>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={save}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondary,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView name="square.and.arrow.down" size={18} tintColor="#FFFFFF" />
          <Text style={styles.secondaryText}>Save to Photos</Text>
        </Pressable>

        <Pressable
          onPress={share}
          disabled={busy}
          style={({ pressed }) => [
            styles.primary,
            pressed && styles.pressed,
          ]}
        >
          {busy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <SymbolView name="square.and.arrow.up" size={18} tintColor="#FFFFFF" />
              <Text style={styles.primaryText}>Share</Text>
            </>
          )}
        </Pressable>
      </View>
    </IOSSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 110,
  },
  group: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: 'rgb(28,28,30)',
  },
  row: {
    minHeight: 62,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
    paddingVertical: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  detail: {
    color: 'rgba(235,235,245,0.44)',
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 46,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  pressed: {
    opacity: 0.62,
  },
  note: {
    color: 'rgba(235,235,245,0.42)',
    fontSize: 12,
    lineHeight: 17,
    margin: 14,
  },
  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 14,
    flexDirection: 'row',
    gap: 10,
  },
  secondary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgb(44,44,46)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  primary: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#0A84FF',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
