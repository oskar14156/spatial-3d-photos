import * as React from 'react';
import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';

export type DepthConfidence = 'low' | 'medium' | 'high';

export type TrackingState =
  | 'normal'
  | 'initializing'
  | 'relocalizing'
  | 'excessiveMotion'
  | 'insufficientFeatures'
  | 'limited'
  | 'unavailable'
  | 'failed';

export type DistanceEvent = {
  /** Median LiDAR depth at the centre reticle, in metres. */
  meters: number;
  confidence: DepthConfidence;
};

export type AvailabilityEvent = {
  worldTracking: boolean;
  lidar: boolean;
};

export type MotionEvent = {
  hasAnchor: boolean;
  /** Sideways displacement from the anchor, in metres. Positive is right. */
  lateral: number;
  /** Vertical displacement from the anchor, in metres. Positive is up. */
  vertical: number;
  /** Displacement toward the subject, in metres. */
  forward: number;
  /** Device roll, in degrees. Zero is level. */
  rollDegrees: number;
};

export type TrackingStateEvent = {
  state: TrackingState;
  message?: string;
};

export type SpatialCaptureViewProps = ViewProps & {
  active?: boolean;
  onDistanceChange?: (event: { nativeEvent: DistanceEvent }) => void;
  onAvailabilityChange?: (event: { nativeEvent: AvailabilityEvent }) => void;
  onMotionChange?: (event: { nativeEvent: MotionEvent }) => void;
  onTrackingStateChange?: (event: { nativeEvent: TrackingStateEvent }) => void;
};

export type SpatialCaptureViewRef = {
  /** Zeroes the displacement origin at the current pose. */
  setAnchor: () => Promise<boolean>;
  clearAnchor: () => Promise<void>;
  /** Resolves with a `file://` URI for a full-resolution JPEG. */
  capturePhoto: () => Promise<string>;
};

// Expo generates the view's async functions onto the native ref, so the ref
// type is declared here rather than inferred from the props.
const NativeView = requireNativeView<
  SpatialCaptureViewProps & React.RefAttributes<SpatialCaptureViewRef>
>('SpatialCapture');

export const SpatialCaptureView = React.forwardRef<
  SpatialCaptureViewRef,
  SpatialCaptureViewProps
>(function SpatialCaptureView(props, ref) {
  return <NativeView {...props} ref={ref} />;
});

export default SpatialCaptureView;
