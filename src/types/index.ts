export type ViewMode = 'sbs' | 'cross_eye' | 'anaglyph' | 'wigglegram' | 'parallax_tilt';

export type AnaglyphColorMode = 'red_cyan_pure' | 'dubois' | 'color' | 'half_color';

export type StereoSourceType = 'imported_spatial' | 'imported_sbs' | 'imported_dual' | 'camera_chacha' | 'demo';

export type MediaType = 'photo' | 'video';

export interface StereoPair {
  id: string;
  title: string;
  leftUri: string;
  rightUri: string;
  mediaType: MediaType;
  sourceType: StereoSourceType;
  createdAt: number;
  description?: string;
  baselineDistanceMeters?: number;
  subjectDistanceMeters?: number;
  subjectCategory?: SubjectPresetId;
  alignment: StereoAlignment;
  aspectRatio?: number;
  durationMs?: number;
  isSpatialVideo?: boolean;
}

export interface StereoAlignment {
  horizontalDisparity: number; // Convergence / stereo depth window (-50 to +50 px)
  verticalOffset: number;       // Vertical alignment correction (-30 to +30 px)
  rotationAngle: number;        // Roll rotation (-5 to +5 deg)
  zoomScale: number;            // Scale adjustment (0.9 to 1.1)
  invertEyes: boolean;          // Swap Left & Right eyes
}

export type SubjectPresetId = 'macro' | 'portrait' | 'room' | 'architecture' | 'mountain';

export interface SubjectPreset {
  id: SubjectPresetId;
  nameKey: string;
  icon: string;
  defaultSubjectDistanceMeters: number;
  minDistanceMeters: number;
  maxDistanceMeters: number;
  recommendedBaselineMeters: number;
  explanationKey: string;
  exampleObjectKey: string;
}

export interface GyroLevelState {
  pitch: number;
  roll: number;
  isLevel: boolean;
}

export type ExportFormat = 'sbs_full' | 'sbs_half' | 'anaglyph_red_cyan' | 'cross_eye' | 'wigglegram_gif' | 'left_eye_only' | 'right_eye_only';

export type LanguageCode = 'de' | 'en';
