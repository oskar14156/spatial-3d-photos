import * as MediaLibrary from 'expo-media-library';
import type { StereoPair } from '../types';
import { DEFAULT_ALIGNMENT } from '../constants';
import SpatialMedia from '../../modules/spatial-media';
import { originalIdentifier, type ProbeResult } from './useSpatialProbe';
import { splitSideBySideImage } from './stereoImageProcessor';

export type ImportOutcome = {
  pair?: StereoPair;
  /** Human-readable explanation, shown when a batch item could not be used. */
  reason: string;
};

type Translate = (key: never, params?: Record<string, string | number>) => string;

/**
 * Turns one library asset into a stereo pair.
 *
 * Shared by the gallery grid and the manual importer so both agree on what
 * counts as spatial and produce identically shaped projects.
 */
export async function importAsset(
  asset: MediaLibrary.Asset,
  probe: ProbeResult | undefined,
  translate: Translate
): Promise<ImportOutcome> {
  const t = translate as unknown as (
    key: string,
    params?: Record<string, string | number>
  ) => string;

  try {
    const startedAt = Date.now();
    console.log(`[Spatial3D] import start: ${asset.filename}`);

    // The probe keeps its copy when the asset turned out to be spatial; make
    // a fresh one otherwise. Either way we work on a file we are allowed to
    // read, never on the library path itself.
    const uri =
      probe?.originalUri ??
      (await SpatialMedia.exportOriginal(originalIdentifier(asset)));

    // Gallery probing already decoded the opening frames. Reusing its result
    // avoids probing a spatial video a second time before the expensive split.
    const inspection =
      probe?.state === 'spatial' && probe.kind
        ? {
            kind: probe.kind,
            spatial: true,
            transcoded: false,
          }
        : await SpatialMedia.inspect(uri);

    if (inspection.kind === 'spatial-photo') {
      console.log(`[Spatial3D] split spatial photo: ${asset.filename}`);
      const result = await SpatialMedia.splitSpatialPhoto(uri);
      console.log(`[Spatial3D] import finished: ${asset.filename} (${Date.now() - startedAt}ms)`);
      return {
        reason: '',
        pair: {
          id: `spatial_${asset.id}`,
          title: asset.filename,
          leftUri: result.leftUri,
          rightUri: result.rightUri,
          originalUri: result.originalUri,
          spatialEncoding: 'spatial-heic',
          mediaType: 'photo',
          sourceType: 'imported_spatial',
          createdAt: asset.creationTime || Date.now(),
          alignment: { ...DEFAULT_ALIGNMENT },
          aspectRatio:
            result.width && result.height
              ? result.width / result.height
              : undefined,
        },
      };
    }

    if (inspection.kind === 'spatial-video') {
      console.log(`[Spatial3D] split spatial video: ${asset.filename}`);
      const result = await SpatialMedia.splitSpatialVideo(uri);
      console.log(`[Spatial3D] import finished: ${asset.filename} (${Date.now() - startedAt}ms)`);
      return {
        reason: '',
        pair: {
          id: `spatial_${asset.id}`,
          title: asset.filename,
          leftUri: result.leftUri,
          rightUri: result.rightUri,
          originalUri: result.originalUri,
          spatialEncoding: 'mv-hevc',
          mediaType: 'video',
          sourceType: 'imported_spatial',
          createdAt: asset.creationTime || Date.now(),
          alignment: { ...DEFAULT_ALIGNMENT },
          aspectRatio:
            result.width && result.height
              ? result.width / result.height
              : undefined,
          durationMs: result.duration ? result.duration * 1000 : undefined,
          isSpatialVideo: true,
        },
      };
    }

    // A still that is roughly twice as wide as it is tall is almost certainly
    // a side-by-side pair, so take it rather than rejecting it.
    if (
      inspection.kind === 'image' &&
      asset.width >= asset.height * 1.7
    ) {
      const split = await splitSideBySideImage(uri, asset.width, asset.height);
      return {
        reason: '',
        pair: {
          id: `sbs_${asset.id}`,
          title: asset.filename,
          leftUri: split.leftEyeUri,
          rightUri: split.rightEyeUri,
          originalUri: uri,
          spatialEncoding: 'sbs',
          mediaType: 'photo',
          sourceType: 'imported_sbs',
          createdAt: asset.creationTime || Date.now(),
          alignment: { ...DEFAULT_ALIGNMENT },
          aspectRatio: split.width / split.height,
        },
      };
    }

    return {
      reason: `${asset.filename}: ${
        inspection.unsupportedPlatform
          ? t('import_platform_unsupported')
          : inspection.transcoded
          ? t('import_transcoded_title')
          : t('import_not_spatial_title')
      }`,
    };
  } catch (error) {
    console.error(`[Spatial3D] import failed: ${asset.filename}`, error);
    return {
      reason: `${asset.filename}: ${
        error instanceof Error ? error.message : t('error')
      }`,
    };
  }
}
