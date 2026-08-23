import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { StereoPair } from '../types';
import { DEFAULT_ALIGNMENT } from '../constants';

export interface SplitStereoResult {
  leftEyeUri: string;
  rightEyeUri: string;
  /** Dimensions of a single eye, not of the source frame. */
  width: number;
  height: number;
}

/**
 * Cuts a packed side-by-side frame into two eye images.
 *
 * The source is opened once and cropped twice from the same in-memory image;
 * decoding a large JPEG twice was measurably slower and doubled peak memory.
 */
export async function splitSideBySideImage(
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<SplitStereoResult> {
  const halfWidth = Math.floor(imageWidth / 2);
  if (halfWidth < 1 || imageHeight < 1) {
    throw new Error('The image dimensions could not be read.');
  }

  const source = ImageManipulator.manipulate(imageUri);

  const left = await source
    .crop({ originX: 0, originY: 0, width: halfWidth, height: imageHeight })
    .renderAsync();
  const leftSaved = await left.saveAsync({
    compress: 0.95,
    format: SaveFormat.JPEG,
  });
  left.release();

  const right = await ImageManipulator.manipulate(imageUri)
    .crop({
      originX: halfWidth,
      originY: 0,
      width: halfWidth,
      height: imageHeight,
    })
    .renderAsync();
  const rightSaved = await right.saveAsync({
    compress: 0.95,
    format: SaveFormat.JPEG,
  });
  right.release();

  return {
    leftEyeUri: leftSaved.uri,
    rightEyeUri: rightSaved.uri,
    width: halfWidth,
    height: imageHeight,
  };
}

export function createStereoPairFromUris(
  leftUri: string,
  rightUri: string,
  title: string,
  sourceType: StereoPair['sourceType'],
  mediaType: StereoPair['mediaType'] = 'photo'
): StereoPair {
  return {
    id: `stereo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    title,
    leftUri,
    rightUri,
    mediaType,
    sourceType,
    createdAt: Date.now(),
    alignment: { ...DEFAULT_ALIGNMENT },
  };
}
