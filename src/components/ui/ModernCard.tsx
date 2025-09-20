import React from 'react';
import { StyleSheet, View, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
  gradientBorder?: boolean;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  onPress,
  variant = 'elevated',
  padding,
  margin,
  style,
  noPadding = false,
  gradientBorder = false,
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

  const content = gradientBorder ? (
    <View style={[styles.gradientWrapper, margin !== undefined && { margin }]}>
      <View style={styles.gradientBorder}>
        <View
          style={[
            styles.container,
            getVariantStyles(),
            !noPadding && { padding: padding || Spacing.md },
            style,
          ]}
        >
          {children}
        </View>
      </View>
    </View>
  ) : (
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
    borderRadius: 15, // Normal border radius
    overflow: 'hidden',
  },
  gradientWrapper: {
    borderRadius: 16,
  },
  gradientBorder: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#8b5cf6', // Gradient'in ilk rengi
    backgroundColor: 'transparent',
  },
});
