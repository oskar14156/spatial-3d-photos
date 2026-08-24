import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SFSymbol } from 'expo-symbols';
import { Icon } from './Icon';
import { type Palette, radius, spacing, type, useTheme, useThemedStyles } from '../../theme';
import { hapticFeedback } from '../../utils/haptics';

type Action = {
  label: string;
  symbol: SFSymbol;
  onPress: () => void;
  /** The one action the screen is really steering toward. */
  primary?: boolean;
};

type Props = {
  symbol: SFSymbol;
  title: string;
  body: string;
  actions: Action[];
};

/**
 * Says plainly that there is nothing here yet.
 *
 * This replaces the built-in sample pairs, which were inline SVG placeholders:
 * they filled the library with dark grey tiles that looked like broken
 * thumbnails, could not be exported, and made an empty app look like a failing
 * one. An honest empty state is better than fake content.
 */
export function EmptyState({ symbol, title, body, actions }: Props) {
  const { palette } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.wrap}>
      <View style={styles.badge}>
        <Icon
          name={symbol}
          size={30}
          color={palette.labelTertiary}
          style={styles.badgeGlyph}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              hapticFeedback.light();
              action.onPress();
            }}
            style={({ pressed }) => [
              styles.action,
              action.primary ? styles.actionPrimary : styles.actionSecondary,
              pressed && styles.pressed,
            ]}
          >
            <Icon
              name={action.symbol}
              size={16}
              weight="semibold"
              color={action.primary ? palette.onAccent : palette.blue}
              style={styles.actionGlyph}
            />
            <Text
              style={[
                styles.actionLabel,
                { color: action.primary ? palette.onAccent : palette.blue },
              ]}
            >
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (palette: Palette) =>
  StyleSheet.create({
    wrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
      paddingBottom: 60,
    },
    badge: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.fillSubtler,
    },
    badgeGlyph: { width: 32, height: 32 },
    title: {
      ...type.title3,
      marginTop: spacing.lg,
      textAlign: 'center',
      color: palette.label,
    },
    body: {
      ...type.body,
      marginTop: spacing.sm,
      textAlign: 'center',
      maxWidth: 320,
      color: palette.labelSecondary,
    },
    actions: {
      marginTop: spacing.xl,
      width: '100%',
      maxWidth: 320,
      gap: spacing.sm,
    },
    action: {
      minHeight: 50,
      borderRadius: radius.group,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    actionPrimary: { backgroundColor: palette.blue },
    actionSecondary: { backgroundColor: palette.fill },
    actionGlyph: { width: 18, height: 18 },
    actionLabel: { ...type.callout, fontWeight: '600' },
    pressed: { opacity: 0.75 },
  });
