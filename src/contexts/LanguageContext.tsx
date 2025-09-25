import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SupportedLanguage = 'tr' | 'en' | 'fr' | 'es' | 'de';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  t: (key: string, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

const STORAGE_KEY = '@app_language';

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('tr');
  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    loadSavedLanguage();
  }, []);

  useEffect(() => {
    loadTranslations(currentLanguage);
  }, [currentLanguage]);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedLanguage && ['tr', 'en', 'fr', 'es', 'de'].includes(savedLanguage)) {
        setCurrentLanguage(savedLanguage as SupportedLanguage);
      }
    } catch (error) {
      console.error('Error loading saved language:', error);
    }
  };

  const loadTranslations = async (language: SupportedLanguage) => {
    try {
      if (__DEV__) console.log('📚 Loading translations for language:', language);
      let translationModule;
      
      switch (language) {
        case 'en':
          translationModule = require('../translations/en.json');
          break;
        case 'fr':
          translationModule = require('../translations/fr.json');
          break;
        case 'es':
          translationModule = require('../translations/es.json');
          break;
        case 'de':
          translationModule = require('../translations/de.json');
          break;
        default:
          translationModule = require('../translations/tr.json');
          break;
      }
      
      setTranslations(translationModule);
      if (__DEV__) console.log('✅ Translations loaded successfully for', language, 'Keys:', Object.keys(translationModule).length);
    } catch (error) {
      if (__DEV__) console.error(`❌ Error loading translations for ${language}:`, error);
      // Fallback to Turkish if translation file is missing
      try {
        const fallbackModule = require('../translations/tr.json');
        setTranslations(fallbackModule);
        if (__DEV__) console.log('🔄 Fallback to Turkish translations loaded');
      } catch (fallbackError) {
        if (__DEV__) console.error('❌ Error loading fallback translations:', fallbackError);
        setTranslations({});
      }
    }
  };

  const changeLanguage = async (language: SupportedLanguage) => {
    try {
      console.log('🌍 Changing language from', currentLanguage, 'to', language);
      await AsyncStorage.setItem(STORAGE_KEY, language);
      setCurrentLanguage(language);
      console.log('✅ Language changed successfully to', language);
    } catch (error) {
      console.error('❌ Error saving language:', error);
    }
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const keys = key.split('.');
    let value: any = translations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key} for language: ${currentLanguage}`);
        return key; // Return the key itself if translation is not found
      }
    }
    
    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }
    
    // Replace parameters in the translation
    if (params) {
      Object.keys(params).forEach(param => {
        value = value.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      });
    }
    
    return value;
  };

  const contextValue: LanguageContextType = {
    currentLanguage,
    changeLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const SUPPORTED_LANGUAGES = [
  { code: 'tr' as SupportedLanguage, name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en' as SupportedLanguage, name: 'English', flag: '🇺🇸' },
  { code: 'fr' as SupportedLanguage, name: 'Français', flag: '🇫🇷' },
  { code: 'es' as SupportedLanguage, name: 'Español', flag: '🇪🇸' },
  { code: 'de' as SupportedLanguage, name: 'Deutsch', flag: '🇩🇪' },
];
