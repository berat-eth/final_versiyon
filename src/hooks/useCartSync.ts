import { useState, useEffect, useCallback } from 'react';
import { CartController } from '../controllers/CartController';
import { apiService } from '../utils/api-service';

export const useCartSync = () => {
  const [cart, setCart] = useState<any[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'syncing'>('online');

  // Ensure cart is always an array
  const safeCart = Array.isArray(cart) ? cart : [];

  const syncCart = useCallback(async () => {
    try {
      console.log('🔄 Starting cart sync...');
      setConnectionStatus('syncing');
      console.log('📡 Connection status set to syncing');
      
      await CartController.processOfflineCartOperations();
      console.log('✅ Cart operations processed');
      
      setLastUpdated(new Date());
      console.log('⏰ Last updated timestamp set');
      
      setConnectionStatus('online');
      console.log('🌐 Connection status set to online');
      console.log('✅ Cart sync completed successfully');
    } catch (error) {
      console.error('❌ Error syncing cart:', error);
      setConnectionStatus('offline');
      console.log('🔴 Connection status set to offline due to error');
    }
  }, []);

  const clearCartCache = useCallback(() => {
    apiService.clearCacheByPattern('cart');
  }, []);

  // Check network status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const isOnline = await apiService.checkNetworkStatus();
        setConnectionStatus(isOnline ? 'online' : 'offline');
      } catch (error) {
        setConnectionStatus('offline');
      }
    };

    // Check immediately
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  return {
    cart: safeCart,
    syncCart,
    connectionStatus,
    lastUpdated,
    clearCartCache
  };
};
