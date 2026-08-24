import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { SFSymbol, SymbolView, SymbolWeight } from 'expo-symbols';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type Props = {
  /** SF Symbol name; the Android drawing is looked up from it. */
  name: SFSymbol;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
};

/**
 * One icon call site, two renderers.
 *
 * iOS draws the real SF Symbol. Android draws an equivalent from the set
 * below, built out of plain SVG geometry on a 24×24 grid.
 *
 * This used to reach for an icon font, which cost iOS — the platform that
 * needs none of it — a native font-loader dependency. That dependency was not
 * autolinked, so it threw before the first render and the app came up black;
 * once linked, it dragged SwiftUI into the link and broke the build instead.
 * `react-native-svg` was already here, works on both platforms, and loads
 * nothing at startup.
 */
export function Icon({ name, size = 18, color, weight = 'regular', style }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={color}
        weight={weight}
        style={[{ width: size + 4, height: size + 4 }, style]}
      />
    );
  }

  const glyph = GLYPHS[name] ?? GLYPHS.fallback;
  const box = size + 4;

  return (
    <Svg width={box} height={box} viewBox="0 0 24 24" style={style}>
      {glyph(color, weight === 'regular' ? 1.9 : 2.3)}
    </Svg>
  );
}

type Glyph = (color: string, stroke: number) => React.ReactNode;

