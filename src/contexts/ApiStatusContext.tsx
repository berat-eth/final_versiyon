import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Colors } from '../theme/colors';

interface ApiStatusContextType {
  isApiAvailable: boolean;
  apiError: string | null;
  setApiStatus: (isAvailable: boolean, error?: string) => void;
  showApiError: (error: string) => void;
  clearApiError: () => void;
}

const ApiStatusContext = createContext<ApiStatusContextType | undefined>(undefined);

interface ApiStatusProviderProps {
  children: ReactNode;
}

export const ApiStatusProvider: React.FC<ApiStatusProviderProps> = ({ children }) => {
  const [isApiAvailable, setIsApiAvailable] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const setApiStatus = useCallback((isAvailable: boolean, error?: string) => {
    setIsApiAvailable(isAvailable);
    setApiError(error || null);
  }, []);

  const showApiError = useCallback((error: string) => {
    setIsApiAvailable(false);
    setApiError(error);
  }, []);

  const clearApiError = useCallback(() => {
    setIsApiAvailable(true);
    setApiError(null);
  }, []);

  const contextValue: ApiStatusContextType = {
    isApiAvailable,
    apiError,
    setApiStatus,
    showApiError,
    clearApiError,
  };

  return (
    <ApiStatusContext.Provider value={contextValue}>
      {children}
      {!isApiAvailable && (
        <ApiErrorOverlay 
          error={apiError} 
          onRetry={clearApiError}
        />
      )}
    </ApiStatusContext.Provider>
  );
};

interface ApiErrorOverlayProps {
  error: string | null;
  onRetry: () => void;
}

const ApiErrorOverlay: React.FC<ApiErrorOverlayProps> = ({ error, onRetry }) => {
  const handleRetry = () => {
    onRetry();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Sunucuya Bağlanılamıyor</Text>
        <Text style={styles.errorMessage}>
          {error || 'API sunucusuna erişilemiyor. İnternet bağlantınızı kontrol edin.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const useApiStatus = (): ApiStatusContextType => {
  const context = useContext(ApiStatusContext);
  if (context === undefined) {
    throw new Error('useApiStatus must be used within an ApiStatusProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ApiStatusContext;
