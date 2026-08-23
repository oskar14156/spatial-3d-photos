import { SubjectPreset } from '../types';

export const STEREO_BASE_FACTOR = 30; // 1/30 rule (standard rule in 3D stereophotography)

export const SUBJECT_PRESETS: SubjectPreset[] = [
  {
    id: 'macro',
    nameKey: 'preset_macro_name',
    icon: 'flower',
    defaultSubjectDistanceMeters: 0.25, // 25 cm
    minDistanceMeters: 0.05,
    maxDistanceMeters: 0.5,
    recommendedBaselineMeters: 0.008, // 8 mm (approx 0.8 cm)
    explanationKey: 'preset_macro_desc',
    exampleObjectKey: 'preset_macro_example',
  },
  {
    id: 'portrait',
    nameKey: 'preset_portrait_name',
    icon: 'user',
    defaultSubjectDistanceMeters: 2.0, // 2 meters
    minDistanceMeters: 1.0,
    maxDistanceMeters: 3.5,
    recommendedBaselineMeters: 0.065, // ~6.5 cm (natural human eye distance / IPD)
    explanationKey: 'preset_portrait_desc',
    exampleObjectKey: 'preset_portrait_example',
  },
  {
    id: 'room',
    nameKey: 'preset_room_name',
    icon: 'home',
    defaultSubjectDistanceMeters: 4.5, // 4.5 meters
    minDistanceMeters: 3.0,
    maxDistanceMeters: 10.0,
    recommendedBaselineMeters: 0.15, // 15 cm
    explanationKey: 'preset_room_desc',
    exampleObjectKey: 'preset_room_example',
  },
  {
    id: 'architecture',
    nameKey: 'preset_architecture_name',
    icon: 'building',
    defaultSubjectDistanceMeters: 25.0, // 25 meters
    minDistanceMeters: 12.0,
    maxDistanceMeters: 60.0,
    recommendedBaselineMeters: 0.85, // 85 cm (~1 big step sideways)
    explanationKey: 'preset_architecture_desc',
    exampleObjectKey: 'preset_architecture_example',
  },
  {
    id: 'mountain',
    nameKey: 'preset_mountain_name',
    icon: 'mountain',
    defaultSubjectDistanceMeters: 1500.0, // 1.5 km
    minDistanceMeters: 300.0,
    maxDistanceMeters: 5000.0,
    recommendedBaselineMeters: 50.0, // 50 meters (Hyperstereo!)
    explanationKey: 'preset_mountain_desc',
    exampleObjectKey: 'preset_mountain_example',
  },
];

/**
 * Calculates the recommended stereobase (horizontal displacement distance)
 * based on the distance to the subject using the 1/30 rule.
 */
export function calculateStereoBaseline(
  subjectDistanceMeters: number,
  divisor: number = STEREO_BASE_FACTOR
): number {
  if (subjectDistanceMeters <= 0) return 0.065;
  return subjectDistanceMeters / divisor;
}

/**
 * Formats a metric distance into clean human-friendly units (mm, cm, m, km)
 */
export function formatMetricDistance(meters: number): string {
  if (meters < 0.01) {
    return `${(meters * 1000).toFixed(0)} mm`;
  }
  if (meters < 1.0) {
    return `${(meters * 100).toFixed(1)} cm`;
  }
  if (meters < 1000.0) {
    return `${meters >= 10 ? meters.toFixed(0) : meters.toFixed(1)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Formats a baseline displacement distance into human instructions
 */
export function formatBaselineInstruction(
  baselineMeters: number,
  language: 'de' | 'en' = 'de'
): { formatted: string; hint: string; stepsEstimate?: string } {
  const formatted = formatMetricDistance(baselineMeters);
  
  if (language === 'de') {
    if (baselineMeters <= 0.02) {
      return {
        formatted,
        hint: 'Sehr geringer Versatz (z.B. Fingernagel-Breite)',
      };
    }
    if (baselineMeters <= 0.08) {
      return {
        formatted,
        hint: 'Natürlicher Augenabstand (~6.5 cm)',
      };
    }
    if (baselineMeters <= 0.3) {
      return {
        formatted,
        hint: 'Kleine Hand- oder Körpergewichtsverlagerung',
      };
    }
    if (baselineMeters <= 2.0) {
      const steps = Math.round(baselineMeters / 0.75);
      return {
        formatted,
        hint: `Ca. ${steps === 1 ? '1 Schritt' : `${steps} Schritte`} nach links`,
        stepsEstimate: `${steps} Schritte`,
      };
    }
    const steps = Math.round(baselineMeters / 0.75);
    return {
      formatted,
      hint: `Hyperstereo: Ca. ${steps} Schritte (${formatted}) nach links gehen`,
      stepsEstimate: `${steps} Schritte`,
    };
  } else {
    if (baselineMeters <= 0.02) {
      return {
        formatted,
        hint: 'Tiny shift (e.g. finger width)',
      };
    }
    if (baselineMeters <= 0.08) {
      return {
        formatted,
        hint: 'Natural human eye distance (~6.5 cm)',
      };
    }
    if (baselineMeters <= 0.3) {
      return {
        formatted,
        hint: 'Small weight shift or hand reach',
      };
    }
    if (baselineMeters <= 2.0) {
      const steps = Math.round(baselineMeters / 0.75);
      return {
        formatted,
        hint: `Approx. ${steps === 1 ? '1 step' : `${steps} steps`} to the left`,
        stepsEstimate: `${steps} steps`,
      };
    }
    const steps = Math.round(baselineMeters / 0.75);
    return {
      formatted,
      hint: `Hyperstereo: Walk approx. ${steps} steps (${formatted}) to the left`,
      stepsEstimate: `${steps} steps`,
    };
  }
}
