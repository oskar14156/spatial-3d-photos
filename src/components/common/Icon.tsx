import React from 'react';
import { Platform, StyleProp, ViewStyle } from 'react-native';
import { SFSymbol, SymbolView, SymbolWeight } from 'expo-symbols';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type Props = {
  /** SF Symbol name; the Android equivalent is looked up from it. */
  name: SFSymbol;
  size?: number;
  color: string;
  weight?: SymbolWeight;
  style?: StyleProp<ViewStyle>;
};

/**
 * Every SF Symbol the app uses, mapped to its closest Material counterpart.
 *
 * Keeping the iOS name as the key means call sites read the same on both
 * platforms and the iOS rendering path is untouched — Android is the one that
 * substitutes. An unmapped name falls back to a neutral glyph rather than
 * rendering nothing, which is how a missing icon usually escapes review.
 */
const ANDROID_EQUIVALENT: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  'arrow.counterclockwise': 'restore',
  'arrow.up.forward.app': 'open-in-new',
  'arrow.up.and.down.circle.fill': 'arrow-up-down-bold-outline',
  'bolt.badge.automatic.fill': 'flash-auto',
  'camera.fill': 'camera',
  checkmark: 'check',
  'chevron.right': 'chevron-right',
  'circle.lefthalf.filled': 'circle-half-full',
  'cube.transparent': 'cube-outline',
  eye: 'eye-outline',
  'exclamationmark.triangle.fill': 'alert',
  gear: 'cog',
  gearshape: 'cog-outline',
  globe: 'web',
  'gobackward.5': 'rewind-5',
  'goforward.5': 'fast-forward-5',
  level: 'spirit-level',
  'level.fill': 'spirit-level',
  'pause.fill': 'pause',
  'photo.on.rectangle': 'image-multiple-outline',
  'photo.on.rectangle.angled': 'image-multiple',
  'photo.stack': 'image-album',
  'play.fill': 'play',
  plus: 'plus',
  repeat: 'repeat',
  'rectangle.compress.vertical': 'arrow-collapse-vertical',
  'rectangle.split.2x1': 'view-split-vertical',
  ruler: 'ruler',
  'slider.horizontal.3': 'tune-variant',
  sparkles: 'auto-fix',
  'square.and.arrow.down': 'tray-arrow-down',
  'square.and.arrow.down.fill': 'tray-arrow-down',
  'square.and.arrow.up': 'export-variant',
  'square.grid.2x2': 'view-grid-outline',
  'square.on.square': 'content-duplicate',
  video: 'video-outline',
  'video.fill': 'video',
  viewfinder: 'crop-free',
  'viewfinder.rectangular': 'cube-scan',
  visionpro: 'safety-goggles',
  xmark: 'close',
};

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

  return (
    <MaterialCommunityIcons
      name={ANDROID_EQUIVALENT[name] ?? 'shape-outline'}
      size={size + 3}
      color={color}
      style={style}
    />
  );
}
