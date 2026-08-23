import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { AnaglyphColorMode, StereoPair } from '../../types';
import { palette, type } from '../../theme';
import { eyeTransforms, resolveEyes } from './eyeGeometry';

/**
 * Every surface in this file fills its parent frame exactly and draws nothing
 * outside it — no borders, no captions, no controls. The studio screen owns
 * the frame, the chrome and the controls, which is what keeps the layers from
 * stacking on top of each other.
 */

type SurfaceProps = { pair: StereoPair };

/* -------------------------------------------------------------------------- */
/* Side by side                                                               */
/* -------------------------------------------------------------------------- */

export function SplitSurface({
  pair,
  ipdOffset = 0,
  crossed = false,
}: SurfaceProps & { ipdOffset?: number; crossed?: boolean }) {
  const eyes = resolveEyes(pair);
  const transforms = eyeTransforms(pair.alignment, ipdOffset);

  // Cross-eye viewing swaps the panes: the right eye's image sits on the left
  // so the crossed gaze lands each image on the correct retina.
  const nearPane = crossed
    ? { uri: eyes.right, transform: transforms.right }
    : { uri: eyes.left, transform: transforms.left };
  const farPane = crossed
    ? { uri: eyes.left, transform: transforms.left }
    : { uri: eyes.right, transform: transforms.right };

  return (
    <View style={styles.row}>
      <View style={styles.pane}>
        <Image
          source={{ uri: nearPane.uri }}
          style={[styles.fill, { transform: nearPane.transform }]}
          resizeMode="contain"
        />
      </View>
      <View style={styles.seam} />
      <View style={styles.pane}>
        <Image
          source={{ uri: farPane.uri }}
          style={[styles.fill, { transform: farPane.transform }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Cross-eye                                                                  */
/* -------------------------------------------------------------------------- */

export function CrossEyeSurface({ pair }: SurfaceProps) {
  return (
    <View style={styles.fill}>
      <SplitSurface pair={pair} crossed />
      {/* Fusion aids: converge until the two dots become three. */}
      <View pointerEvents="none" style={styles.fusionRow}>
        <View style={styles.fusionDot} />
        <View style={styles.fusionDot} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Anaglyph                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * A real red/cyan anaglyph rather than two tinted images faded over each other.
 *
 * Each eye is multiplied by a pure primary, which zeroes the channels that eye
 * must not contribute — left keeps only R, right keeps only G and B. Because
 * the two results have no channel in common, screening them together is
 * mathematically identical to adding them, so the composite is exact.
 */
export function AnaglyphSurface({
  pair,
  mode,
}: SurfaceProps & { mode: AnaglyphColorMode }) {
  const eyes = resolveEyes(pair);
  const transforms = eyeTransforms(pair.alignment);

  // Desaturating reduces retinal rivalry, the shimmer you get when strongly
  // saturated colour falls only on one eye.
  const leftFilter =
    mode === 'mono'
      ? [{ grayscale: 1 }]
      : mode === 'half_color'
      ? [{ grayscale: 0.65 }]
      : undefined;
  const rightFilter = mode === 'mono' ? [{ grayscale: 1 }] : undefined;

  return (
    <View style={[styles.fill, styles.isolated]}>
      <View style={[styles.fill, leftFilter ? { filter: leftFilter } : null]}>
        <Image
          source={{ uri: eyes.left }}
          style={[styles.fill, { transform: transforms.left }]}
          resizeMode="contain"
        />
        <View pointerEvents="none" style={[styles.channelMask, styles.redMask]} />
      </View>

      <View
        style={[
          styles.fill,
          styles.additiveLayer,
          rightFilter ? { filter: rightFilter } : null,
        ]}
      >
        <Image
          source={{ uri: eyes.right }}
          style={[styles.fill, { transform: transforms.right }]}
          resizeMode="contain"
        />
        <View pointerEvents="none" style={[styles.channelMask, styles.cyanMask]} />
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared empty state                                                         */
/* -------------------------------------------------------------------------- */

export function SurfaceMessage({ text }: { text: string }) {
  return (
    <View style={[styles.fill, styles.messageBox]}>
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  row: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  pane: {
    flex: 1,
    overflow: 'hidden',
  },
  seam: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  isolated: {
    // Confines the blend below to this subtree instead of the whole screen.
    isolation: 'isolate',
    backgroundColor: '#000000',
  },
  additiveLayer: {
    mixBlendMode: 'screen',
  },
  channelMask: {
    ...StyleSheet.absoluteFillObject,
    mixBlendMode: 'multiply',
  },
  redMask: {
    backgroundColor: '#FF0000',
  },
  cyanMask: {
    backgroundColor: '#00FFFF',
  },
  fusionRow: {
    position: 'absolute',
    top: 10,
    left: '25%',
    right: '25%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fusionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  messageBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  messageText: {
    ...type.footnote,
    color: palette.labelTertiary,
    textAlign: 'center',
  },
});
