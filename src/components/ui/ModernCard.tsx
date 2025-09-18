import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors } from '../../theme/colors';
import { Spacing, Shadows } from '../../theme/theme';

interface ModernCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'filled';
  padding?: number;
  margin?: number;
  style?: ViewStyle;
  noPadding?: boolean;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  onPress,
  variant = 'elevated',
  padding,
  margin,
  style,
  noPadding = false,
}) => {
  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: Colors.background,
          borderWidth: 1,
          borderColor: Colors.border,
        };
      case 'filled':
        return {
          backgroundColor: Colors.surface,
        };
      default:
        return {
          backgroundColor: Colors.background,
          ...Shadows.medium,
        };
    }
  };

  const content = (
    <View
      style={[
        styles.container,
        getVariantStyles(),
        !noPadding && { padding: padding || Spacing.md },
        margin !== undefined && { margin },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
