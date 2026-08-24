import { requireNativeModule } from 'expo-modules-core';

type SplitResult = {
  leftUri: string;
  rightUri: string;
  originalUri: string;
  width?: number;
  height?: number;
  duration?: number;
};

type InspectionResult = {
  kind: 'spatial-photo' | 'spatial-video' | 'image' | 'video' | 'unknown';
  spatial: boolean;
  /**
   * True when the file looks like a re-encode rather than an original — a
   * JPEG where a spatial photo would be HEIC, or an H.264 track where a
   * spatial capture would be HEVC. Distinguishes "this is not spatial media"
   * from "we were handed a copy that no longer carries the spatial data".
   */
  transcoded: boolean;
  /**
   * True when the file *is* Apple spatial media but this platform has no API
   * to open it. Android has neither a reader for HEIC stereo image groups nor
   * an MV-HEVC decoder that exposes the second layer, so those files are
   * recognisable but not importable there.
   */
  unsupportedPlatform?: boolean;
};

type NativeSpatialMedia = {
  /**
   * Copies a photo-library item's original into temporary storage and returns
   * a readable `file://` URI.
   *
   * Takes the platform's own asset identifier — a PHAsset local identifier on
   * iOS, a MediaStore content URI on Android — which is what
   * `MediaLibrary.Asset.id` and `.uri` already hold.
   */
  exportOriginal(identifier: string): Promise<string>;
  /** Removes a copy made by `exportOriginal`. */
  discardTemporary(uri: string): Promise<void>;
  inspect(uri: string): Promise<InspectionResult>;
  splitSpatialPhoto(uri: string): Promise<SplitResult>;
  splitSpatialVideo(uri: string): Promise<SplitResult>;
  exportStereoPhoto(
    leftUri: string,
    rightUri: string,
    format: string
  ): Promise<string>;
};

export default requireNativeModule<NativeSpatialMedia>('SpatialMedia');
