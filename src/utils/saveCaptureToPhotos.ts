import * as MediaLibrary from 'expo-media-library';
import SpatialMedia from '../../modules/spatial-media';
import type { StereoPair } from '../types';
import { log } from './log';

export type PhotosSaveResult = 'saved' | 'denied' | 'failed';

/**
 * Puts a fresh capture into the user's photo library.
 *
 * The app's own library is a working copy; Photos is where people expect a
 * picture they just took to end up, and with iCloud Photos it is also the only
 * copy that survives losing the phone. Saved as a full-resolution side-by-side
 * JPEG: it keeps both eyes intact and is the layout the app's importer reads
 * back as a pair.
 *
 * Asks for add-only access, the smaller prompt — saving never reads the
 * library.
 */
export async function saveCaptureToPhotos(
  pair: StereoPair
): Promise<PhotosSaveResult> {
  try {
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return 'denied';

    const output = await SpatialMedia.exportStereoPhoto(
      pair.leftUri,
      pair.rightUri,
      'sbs_full'
    );
    await MediaLibrary.saveToLibraryAsync(output);
    return 'saved';
  } catch (error) {
    log.warn('Could not save a capture to Photos', error);
    return 'failed';
  }
}
