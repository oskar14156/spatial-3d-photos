export type ViewMode = 'sbs' | 'cross_eye' | 'anaglyph' | 'wigglegram' | 'parallax_tilt';

/**
 * Red/cyan encodings we can render identically on-device and on export.
 * `color` keeps full chroma, `half_color` desaturates the left eye to cut
 * retinal rivalry, `mono` renders a greyscale anaglyph with the least ghosting.
 */
export type AnaglyphColorMode = 'color' | 'half_color' | 'mono';

export type StereoSourceType =
  | 'imported_spatial'
  | 'imported_sbs'
  | 'imported_dual'
  | 'camera_chacha'
  | 'built_in';

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
  | 'anaglyph_color'
  | 'anaglyph_half_color'
  | 'anaglyph_mono'
  | 'cross_eye'
  | 'wigglegram_gif'
  | 'left_eye_only'
  | 'right_eye_only';

/** Everything the viewer needs that is not persisted with the pair itself. */
export interface ViewerOptions {
  anaglyphMode: AnaglyphColorMode;
  wiggleFps: number;
  wigglePlaying: boolean;
  vrMode: boolean;
  /** Per-eye horizontal nudge in points, used to match headset lens spacing. */
  ipdOffset: number;
}

export type LanguageCode = 'de' | 'en';
