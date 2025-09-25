import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
  label: string;
  required?: boolean;
  linkText?: string;
  onLinkPress?: () => void;
  disabled?: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onPress,
  label,
  required = false,
  linkText,
  onLinkPress,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && (
          <Icon name="check" size={16} color="white" />
        )}
      </View>
      
      <View style={styles.labelContainer}>
        <Text style={[styles.label, disabled && styles.labelDisabled]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        
        {linkText && onLinkPress && (
          <TouchableOpacity onPress={onLinkPress} style={styles.linkContainer}>
            <Text style={styles.linkText}>{linkText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  labelContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  labelDisabled: {
    color: Colors.textMuted,
  },
  required: {
    color: Colors.error,
    fontWeight: 'bold',
  },
  linkContainer: {
    marginTop: 4,
  },
  linkText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
