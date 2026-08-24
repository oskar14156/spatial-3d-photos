import type { MotionEvent } from '../../modules/spatial-capture';

export type GuidanceStatus =
  | 'waiting'
  | 'moving'
  | 'ready'
  | 'overshoot'
  | 'unlevel'
  | 'drifted'
  /** World tracking lost confidence; the displacement cannot be trusted. */
  | 'unreliable';

export type Guidance = {
  status: GuidanceStatus;
  /** Signed sideways displacement from the first shot, in metres. */
  lateral: number;
  /** Metres still to travel; negative once past the target. */
  remaining: number;
  /** 0 … 1 progress toward the target, clamped. */
  progress: number;
  /** Direction the photographer should move. */
  direction: 'left' | 'right';
  /** True when the shot can be taken. */
  canShoot: boolean;
};

/**
 * Roll beyond this many degrees noticeably tilts the stereo window. Handheld
 * shooting cannot realistically hold better than a couple of degrees, and the
 * residual tilt is correctable afterwards in the alignment panel.
 */
export const LEVEL_TOLERANCE_DEGREES = 2.5;

/**
 * Vertical drift the eyes can still fuse. Beyond roughly this fraction of the
 * baseline, the pair reads as misaligned rather than deep.
 */
const VERTICAL_DRIFT_RATIO = 0.35;
const MIN_VERTICAL_TOLERANCE = 0.015;

/**
 * Positional tolerance: 12% of the baseline, never tighter than 8 mm.
 *
 * The floor matters — ARKit's own positional noise is a few millimetres, so a
 * tighter window is a target the photographer can never reliably land in.
 */
export function baselineTolerance(baselineMeters: number): number {
  return Math.max(0.008, baselineMeters * 0.12);
}

/**
 * Turns a raw ARKit pose delta into the single instruction the photographer
 * needs: which way to go, how much further, and whether the shot is good.
 *
 * `targetBaseline` is always travelled to the right, matching the convention
 * that shot one is the left eye.
 */
export function evaluateGuidance(
  motion: MotionEvent,
  targetBaseline: number,
  levelToleranceDegrees = LEVEL_TOLERANCE_DEGREES
): Guidance {
  const lateral = motion.lateral;
  const remaining = targetBaseline - lateral;
  const tolerance = baselineTolerance(targetBaseline);
  const progress = targetBaseline > 0
    ? Math.min(1, Math.max(0, lateral / targetBaseline))
    : 0;

  const base = {
    lateral,
    remaining,
    progress,
    direction: (remaining >= 0 ? 'right' : 'left') as 'left' | 'right',
  };

  if (!motion.hasAnchor) {
    return { ...base, status: 'waiting', canShoot: false };
  }

  // Relocalising or feature-starved tracking makes the displacement figure
  // meaningless; say so rather than quietly reporting a wrong number.
  if (
    motion.tracking === 'insufficientFeatures' ||
    motion.tracking === 'relocalizing' ||
    motion.tracking === 'unavailable' ||
    motion.tracking === 'failed'
  ) {
    return { ...base, status: 'unreliable', canShoot: false };
  }

  const withinDistance = Math.abs(remaining) <= tolerance;

  if (!withinDistance) {
    return {
      ...base,
      status: remaining > 0 ? 'moving' : 'overshoot',
      canShoot: false,
    };
  }

  // Only nag about levelling and drift once the photographer is on the mark;
  // complaining the whole way across is noise.
  if (Math.abs(motion.rollDegrees) > levelToleranceDegrees) {
    return { ...base, status: 'unlevel', canShoot: false };
  }

  const verticalTolerance = Math.max(
    MIN_VERTICAL_TOLERANCE,
    targetBaseline * VERTICAL_DRIFT_RATIO
  );
  if (Math.abs(motion.vertical) > verticalTolerance) {
    return { ...base, status: 'drifted', canShoot: false };
  }

  return { ...base, status: 'ready', canShoot: true };
}
