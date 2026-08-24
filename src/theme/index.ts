import { useColorScheme } from 'react-native';
import { useMemo } from 'react';

/**
 * Single source of truth for the visual language.
 *
 * Both palettes carry the same keys, so components read semantic roles
 * (`label`, `fill`, `separator`) and never a literal colour. Values follow
 * Apple's system semantics for each appearance.
 */
export type Palette = {
  canvas: string;
  fill: string;
  fillElevated: string;
  fillSubtle: string;
  fillSubtler: string;

  label: string;
  labelSecondary: string;
  labelTertiary: string;
  labelQuaternary: string;
  /** Text drawn on top of an accent fill. */
  onAccent: string;
  /** Fill that inverts against the canvas — selected chips, play buttons. */
  inverted: string;
  onInverted: string;

  separator: string;
  separatorStrong: string;

  blue: string;
  green: string;
  red: string;
  orange: string;
  yellow: string;
  cyan: string;
  purple: string;
};

export const darkPalette: Palette = {
  canvas: '#000000',
  fill: 'rgb(28,28,30)',
  fillElevated: 'rgb(44,44,46)',
  fillSubtle: 'rgba(118,118,128,0.24)',
  fillSubtler: 'rgba(118,118,128,0.14)',

  label: '#FFFFFF',
  labelSecondary: 'rgba(235,235,245,0.60)',
  labelTertiary: 'rgba(235,235,245,0.40)',
  labelQuaternary: 'rgba(235,235,245,0.24)',
  onAccent: '#FFFFFF',
  inverted: '#FFFFFF',
  onInverted: '#000000',

  separator: 'rgba(255,255,255,0.10)',
  separatorStrong: 'rgba(255,255,255,0.18)',

  blue: '#0A84FF',
  green: '#30D158',
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  cyan: '#64D2FF',
  purple: '#BF5AF2',
};

export const lightPalette: Palette = {
  // Grouped-background grey, so white cards read as raised against it.
  canvas: 'rgb(242,242,247)',
  fill: '#FFFFFF',
  fillElevated: 'rgb(229,229,234)',
  fillSubtle: 'rgba(118,118,128,0.12)',
  fillSubtler: 'rgba(118,118,128,0.08)',

  label: '#000000',
  labelSecondary: 'rgba(60,60,67,0.60)',
  labelTertiary: 'rgba(60,60,67,0.42)',
  labelQuaternary: 'rgba(60,60,67,0.22)',
  onAccent: '#FFFFFF',
  inverted: '#1C1C1E',
  onInverted: '#FFFFFF',

  separator: 'rgba(60,60,67,0.14)',
  separatorStrong: 'rgba(60,60,67,0.29)',

  blue: '#007AFF',
  green: '#248A3D',
  red: '#D70015',
  orange: '#C93400',
  yellow: '#B25000',
  cyan: '#0071A4',
  purple: '#8944AB',
};

/**
 * Media surfaces stay dark in both appearances.
 *
 * A stereo pair has to be judged against neutral black — a light surround
 * washes out the depth cue and makes the anaglyph unreadable — and the camera
 * is full-bleed video. This is a deliberate exception, not an oversight.
 */
export const mediaPalette = darkPalette;

/** Mirrors the iOS text styles we use, with the display sizes optically tightened. */
export const type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -1.1 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.55 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.45 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.4 },
  body: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.3 },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500', letterSpacing: -0.24 },
  subheadline: { fontSize: 14, lineHeight: 19, fontWeight: '500', letterSpacing: -0.16 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  /** All-caps section eyebrow. */
  eyebrow: { fontSize: 11, lineHeight: 13, fontWeight: '700', letterSpacing: 0.7 },
} as const;

export const radius = {
  chip: 999,
  control: 14,
  card: 18,
  group: 16,
  panel: 26,
  viewer: 28,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  xxl: 30,
} as const;

/** Standard iOS minimum hit target. */
export const HIT_TARGET = 44;

/** Spring used for every interactive transition, so motion feels like one app. */
export const spring = {
  damping: 22,
  stiffness: 260,
  mass: 0.7,
} as const;

export type Scheme = 'light' | 'dark';

export function useTheme(): { palette: Palette; scheme: Scheme } {
  // `useColorScheme` returns null before the appearance is known; light is the
  // safer assumption because it matches the system default.
  const scheme: Scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return useMemo(
    () => ({ palette: scheme === 'dark' ? darkPalette : lightPalette, scheme }),
    [scheme]
  );
}

/**
 * Builds a stylesheet from the active palette, memoised per appearance so a
 * theme switch is the only thing that rebuilds it.
 */
export function useThemedStyles<T>(factory: (palette: Palette) => T): T {
  const { palette } = useTheme();
  return useMemo(() => factory(palette), [factory, palette]);
}
