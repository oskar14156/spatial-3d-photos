import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS } from '../../constants';
import { hapticFeedback } from '../../utils/haptics';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  selectedId: T;
  onSelect: (id: T) => void;
  scrollable?: boolean;
}

export function SegmentedControl<T extends string>({
  options,
  selectedId,
  onSelect,
  scrollable = false,
}: SegmentedControlProps<T>) {
  const renderOption = (option: SegmentOption<T>) => {
    const isSelected = option.id === selectedId;
    return (
      <TouchableOpacity
        key={option.id}
        style={[
          styles.segmentItem,
          isSelected && styles.segmentItemSelected,
        ]}
        onPress={() => {
          if (!isSelected) {
            hapticFeedback.selection();
            onSelect(option.id);
          }
        }}
        activeOpacity={0.7}
      >
        {option.icon && (
          <View style={[styles.iconContainer, isSelected && styles.iconContainerSelected]}>
            {option.icon}
          </View>
        )}
        <Text
          style={[
            styles.segmentText,
            isSelected && styles.segmentTextSelected,
          ]}
          numberOfLines={1}
        >
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  if (scrollable) {
    return (
      <View style={styles.scrollWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {options.map(renderOption)}
        </ScrollView>
      </View>
    );
  }

  return <View style={styles.fixedContainer}>{options.map(renderOption)}</View>;
}

const styles = StyleSheet.create({
  fixedContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 3,
    alignItems: 'center',
  },
  scrollWrapper: {
    width: '100%',
  },
  scrollContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.25)',
    borderLeftColor: 'rgba(255, 255, 255, 0.1)',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  segmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    minHeight: 36,
  },
  segmentItemSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
    borderWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.45)',
    borderLeftColor: 'rgba(255, 255, 255, 0.2)',
    borderRightColor: 'rgba(255, 255, 255, 0.2)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconContainer: {
    marginRight: 6,
    opacity: 0.75,
  },
  iconContainerSelected: {
    opacity: 1,
  },
  segmentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  segmentTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
