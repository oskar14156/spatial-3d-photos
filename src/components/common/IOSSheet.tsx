import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { hapticFeedback } from '../../utils/haptics';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
};

export function IOSSheet({
  visible,
  title,
  subtitle,
  children,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <View style={styles.titleColumn}>
            <Text style={styles.title}>{title}</Text>
            {!!subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={8}
            onPress={() => {
              hapticFeedback.light();
              onClose();
            }}
            style={({ pressed }) => [
              styles.close,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name="xmark"
              tintColor="rgba(235,235,245,0.72)"
              size={13}
              weight="bold"
            />
          </Pressable>
        </View>
        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  titleColumn: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.55,
  },
  subtitle: {
    marginTop: 2,
    color: 'rgba(235,235,245,0.54)',
    fontSize: 12,
    fontWeight: '500',
  },
  close: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(118,118,128,0.24)',
  },
  pressed: {
    opacity: 0.62,
  },
  body: {
    flex: 1,
  },
});
