import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import SpatialMedia from '../../modules/spatial-media';

/**
 * The platform's own handle for the asset's original bytes.
 *
 * iOS wants the PHAsset local identifier; Android wants the MediaStore
 * content URI. Neither is the path MediaLibrary reports, and on iOS that path
 * is the whole problem: it points inside the Photos container, so opening a
 * video there fails with a permission error.
 */
export function originalIdentifier(asset: MediaLibrary.Asset): string {
  return Platform.OS === 'ios' ? asset.id : asset.uri;
}

export type ProbeState = 'pending' | 'spatial' | 'plain' | 'failed';

export type ProbeResult = {
  state: ProbeState;
  /** Readable copy of the original, resolved while probing; reused on import. */
  originalUri?: string;
  /** Recognisably Apple spatial media that this platform cannot open. */
  unsupported?: boolean;
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
        let copy: string | undefined;
        try {
          copy = await SpatialMedia.exportOriginal(originalIdentifier(asset));
          const inspection = await SpatialMedia.inspect(copy);
          const spatial = inspection.spatial;

          // Hold on to the copy only if it is going to be imported; otherwise
          // probing a large library would leave every candidate behind.
          if (!spatial) {
            void SpatialMedia.discardTemporary(copy);
            copy = undefined;
          }

          publish(id, {
            state: spatial ? 'spatial' : 'plain',
            originalUri: copy,
            unsupported: inspection.unsupportedPlatform === true,
            kind:
              inspection.kind === 'spatial-photo' ||
              inspection.kind === 'spatial-video'
                ? inspection.kind
                : undefined,
          });
        } catch {
          if (copy) void SpatialMedia.discardTemporary(copy);
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
