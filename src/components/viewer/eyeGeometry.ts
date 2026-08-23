import type { StereoAlignment, StereoPair } from '../../types';

export type EyeTransform = (
  | { translateX: number }
  | { translateY: number }
  | { rotate: string }
  | { scale: number }
)[];

/**
 * Resolves which file feeds which eye. `invertEyes` exists because plenty of
 * imported side-by-side material is authored right-eye-first.
 */
export function resolveEyes(pair: StereoPair): { left: string; right: string } {
  return pair.alignment.invertEyes
    ? { left: pair.rightUri, right: pair.leftUri }
    : { left: pair.leftUri, right: pair.rightUri };
}

/**
 * Alignment corrections are applied as equal and opposite halves so the
 * midpoint between the eyes — the zero-parallax plane — stays put.
 *
 * `extraTranslateX` carries per-view nudges (headset IPD, parallax tilt) that
 * should not be baked into the saved alignment.
 */
export function eyeTransforms(
  alignment: StereoAlignment,
  extraTranslateX = 0
): { left: EyeTransform; right: EyeTransform } {
  const { horizontalDisparity, verticalOffset, rotationAngle, zoomScale } =
    alignment;

  return {
    left: [
      { translateX: -horizontalDisparity / 2 + extraTranslateX },
      { translateY: -verticalOffset / 2 },
      { rotate: `${-rotationAngle / 2}deg` },
      { scale: zoomScale },
    ],
    right: [
      { translateX: horizontalDisparity / 2 - extraTranslateX },
      { translateY: verticalOffset / 2 },
      { rotate: `${rotationAngle / 2}deg` },
      { scale: zoomScale },
    ],
  };
}
