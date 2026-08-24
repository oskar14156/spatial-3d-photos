import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { Icon } from '../common/Icon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { StereoPair } from '../../types';
import { type Palette, radius, spacing, type, useTheme, useThemedStyles } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { hapticFeedback } from '../../utils/haptics';
import { useSpatialProbe, type ProbeResult } from '../../utils/useSpatialProbe';
import { importAsset, type ImportOutcome } from '../../utils/importAsset';
import { Segmented } from '../common/Segmented';

type Props = {
  visible: boolean;
  onClose: () => void;
  onImported: (pairs: StereoPair[]) => void;
  /** Opens the manual paths (side-by-side, two photos). */
  onOpenManual: () => void;
};

type Filter = 'all' | 'spatial';

const PAGE = 90;

/**
 * The photo gallery, in the app.
 *
 * The old importer asked you to choose a *format* before it would show you a
 * single picture, and the system picker cannot mark which of your photos are
 * spatial. This browses the library directly, flags the spatial ones as it
 * finds them, sorts them to the front, and imports as many as you tick.
 */
export const GalleryPicker: React.FC<Props> = ({
  visible,
  onClose,
  onImported,
  onOpenManual,
}) => {
  const { t } = useTranslation();
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState<boolean | null>(null);

  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState<string | null>(null);

  const { results, scanning } = useSpatialProbe(assets);

  const columns = width >= 700 ? 5 : 3;
  const tile = (width - (columns + 1) * 2) / columns;

  const loadPage = useCallback(
    async (after?: string) => {
      setLoading(true);
      try {
        const page = await MediaLibrary.getAssetsAsync({
          first: PAGE,
          after,
          mediaType: ['photo', 'video'],
          sortBy: [MediaLibrary.SortBy.creationTime],
        });
        setAssets((prev) => (after ? [...prev, ...page.assets] : page.assets));
        setCursor(page.endCursor);
        setHasMore(page.hasNextPage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    (async () => {
      const granted = await MediaLibrary.requestPermissionsAsync();
      if (cancelled) return;
      setPermission(granted.granted);
      if (granted.granted && !assets.length) void loadPage();
    })();

    return () => {
      cancelled = true;
    };
    // Re-running on every asset change would re-request on each page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const spatialIds = useMemo(
    () =>
      assets
        .filter((asset) => results[asset.id]?.state === 'spatial')
        .map((asset) => asset.id),
    [assets, results]
  );

  const visibleAssets = useMemo(() => {
    const list =
      filter === 'spatial'
        ? assets.filter((asset) => results[asset.id]?.state === 'spatial')
        : [...assets];

    if (filter === 'all') {
      // Stable partition: spatial first, everything else in library order.
      const rank = (asset: MediaLibrary.Asset) =>
        results[asset.id]?.state === 'spatial' ? 0 : 1;
      list.sort((a, b) => rank(a) - rank(b));
    }

    return list;
  }, [assets, filter, results]);

  const toggle = useCallback((id: string) => {
    hapticFeedback.selection();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const runImport = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;

      const byId = new Map(assets.map((asset) => [asset.id, asset]));
      const imported: StereoPair[] = [];
      const failures: ImportOutcome[] = [];

      for (let index = 0; index < ids.length; index += 1) {
        const asset = byId.get(ids[index]);
        if (!asset) continue;

        setImporting(t('import_progress', { current: index + 1, total: ids.length }));

        const outcome = await importAsset(asset, results[asset.id], t);
        if (outcome.pair) imported.push(outcome.pair);
        else failures.push(outcome);
      }

      setImporting(null);
      setSelected(new Set());

      if (imported.length) {
        hapticFeedback.success();
        onImported(imported);
      }

      if (failures.length) {
        hapticFeedback.warning();
        Alert.alert(
          t('import_partial_title'),
          failures
            .slice(0, 4)
            .map((failure) => `• ${failure.reason}`)
            .join('\n')
        );
      }

      if (imported.length) onClose();
    },
    [assets, onClose, onImported, results, t]
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top ? 0 : spacing.md }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.headerAction}>{t('cancel')}</Text>
          </Pressable>

          <View style={styles.headerTitle}>
            <Text style={styles.title}>{t('gallery_title')}</Text>
            {scanning && (
              <Text style={styles.subtitle}>{t('gallery_scanning')}</Text>
            )}
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onOpenManual}
            hitSlop={10}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text style={styles.headerAction}>{t('gallery_manual')}</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          <Segmented<Filter>
            accessibilityLabel={t('gallery_filter')}
            value={filter}
            items={[
              { id: 'all', label: t('gallery_filter_all') },
              {
                id: 'spatial',
                label: `${t('gallery_filter_spatial')}${
                  spatialIds.length ? ` (${spatialIds.length})` : ''
                }`,
              },
            ]}
            onChange={setFilter}
          />
        </View>

        {permission === false ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>
              {t('import_photos_permission_body')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={visibleAssets}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            key={columns}
            contentContainerStyle={{ paddingBottom: insets.bottom + 130 }}
            onEndReachedThreshold={0.6}
            onEndReached={() => {
              if (hasMore && !loading) void loadPage(cursor);
            }}
            ListEmptyComponent={
              loading ? null : (
                <Text style={styles.noticeText}>
                  {filter === 'spatial'
                    ? t('gallery_no_spatial')
                    : t('gallery_empty')}
                </Text>
              )
            }
            ListFooterComponent={
              loading ? (
                <ActivityIndicator style={styles.footer} color={palette.blue} />
              ) : null
            }
            renderItem={({ item }) => (
              <Tile
                asset={item}
                size={tile}
                probe={results[item.id]}
                selected={selected.has(item.id)}
                onPress={() => toggle(item.id)}
              />
            )}
          />
        )}

        <View style={[styles.dock, { paddingBottom: insets.bottom + spacing.md }]}>
          {spatialIds.length > 0 && (
            <Pressable
              accessibilityRole="button"
              onPress={() => runImport(spatialIds)}
              disabled={!!importing}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon
                name="sparkles"
                size={15}
                weight="semibold"
                color={palette.blue}
                style={styles.buttonGlyph}
              />
              <Text style={styles.secondaryLabel}>
                {t('gallery_import_all_spatial', { count: spatialIds.length })}
              </Text>
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!selected.size || !!importing}
            onPress={() => runImport([...selected])}
            style={({ pressed }) => [
              styles.primaryButton,
              (!selected.size || !!importing) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {importing ? (
              <>
                <ActivityIndicator color={palette.onAccent} />
                <Text style={styles.primaryLabel}>{importing}</Text>
              </>
            ) : (
              <Text style={styles.primaryLabel}>
                {selected.size
                  ? t('gallery_import_selected', { count: selected.size })
                  : t('gallery_select_prompt')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

function Tile({
  asset,
  size,
  probe,
  selected,
  onPress,
}: {
  asset: MediaLibrary.Asset;
  size: number;
  probe?: ProbeResult;
  selected: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);
  const spatial = probe?.state === 'spatial';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={asset.filename}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        { width: size, height: size },
        pressed && styles.pressed,
      ]}
    >
      <Image source={{ uri: asset.uri }} style={styles.tileImage} />

      {spatial && (
        <View style={styles.spatialBadge}>
          <Text style={styles.spatialBadgeText}>3D</Text>
        </View>
      )}

      {asset.mediaType === 'video' && (
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(asset.duration)}
          </Text>
        </View>
      )}

      <View style={[styles.check, selected && styles.checkOn]}>
        {selected && (
          <Icon
            name="checkmark"
            size={11}
            weight="bold"
            color={palette.onAccent}
            style={styles.checkGlyph}
          />
        )}
      </View>

      {selected && <View style={styles.selectedOverlay} />}
    </Pressable>
  );
}

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.canvas },
    header: {
      minHeight: 54,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    headerTitle: { flex: 1, alignItems: 'center' },
    title: { ...type.headline, color: palette.label },
    subtitle: { ...type.caption, marginTop: 1, color: palette.labelTertiary },
    headerAction: { ...type.callout, color: palette.blue },
    filterRow: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },

    tile: { margin: 1, backgroundColor: palette.fillElevated },
    tileImage: { width: '100%', height: '100%' },
    selectedOverlay: {
      ...StyleSheet.absoluteFillObject,
      borderWidth: 3,
      borderColor: palette.blue,
    },
    spatialBadge: {
      position: 'absolute',
      top: 5,
      left: 5,
      height: 17,
      paddingHorizontal: 5,
      borderRadius: 5,
      justifyContent: 'center',
      backgroundColor: palette.blue,
    },
    spatialBadgeText: { ...type.eyebrow, fontSize: 9, color: '#FFFFFF' },
    durationBadge: {
      position: 'absolute',
      right: 5,
      bottom: 5,
      paddingHorizontal: 4,
      borderRadius: 4,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    durationText: { ...type.caption, fontSize: 10, color: '#FFFFFF' },
    check: {
      position: 'absolute',
      top: 5,
      right: 5,
      width: 21,
      height: 21,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.9)',
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    checkOn: { backgroundColor: palette.blue, borderColor: palette.blue },
    checkGlyph: { width: 12, height: 12 },

    notice: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    noticeText: {
      ...type.footnote,
      textAlign: 'center',
      padding: spacing.xl,
      color: palette.labelSecondary,
    },
    footer: { paddingVertical: spacing.lg },

    dock: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: palette.separator,
      backgroundColor: palette.canvas,
    },
    primaryButton: {
      minHeight: 50,
      borderRadius: radius.group,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.blue,
    },
    buttonDisabled: { opacity: 0.4 },
    primaryLabel: { ...type.callout, fontWeight: '600', color: palette.onAccent },
    secondaryButton: {
      minHeight: 46,
      borderRadius: radius.group,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      backgroundColor: palette.fill,
    },
    secondaryLabel: { ...type.callout, fontWeight: '600', color: palette.blue },
    buttonGlyph: { width: 17, height: 17 },
    pressed: { opacity: 0.7 },
  });
