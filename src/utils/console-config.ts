// Console warning'leri kapatmak için
import { LogBox } from 'react-native';

// Sadece belirli uyarıları kapat
LogBox.ignoreLogs([
  'source.uri should not be an empty string',
  'Warning: source.uri should not be an empty string',
  'SyntaxError: "undefined" is not valid JSON',
  'at JSON.parse',
  'at Server._symbolicate',
  'at Server._processRequest',
  'ERROR  The action \'NAVIGATE\' with payload',
  'Do you have a screen named',
  'If you\'re trying to navigate to a screen in a nested navigator',
  'This is a development-only warning and won\'t be shown in production',
  'Failed to get user info: undefined',
  'API request failed',
  'Sunucu hatası',
  'Kaynak bulunamadı'
]);

export {};
