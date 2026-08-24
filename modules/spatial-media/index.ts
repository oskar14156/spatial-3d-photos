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
};

type NativeSpatialMedia = {
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
