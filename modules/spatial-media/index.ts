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
