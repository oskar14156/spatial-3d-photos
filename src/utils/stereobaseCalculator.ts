import { SubjectPreset } from '../types';

export const STEREO_BASE_FACTOR = 30;

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: 'macro',
    nameKey: 'preset_macro_name',
    icon: 'flower',
    defaultSubjectDistanceMeters: 0.25,
    minDistanceMeters: 0.05,
    maxDistanceMeters: 0.5,
    recommendedBaselineMeters: 0.008,
    explanationKey: 'preset_macro_desc',
    exampleObjectKey: 'preset_macro_example',
  },
  {
    id: 'portrait',
    nameKey: 'preset_portrait_name',
    icon: 'person',
    defaultSubjectDistanceMeters: 2,
    minDistanceMeters: 0.8,
    maxDistanceMeters: 4,
    recommendedBaselineMeters: 0.065,
    explanationKey: 'preset_portrait_desc',
    exampleObjectKey: 'preset_portrait_example',
  },
  {
    id: 'room',
    nameKey: 'preset_room_name',
    icon: 'house',
    defaultSubjectDistanceMeters: 4.5,
    minDistanceMeters: 3,
    maxDistanceMeters: 10,
    recommendedBaselineMeters: 0.12,
    explanationKey: 'preset_room_desc',
    exampleObjectKey: 'preset_room_example',
  },
  {
    id: 'architecture',
    nameKey: 'preset_architecture_name',
    icon: 'building',
    defaultSubjectDistanceMeters: 25,
    minDistanceMeters: 10,
    maxDistanceMeters: 80,
    recommendedBaselineMeters: 0.65,
    explanationKey: 'preset_architecture_desc',
    exampleObjectKey: 'preset_architecture_example',
  },
  {
    id: 'mountain',
    nameKey: 'preset_mountain_name',
    icon: 'mountain.2',
    defaultSubjectDistanceMeters: 1500,
    minDistanceMeters: 250,
    maxDistanceMeters: 5000,
    recommendedBaselineMeters: 30,
    explanationKey: 'preset_mountain_desc',
    exampleObjectKey: 'preset_mountain_example',
  },
];

export type StereoBaselineRecommendation = {
  baselineMeters: number;
  rawRuleMeters: number;
  comfort: 'macro' | 'natural' | 'extended' | 'hyper';
  warning?: string;
};

/**
 * Conservative recommendation. The classic 1/30 rule is only a starting point.
 * Near subjects are clamped to avoid excessive disparity; distant scenes can
 * deliberately use hyperstereo.
 */
export function recommendStereoBaseline(
  subjectDistanceMeters: number
): StereoBaselineRecommendation {
  const d = Math.max(0.05, subjectDistanceMeters);
  const raw = d / STEREO_BASE_FACTOR;

  if (d < 0.6) {
    const baseline = Math.min(Math.max(raw, 0.003), 0.015);
    return { baselineMeters: baseline, rawRuleMeters: raw, comfort: 'macro' };
  }

  if (d < 4) {
    const baseline = Math.min(Math.max(raw, 0.045), 0.075);
    return { baselineMeters: baseline, rawRuleMeters: raw, comfort: 'natural' };
  }

  if (d < 80) {
    const baseline = Math.min(raw, 1.2);
    return {
      baselineMeters: baseline,
      rawRuleMeters: raw,
      comfort: 'extended',
      warning:
        baseline > 0.4
          ? 'Keep the camera height, roll and aim point identical between shots.'
          : undefined,
    };
  }

  return {
    baselineMeters: Math.min(raw, 50),
    rawRuleMeters: raw,
    comfort: 'hyper',
    warning:
      'Hyperstereo exaggerates depth. Avoid close foreground objects and keep both camera positions on the same level.',
  };
}

export function calculateStereoBaseline(
  subjectDistanceMeters: number,
  divisor: number = STEREO_BASE_FACTOR
): number {
  if (divisor !== STEREO_BASE_FACTOR) {
    return Math.max(0.003, subjectDistanceMeters / Math.max(1, divisor));
  }
  return recommendStereoBaseline(subjectDistanceMeters).baselineMeters;
}

export function formatMetricDistance(meters: number): string {
  if (meters < 0.01) return `${Math.round(meters * 1000)} mm`;
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  if (meters < 1000) return `${meters >= 10 ? meters.toFixed(0) : meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatBaselineInstruction(
  baselineMeters: number,
  language: 'de' | 'en' = 'de'
): { formatted: string; hint: string; stepsEstimate?: string } {
  const formatted = formatMetricDistance(baselineMeters);
  const steps = Math.max(1, Math.round(baselineMeters / 0.75));

  if (language === 'de') {
    if (baselineMeters <= 0.02) return { formatted, hint: 'Nur die Kamera seitlich verschieben.' };
    if (baselineMeters <= 0.08) return { formatted, hint: 'Etwa natürlicher Augenabstand.' };
    if (baselineMeters <= 0.35) return { formatted, hint: 'Kleine seitliche Körperverlagerung.' };
    if (baselineMeters <= 2) return { formatted, hint: `Ca. ${steps} ${steps === 1 ? 'Schritt' : 'Schritte'} seitlich.`, stepsEstimate: `${steps}` };
    return { formatted, hint: `Hyperstereo · ca. ${steps} Schritte seitlich.`, stepsEstimate: `${steps}` };
  }

  if (baselineMeters <= 0.02) return { formatted, hint: 'Shift only the camera sideways.' };
  if (baselineMeters <= 0.08) return { formatted, hint: 'About natural eye separation.' };
  if (baselineMeters <= 0.35) return { formatted, hint: 'Small sideways body shift.' };
  if (baselineMeters <= 2) return { formatted, hint: `About ${steps} ${steps === 1 ? 'step' : 'steps'} sideways.`, stepsEstimate: `${steps}` };
  return { formatted, hint: `Hyperstereo · about ${steps} steps sideways.`, stepsEstimate: `${steps}` };
}
