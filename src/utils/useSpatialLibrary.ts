import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type * as MediaLibrary from 'expo-media-library';
import SpatialMedia, { type SpatialLibraryAsset } from '../../modules/spatial-media';
import type { ProbeResult } from './useSpatialProbe';
import { log } from './log';

/** Photos tags spatial media itself on iOS; Android has no such flag. */
export const NATIVE_SPATIAL_FLAG = Platform.OS === 'ios';

const SPATIAL: ProbeResult = { state: 'spatial' };

/**
 * Shapes PhotoKit's answer like a MediaLibrary asset, so the grid and the
 * importer handle it like any other tile. `ph://` is the scheme the media
 * library's own image loader resolves for thumbnails.
 */
function toAsset(item: SpatialLibraryAsset): MediaLibrary.Asset {
  return {
    id: item.id,
    filename: item.filename,
    uri: `ph://${item.id}`,
    mediaType: item.mediaType,
    mediaSubtypes: [],
    width: item.width,
    height: item.height,
    creationTime: item.creationTime,
    modificationTime: item.creationTime,
    duration: item.duration,
  } as unknown as MediaLibrary.Asset;
}

/**
 * Every spatial asset in the library, straight from PhotoKit.
 *
 * Refetched each time the gallery opens so a spatial photo taken a minute ago
 * is there, and covering the whole library rather than the pages scrolled
 * into view. Results are shaped like the probe's so the gallery reads both the
 * same way.
 */
export function useSpatialLibrary(active: boolean) {
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const refresh = useCallback(async () => {
    if (!NATIVE_SPATIAL_FLAG) return;
    setLoading(true);
    setFailed(false);
    try {
      const items = await SpatialMedia.listSpatialAssets();
      setAssets(items.map(toAsset));
    } catch (error) {
      log.warn('Could not list spatial assets', error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (active) void refresh();
  }, [active, refresh]);

  const results = useMemo(() => {
    const map: Record<string, ProbeResult> = {};
    for (const asset of assets) map[asset.id] = SPATIAL;
    return map;
  }, [assets]);

  return { assets, results, loading, failed, refresh };
}
