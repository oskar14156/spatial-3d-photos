import { useCallback, useEffect, useRef, useState } from 'react';
import * as MediaLibrary from 'expo-media-library';
import SpatialMedia from '../../modules/spatial-media';

export type ProbeState = 'pending' | 'spatial' | 'plain' | 'failed';

export type ProbeResult = {
  state: ProbeState;
  /** Original file URI, resolved while probing; reused by the importer. */
  originalUri?: string;
  kind?: 'spatial-photo' | 'spatial-video';
};

/**
 * Only these can carry Apple's stereo payload, so everything else is settled
 * without touching the file. Skipping JPEGs and H.264 clips is what keeps a
 * multi-thousand-item library from being decoded one asset at a time.
 */
function isCandidate(asset: MediaLibrary.Asset): boolean {
  const name = asset.filename.toLowerCase();
  return (
    name.endsWith('.heic') ||
    name.endsWith('.heif') ||
    name.endsWith('.mov')
  );
}

/**
 * Probing a video decodes frames, so keep very few in flight; the UI stays
 * responsive and the badges fill in as results land.
 */
const MAX_IN_FLIGHT = 2;

/**
 * Works out which library assets are genuine Apple spatial media.
 *
 * There is no metadata flag to read from JavaScript — the stereo pairing lives
 * in the HEIC container groups or in the MV-HEVC layer structure — so each
 * candidate has to be opened natively. Results are cached by asset id for the
 * life of the screen and the queue is bounded.
 */
export function useSpatialProbe(assets: MediaLibrary.Asset[]) {
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [scanning, setScanning] = useState(false);

  const cache = useRef<Record<string, ProbeResult>>({});
  const queue = useRef<string[]>([]);
  const queued = useRef<Set<string>>(new Set());
  const inFlight = useRef(0);
  const assetsById = useRef<Record<string, MediaLibrary.Asset>>({});
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const publish = useCallback((id: string, result: ProbeResult) => {
    cache.current[id] = result;
    if (mounted.current) {
      setResults((prev) => ({ ...prev, [id]: result }));
    }
  }, []);

  const pump = useCallback(() => {
    while (inFlight.current < MAX_IN_FLIGHT && queue.current.length) {
      const id = queue.current.shift();
      if (!id) break;

      const asset = assetsById.current[id];
      if (!asset) continue;

      inFlight.current += 1;

      (async () => {
        try {
          const info = await MediaLibrary.getAssetInfoAsync(asset.id);
          const uri = info.localUri ?? asset.uri;
          const inspection = await SpatialMedia.inspect(uri);

          publish(id, {
            state: inspection.spatial ? 'spatial' : 'plain',
            originalUri: uri,
            kind:
              inspection.kind === 'spatial-photo' ||
              inspection.kind === 'spatial-video'
                ? inspection.kind
                : undefined,
          });
        } catch {
          // A probe failure is not an import failure; treat it as ordinary
          // media so the asset stays selectable.
          publish(id, { state: 'failed' });
        } finally {
          inFlight.current -= 1;
          if (queue.current.length) {
            pump();
          } else if (inFlight.current === 0 && mounted.current) {
            setScanning(false);
          }
        }
      })();
    }
  }, [publish]);

  useEffect(() => {
    let added = false;

    for (const asset of assets) {
      assetsById.current[asset.id] = asset;
      if (cache.current[asset.id] || queued.current.has(asset.id)) continue;

      queued.current.add(asset.id);

      if (!isCandidate(asset)) {
        publish(asset.id, { state: 'plain' });
        continue;
      }

      queue.current.push(asset.id);
      added = true;
    }

    if (added) {
      setScanning(true);
      pump();
    }
  }, [assets, publish, pump]);

  return { results, scanning };
}
