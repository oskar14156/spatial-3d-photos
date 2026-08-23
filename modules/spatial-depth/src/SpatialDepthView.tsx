import React from 'react';
import { requireNativeViewManager } from 'expo-modules-core';
import type { ViewProps } from 'react-native';

export type SpatialDepthEvent = {
  meters: number;
  confidence: 'low' | 'medium' | 'high';
};

export type SpatialDepthAvailabilityEvent = {
  available: boolean;
};

type Props = ViewProps & {
  active?: boolean;
  onDistanceChange?: (event: { nativeEvent: SpatialDepthEvent }) => void;
  onAvailabilityChange?: (
    event: { nativeEvent: SpatialDepthAvailabilityEvent }
  ) => void;
};

const NativeView =
  requireNativeViewManager<Props>('SpatialDepth');

export default function SpatialDepthView(props: Props) {
  return <NativeView {...props} />;
}
