import React, { createContext, useContext, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { BackendErrorModal } from '../components/BackendErrorModal';

interface BackendErrorContextType {
  showBackendError: (retryCallback?: () => void) => void;
  hideBackendError: () => void;
  isBackendErrorVisible: boolean;
}

const BackendErrorContext = createContext<BackendErrorContextType | undefined>(undefined);

interface BackendErrorProviderProps {
  children: React.ReactNode;
  navigation: any;
}

export const BackendErrorProvider: React.FC<BackendErrorProviderProps> = ({ 
  children, 
  navigation 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [retryCallback, setRetryCallback] = useState<(() => void) | null>(null);

  const showBackendError = useCallback((callback?: () => void) => {
    setRetryCallback(() => callback);
    setIsVisible(true);
  }, []);

  const hideBackendError = useCallback(() => {
    setIsVisible(false);
    setRetryCallback(null);
  }, []);

  const handleRedirect = useCallback(() => {
    // Dış site yönlendirmesi kaldırıldı
    hideBackendError();
  }, [hideBackendError]);

  const handleRetry = useCallback(() => {
    if (retryCallback) {
      retryCallback();
    }
    hideBackendError();
  }, [retryCallback, hideBackendError]);

  const contextValue: BackendErrorContextType = {
    showBackendError,
    hideBackendError,
    isBackendErrorVisible: isVisible,
  };

  // Initialize the global error handler
  React.useEffect(() => {
    BackendErrorService.setErrorHandler(contextValue);
    
    return () => {
      BackendErrorService.setErrorHandler(null as any);
    };
  }, [contextValue]);

  return (
    <BackendErrorContext.Provider value={contextValue}>
      {children}
      <BackendErrorModal
        visible={isVisible}
        onClose={hideBackendError}
        onRedirect={handleRedirect}
        onRetry={handleRetry}
      />
    </BackendErrorContext.Provider>
  );
};

export const useBackendError = (): BackendErrorContextType => {
  const context = useContext(BackendErrorContext);
  if (!context) {
    throw new Error('useBackendError must be used within a BackendErrorProvider');
  }
  return context;
};

// Global backend error handler
export class BackendErrorService {
  private static errorHandler: BackendErrorContextType | null = null;
  private static consecutiveErrors = 0;
  private static lastErrorTime = 0;
  private static readonly ERROR_THRESHOLD = 3; // Show modal after 3 consecutive errors
  private static readonly ERROR_RESET_TIME = 30000; // Reset counter after 30 seconds

  static setErrorHandler(handler: BackendErrorContextType) {
    this.errorHandler = handler;
  }

  static handleBackendError(retryCallback?: () => void) {
    const now = Date.now();
    
    // Reset counter if enough time has passed
    if (now - this.lastErrorTime > this.ERROR_RESET_TIME) {
      this.consecutiveErrors = 0;
    }
    
    this.consecutiveErrors++;
    this.lastErrorTime = now;
    
    // Backend error logged silently
    
    // Hemen hata modalını göster (threshold kaldırıldı)
    if (this.errorHandler) {
      this.errorHandler.showBackendError(retryCallback);
      this.consecutiveErrors = 0; // Reset after showing modal
    } else {
      console.error('❌ Backend error handler not initialized!');
    }
  }

  static resetErrorCount() {
    this.consecutiveErrors = 0;
    this.lastErrorTime = 0;
  }

  static isNetworkError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message || error.toString();
    const networkErrorPatterns = [
      'Network request failed',
      'fetch',
      'Connection refused',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'timeout',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      'No internet connection',
      'Unable to resolve host'
    ];
    
    return networkErrorPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  static isBackendConnectionError(error: any, endpoint?: string): boolean {
    if (!this.isNetworkError(error)) return false;
    
    // Additional checks for backend-specific endpoints
    if (endpoint) {
      const backendEndpoints = ['/api/', '/health', '/products', '/orders', '/users'];
      const isBackendEndpoint = backendEndpoints.some(be => endpoint.includes(be));
      return isBackendEndpoint;
    }
    
    return true;
  }
}