/** Shared stroke styling, so the whole set reads as one family. */
const line = (color: string, stroke: number) => ({
  stroke: color,
  strokeWidth: stroke,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

const GLYPHS: Record<string, Glyph> = {
  fallback: (c, w) => <Circle cx={12} cy={12} r={8} {...line(c, w)} />,

  checkmark: (c, w) => <Polyline points="4,13 9,18 20,6" {...line(c, w)} />,

  xmark: (c, w) => (
    <>
      <Line x1={5} y1={5} x2={19} y2={19} {...line(c, w)} />
      <Line x1={19} y1={5} x2={5} y2={19} {...line(c, w)} />
    </>
  ),

  plus: (c, w) => (
    <>
      <Line x1={12} y1={5} x2={12} y2={19} {...line(c, w)} />
      <Line x1={5} y1={12} x2={19} y2={12} {...line(c, w)} />
    </>
  ),

  'chevron.right': (c, w) => <Polyline points="9,4 17,12 9,20" {...line(c, w)} />,

  'camera.fill': (c) => (
    <>
      <Path
        d="M4 8h3.2l1.5-2.2h6.6L16.8 8H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"
        fill={c}
      />
      <Circle cx={12} cy={13.5} r={3.4} fill="#00000000" stroke="#000" strokeOpacity={0} />
      <Circle cx={12} cy={13.5} r={3.4} fill="none" stroke={c} strokeWidth={0} />
    </>
  ),

  'video.fill': (c) => (
    <>
      <Rect x={2.5} y={6} width={12.5} height={12} rx={2.2} fill={c} />
      <Path d="M16.5 11.2l4-2.6v6.8l-4-2.6z" fill={c} />
    </>
  ),

  video: (c, w) => (
    <>
      <Rect x={2.5} y={6} width={12.5} height={12} rx={2.2} {...line(c, w)} />
      <Path d="M16.5 11.2l4-2.6v6.8l-4-2.6z" {...line(c, w)} />
    </>
  ),

  'play.fill': (c) => <Path d="M7 4.8l12 7.2-12 7.2z" fill={c} />,

  'pause.fill': (c) => (
    <>
      <Rect x={6.5} y={5} width={3.6} height={14} rx={1.2} fill={c} />
      <Rect x={13.9} y={5} width={3.6} height={14} rx={1.2} fill={c} />
    </>
  ),

  'gobackward.5': (c, w) => (
    <>
      <Path d="M12 5a7 7 0 1 1-6.6 4.6" {...line(c, w)} />
      <Polyline points="4,4 5.2,9.4 10.6,8.4" {...line(c, w)} />
      <Path d="M13.4 10.6h-2.6l-.3 2.2a2 2 0 1 1-.5 2.6" {...line(c, w * 0.85)} />
    </>
  ),

  'goforward.5': (c, w) => (
    <>
      <Path d="M12 5a7 7 0 1 0 6.6 4.6" {...line(c, w)} />
      <Polyline points="20,4 18.8,9.4 13.4,8.4" {...line(c, w)} />
      <Path d="M13.4 10.6h-2.6l-.3 2.2a2 2 0 1 1-.5 2.6" {...line(c, w * 0.85)} />
    </>
  ),

  repeat: (c, w) => (
    <>
      <Polyline points="6,10 6,7 18,7 18,11" {...line(c, w)} />
      <Polyline points="15,4 18,7 15,10" {...line(c, w)} />
      <Polyline points="18,14 18,17 6,17 6,13" {...line(c, w)} />
      <Polyline points="9,20 6,17 9,14" {...line(c, w)} />
    </>
  ),

  'arrow.counterclockwise': (c, w) => (
    <>
      <Path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" {...line(c, w)} />
      <Polyline points="3.6,4.5 4.6,9 9.1,8" {...line(c, w)} />
    </>
  ),

  'arrow.up.forward.app': (c, w) => (
    <>
      <Rect x={3.5} y={3.5} width={17} height={17} rx={4} {...line(c, w)} />
      <Line x1={9} y1={15} x2={15} y2={9} {...line(c, w)} />
      <Polyline points="10,9 15,9 15,14" {...line(c, w)} />
    </>
  ),

  'arrow.up.and.down.circle.fill': (c, w) => (
    <>
      <Circle cx={12} cy={12} r={9} fill={c} />
      <Polyline points="9,10 12,7 15,10" {...line('#000', w)} strokeOpacity={0.001} />
      <Line x1={12} y1={7} x2={12} y2={17} stroke="#fff" strokeWidth={w} strokeLinecap="round" />
      <Polyline
        points="9,10 12,7 15,10"
        fill="none"
        stroke="#fff"
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9,14 12,17 15,14"
        fill="none"
        stroke="#fff"
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),

  'arrow.up.left.and.arrow.down.right': (c, w) => (
    <>
      <Polyline points="4,9.5 4,4 9.5,4" {...line(c, w)} />
      <Line x1={4} y1={4} x2={10.5} y2={10.5} {...line(c, w)} />
      <Polyline points="20,14.5 20,20 14.5,20" {...line(c, w)} />
      <Line x1={20} y1={20} x2={13.5} y2={13.5} {...line(c, w)} />
    </>
  ),

  'bolt.badge.automatic.fill': (c) => (
    <Path d="M13.6 2L5 13.4h5.2L9.4 22 19 10.2h-5.6z" fill={c} />
  ),

  'bolt.slash.fill': (c, w) => (
    <>
      <Path d="M13.6 2L5 13.4h5.2L9.4 22 19 10.2h-5.6z" fill={c} />
      <Line x1={4} y1={4} x2={20} y2={20} {...line(c, w)} />
    </>
  ),

  'exclamationmark.triangle.fill': (c) => (
    <>
      <Path d="M12 3.2l9.4 16.3H2.6z" fill={c} />
      <Line x1={12} y1={9} x2={12} y2={14} stroke="#fff" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={12} cy={17} r={1.15} fill="#fff" />
    </>
  ),

  'circle.lefthalf.filled': (c, w) => (
    <>
      <Circle cx={12} cy={12} r={8.6} {...line(c, w)} />
      <Path d="M12 3.4a8.6 8.6 0 0 0 0 17.2z" fill={c} />
    </>
  ),

  'cube.transparent': (c, w) => (
    <>
      <Path d="M12 3l8 4.6v8.8L12 21l-8-4.6V7.6z" {...line(c, w)} />
      <Polyline points="4,7.6 12,12.2 20,7.6" {...line(c, w)} />
      <Line x1={12} y1={12.2} x2={12} y2={21} {...line(c, w)} />
    </>
  ),

  eye: (c, w) => (
    <>
      <Path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" {...line(c, w)} />
      <Circle cx={12} cy={12} r={2.9} {...line(c, w)} />
    </>
  ),

  gear: (c, w) => GLYPHS.gearshape(c, w),

  gearshape: (c, w) => (
    <>
      <Circle cx={12} cy={12} r={3.1} {...line(c, w)} />
      <Path
        d="M19.2 14.4a1.6 1.6 0 0 0 .32 1.76l.06.06a1.9 1.9 0 1 1-2.7 2.7l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.46v.17a1.9 1.9 0 1 1-3.8 0v-.09a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.9 1.9 0 1 1-2.7-2.7l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-.97h-.17a1.9 1.9 0 1 1 0-3.8h.09a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.76l-.06-.06a1.9 1.9 0 1 1 2.7-2.7l.06.06a1.6 1.6 0 0 0 1.76.32h.08A1.6 1.6 0 0 0 10.6 3.1v-.17a1.9 1.9 0 1 1 3.8 0v.09a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.9 1.9 0 1 1 2.7 2.7l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.46.97h.17a1.9 1.9 0 1 1 0 3.8h-.09a1.6 1.6 0 0 0-1.46.97z"
        {...line(c, w * 0.85)}
      />
    </>
  ),

  globe: (c, w) => (
    <>
      <Circle cx={12} cy={12} r={8.8} {...line(c, w)} />
      <Line x1={3.2} y1={12} x2={20.8} y2={12} {...line(c, w)} />
      <Path d="M12 3.2a13.5 13.5 0 0 1 0 17.6 13.5 13.5 0 0 1 0-17.6z" {...line(c, w)} />
    </>
  ),

  level: (c, w) => GLYPHS['level.fill'](c, w),

  'level.fill': (c, w) => (
    <>
      <Rect x={2.5} y={8.5} width={19} height={7} rx={2} {...line(c, w)} />
      <Circle cx={12} cy={12} r={2.1} {...line(c, w)} />
      <Line x1={7} y1={12} x2={9} y2={12} {...line(c, w)} />
      <Line x1={15} y1={12} x2={17} y2={12} {...line(c, w)} />
    </>
  ),

  'photo.on.rectangle': (c, w) => (
    <>
      <Rect x={7} y={4} width={14} height={12} rx={2.2} {...line(c, w)} />
      <Polyline points="9.5,13.5 13,10 16,12.5 18.5,10.5" {...line(c, w)} />
      <Path d="M17 19H5a2 2 0 0 1-2-2V8" {...line(c, w)} />
    </>
  ),

  'photo.on.rectangle.angled': (c, w) => (
    <>
      <Rect x={6.5} y={5.5} width={14.5} height={11.5} rx={2.2} {...line(c, w)} />
      <Polyline points="9,14.5 12.5,11 15.5,13.5 18.5,11" {...line(c, w)} />
      <Path d="M16.5 20.2L4.4 17a2 2 0 0 1-1.4-2.4l1.6-6" {...line(c, w)} />
    </>
  ),

  'photo.stack': (c, w) => (
    <>
      <Rect x={3} y={4} width={14} height={11} rx={2.2} {...line(c, w)} />
      <Path d="M7 19h12a2 2 0 0 0 2-2V8" {...line(c, w)} />
    </>
  ),

  'rectangle.split.2x1': (c, w) => (
    <>
      <Rect x={2.5} y={5} width={19} height={14} rx={2.4} {...line(c, w)} />
      <Line x1={12} y1={5} x2={12} y2={19} {...line(c, w)} />
    </>
  ),

  'rectangle.compress.vertical': (c, w) => (
    <>
      <Rect x={2.5} y={8.5} width={19} height={7} rx={2} {...line(c, w)} />
      <Line x1={5} y1={4.5} x2={19} y2={4.5} {...line(c, w)} />
      <Line x1={5} y1={19.5} x2={19} y2={19.5} {...line(c, w)} />
    </>
  ),

  'square.on.square': (c, w) => (
    <>
      <Rect x={8} y={3.5} width={12.5} height={12.5} rx={2.4} {...line(c, w)} />
      <Path d="M16 20.5H6a2.5 2.5 0 0 1-2.5-2.5V8" {...line(c, w)} />
    </>
  ),

  'square.grid.2x2': (c, w) => (
    <>
      <Rect x={3.5} y={3.5} width={7.5} height={7.5} rx={2} {...line(c, w)} />
      <Rect x={13} y={3.5} width={7.5} height={7.5} rx={2} {...line(c, w)} />
      <Rect x={3.5} y={13} width={7.5} height={7.5} rx={2} {...line(c, w)} />
      <Rect x={13} y={13} width={7.5} height={7.5} rx={2} {...line(c, w)} />
    </>
  ),

  'square.and.arrow.up': (c, w) => (
    <>
      <Line x1={12} y1={3} x2={12} y2={14.5} {...line(c, w)} />
      <Polyline points="8,6.8 12,2.8 16,6.8" {...line(c, w)} />
      <Path d="M6.5 10H5.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" {...line(c, w)} />
    </>
  ),

  'square.and.arrow.down': (c, w) => (
    <>
      <Line x1={12} y1={2.8} x2={12} y2={14.3} {...line(c, w)} />
      <Polyline points="8,10.3 12,14.3 16,10.3" {...line(c, w)} />
      <Path d="M6.5 10H5.5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" {...line(c, w)} />
    </>
  ),

  'square.and.arrow.down.fill': (c, w) => GLYPHS['square.and.arrow.down'](c, w),

  'slider.horizontal.3': (c, w) => (
    <>
      <Line x1={3} y1={7} x2={21} y2={7} {...line(c, w)} />
      <Line x1={3} y1={12} x2={21} y2={12} {...line(c, w)} />
      <Line x1={3} y1={17} x2={21} y2={17} {...line(c, w)} />
      <Circle cx={15.5} cy={7} r={2.4} fill={c} />
      <Circle cx={8} cy={12} r={2.4} fill={c} />
      <Circle cx={16.5} cy={17} r={2.4} fill={c} />
    </>
  ),

  ruler: (c, w) => (
    <>
      <Rect x={2.2} y={8} width={19.6} height={8} rx={2} {...line(c, w)} />
      <Line x1={7} y1={8} x2={7} y2={11.5} {...line(c, w)} />
      <Line x1={12} y1={8} x2={12} y2={12.5} {...line(c, w)} />
      <Line x1={17} y1={8} x2={17} y2={11.5} {...line(c, w)} />
    </>
  ),

  sparkles: (c) => (
    <>
      <Path d="M11 3.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill={c} />
      <Path d="M18 13.5l.85 2.15 2.15.85-2.15.85L18 19.5l-.85-2.15L15 16.5l2.15-.85z" fill={c} />
    </>
  ),

  viewfinder: (c, w) => (
    <>
      <Polyline points="3.5,8.5 3.5,3.5 8.5,3.5" {...line(c, w)} />
      <Polyline points="15.5,3.5 20.5,3.5 20.5,8.5" {...line(c, w)} />
      <Polyline points="20.5,15.5 20.5,20.5 15.5,20.5" {...line(c, w)} />
      <Polyline points="8.5,20.5 3.5,20.5 3.5,15.5" {...line(c, w)} />
    </>
  ),

  'viewfinder.rectangular': (c, w) => (
    <>
      {GLYPHS.viewfinder(c, w)}
      <Rect x={8.5} y={9.5} width={7} height={5} rx={1} {...line(c, w)} />
    </>
  ),

  visionpro: (c, w) => (
    <>
      <Path
        d="M3.5 11.2c0-2.7 3.6-4.2 8.5-4.2s8.5 1.5 8.5 4.2c0 3-1.2 5.8-3.4 5.8-1.6 0-2.8-1.6-5.1-1.6s-3.5 1.6-5.1 1.6c-2.2 0-3.4-2.8-3.4-5.8z"
        {...line(c, w)}
      />
    </>
  ),
};
