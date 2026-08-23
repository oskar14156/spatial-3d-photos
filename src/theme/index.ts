/**
 * Single source of truth for the visual language.
 *
 * The palette follows Apple's dark system semantics: a true-black canvas,
 * elevated fills built from white alpha, and label colours at the four
 * standard emphasis levels. Anything that needs a translucent surface goes
 * through `NativeGlass` rather than hard-coding a blur here.
 */

export const palette = {
  /** True black — matches the OLED canvas and the launch screen. */
  canvas: '#000000',
  /** Grouped-content background, the iOS `secondarySystemBackground` analogue. */
  fill: 'rgb(28,28,30)',
  fillElevated: 'rgb(44,44,46)',
  /** Subtle fills for chips and unselected controls. */
  fillSubtle: 'rgba(118,118,128,0.24)',
  fillSubtler: 'rgba(118,118,128,0.14)',

  label: '#FFFFFF',
  labelSecondary: 'rgba(235,235,245,0.60)',
  labelTertiary: 'rgba(235,235,245,0.40)',
  labelQuaternary: 'rgba(235,235,245,0.24)',

  separator: 'rgba(255,255,255,0.10)',
  separatorStrong: 'rgba(255,255,255,0.18)',

  // Apple system accents (dark variants)
  blue: '#0A84FF',
  green: '#30D158',
  red: '#FF453A',
  orange: '#FF9F0A',
  yellow: '#FFD60A',
  cyan: '#64D2FF',
  purple: '#BF5AF2',
} as const;

/**
 * Type ramp mirroring the iOS text styles we actually use. Letter spacing is
 * tightened on the display sizes the way SF Pro Display does optically.
 */
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
