import * as ImageManipulator from 'expo-image-manipulator';
import { StereoPair } from '../types';
import { DEFAULT_ALIGNMENT } from '../constants';

export interface SplittedStereoResult {
  leftEyeUri: string;
  rightEyeUri: string;
  width: number;
  height: number;
}

/**
 * Splits a Side-by-Side (SBS) stereoscopic image into separate Left and Right eye image files.
 */
export async function splitSideBySideImage(
  imageUri: string,
  imageWidth?: number,
  imageHeight?: number
): Promise<SplittedStereoResult> {
  const width = imageWidth || 1920;
  const height = imageHeight || 1080;
  const halfWidth = Math.floor(width / 2);

  // Left Eye crop
  const leftEyeResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      {
        crop: {
          originX: 0,
          originY: 0,
          width: halfWidth,
          height: height,
        },
      },
    ],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
  );

  // Right Eye crop
  const rightEyeResult = await ImageManipulator.manipulateAsync(
    imageUri,
    [
      {
        crop: {
          originX: halfWidth,
          originY: 0,
          width: halfWidth,
          height: height,
        },
      },
    ],
    { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
  );

  return {
    leftEyeUri: leftEyeResult.uri,
    rightEyeUri: rightEyeResult.uri,
    width: halfWidth,
    height: height,
  };
}

/**
 * Creates a StereoPair object from individual left/right URIs.
 */
export function createStereoPairFromUris(
  leftUri: string,
  rightUri: string,
  title: string = 'Imported Stereo 3D',
  sourceType: StereoPair['sourceType'] = 'imported_spatial',
  mediaType: 'photo' | 'video' = 'photo'
): StereoPair {
  return {
    id: `stereo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    title,
    leftUri,
    rightUri,
    mediaType,
    sourceType,
    createdAt: Date.now(),
    alignment: { ...DEFAULT_ALIGNMENT },
  };
}
