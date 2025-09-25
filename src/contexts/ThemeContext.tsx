import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  // Background colors
  background: string;
  surface: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textOnPrimary: string;
  
  // Primary colors
  primary: string;
  primaryLight: string;
  primaryDark: string;
  
  // Secondary colors
  secondary: string;
  secondaryLight: string;
  
  // Status colors
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // Border and divider colors
  border: string;
  divider: string;
  
  // Shadow colors
  shadow: string;
  
  // Special colors
  overlay: string;
  disabled: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const lightColors: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F8F9FA',
  card: '#FFFFFF',
  
  text: '#1A1A2E',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',
  
  primary: '#1A1A2E',
  primaryLight: '#4F46E5',
  primaryDark: '#0F0F1A',
  
  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  border: '#E5E7EB',
  divider: '#F3F4F6',
  
  shadow: '#000000',
  
  overlay: 'rgba(0, 0, 0, 0.5)',
  disabled: '#9CA3AF',
};

const darkColors: ThemeColors = {
  background: '#0F0F1A',
  surface: '#1A1A2E',
  card: '#16213E',
  
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  primaryDark: '#3730A3',
  
  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',
  
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  border: '#374151',
  divider: '#1F2937',
  
  shadow: '#000000',
  
  overlay: 'rgba(0, 0, 0, 0.7)',
  disabled: '#6B7280',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = '@app_theme_mode';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    loadSavedTheme();
  }, []);

  useEffect(() => {
    // Add a small delay to ensure smooth theme transitions
    const timeoutId = setTimeout(() => {
      updateTheme();
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [mode]);

  const loadSavedTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedMode && ['light', 'dark', 'system'].includes(savedMode)) {
        setMode(savedMode as ThemeMode);
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    }
  };

  const updateTheme = () => {
    let shouldBeDark = false;
    
    if (mode === 'dark') {
      shouldBeDark = true;
    } else if (mode === 'system') {
      // For system theme, you might want to use a library like react-native-appearance
      // For now, we'll default to light theme
      shouldBeDark = false;
    }
    
    // Updating theme mode
    setIsDark(shouldBeDark);
    
    // StatusBar is now handled by expo-status-bar automatically
    // StatusBar will be updated automatically by expo-status-bar
    // Theme updated successfully
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    try {
      // Setting theme mode
      await AsyncStorage.setItem(STORAGE_KEY, newMode);
      setMode(newMode);
      // Theme mode saved successfully
    } catch (error) {
      console.error('❌ Error saving theme mode:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = isDark ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const colors = isDark ? darkColors : lightColors;

  const contextValue: ThemeContextType = {
    mode,
    isDark,
    colors,
    toggleTheme,
    setThemeMode,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Helper hook for creating themed styles
export const useThemedStyles = <T extends Record<string, any>>(
  styleCreator: (colors: ThemeColors, isDark: boolean) => T
): T => {
  const { colors, isDark } = useTheme();
  return styleCreator(colors, isDark);
};
