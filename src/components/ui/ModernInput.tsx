import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Animated,
  TextInputProps,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { Spacing } from '../../theme/theme';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ModernInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'outlined' | 'filled';
}

export const ModernInput: React.FC<ModernInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  variant = 'outlined',
  style,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [animatedValue] = useState(new Animated.Value(0));

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  const getContainerStyles = () => {
    if (variant === 'filled') {
      return {
        backgroundColor: Colors.surfaceVariant,
        borderWidth: 0,
        borderBottomWidth: 2,
        borderBottomColor: error ? Colors.error : isFocused ? Colors.primary : Colors.border,
        borderRadius: 8,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    return {
      borderWidth: 1.5,
      borderColor: error ? Colors.error : isFocused ? Colors.primary : Colors.border,
    };
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, error && styles.labelError]}>{label}</Text>
      )}
      <Animated.View
        style={[
          styles.container,
          getContainerStyles(),
          variant === 'outlined' && { borderColor },
        ]}
      >
        {leftIcon && (
          <Icon
            name={leftIcon}
            size={20}
            color={error ? Colors.error : isFocused ? Colors.primary : Colors.textLight}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            style,
          ]}
          placeholderTextColor={Colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={styles.rightIconContainer}
          >
            <Icon
              name={rightIcon}
              size={20}
              color={error ? Colors.error : isFocused ? Colors.primary : Colors.textLight}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error-outline" size={12} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 56,
    paddingHorizontal: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: Spacing.md,
  },
  inputWithLeftIcon: {
    paddingLeft: Spacing.sm,
  },
  inputWithRightIcon: {
    paddingRight: Spacing.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  labelError: {
    color: Colors.error,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIconContainer: {
    padding: Spacing.xs,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  errorText: {
    fontSize: 12,
    color: Colors.error,
    marginLeft: Spacing.xs,
  },
});

