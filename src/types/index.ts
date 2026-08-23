export type ViewMode = 'sbs' | 'cross_eye' | 'anaglyph' | 'wigglegram' | 'parallax_tilt';

export type AnaglyphColorMode = 'red_cyan_pure' | 'dubois' | 'color' | 'half_color';

export type StereoSourceType =
  | 'imported_spatial'
  | 'imported_sbs'
  | 'imported_dual'
  | 'camera_chacha'
  | 'demo';

export type MediaType = 'photo' | 'video';
export type SpatialEncoding = 'spatial-heic' | 'mv-hevc' | 'sbs' | 'dual';

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

  /** Original Apple spatial media. Used to retain audio/metadata when needed. */
  originalUri?: string;
  spatialEncoding?: SpatialEncoding;
}

export interface StereoAlignment {
  horizontalDisparity: number;
  verticalOffset: number;
  rotationAngle: number;
  zoomScale: number;
  invertEyes: boolean;
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

export type ExportFormat =
  | 'sbs_full'
  | 'sbs_half'
  | 'anaglyph_red_cyan'
  | 'cross_eye'
  | 'wigglegram_gif'
  | 'left_eye_only'
  | 'right_eye_only';

export type LanguageCode = 'de' | 'en';
