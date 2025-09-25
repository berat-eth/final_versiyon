import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../utils/api-service';
import { UserController } from '../controllers/UserController';
import { CartItem, Order, Product } from '../utils/types';

// State Types
export interface AppState {
  user: UserState | null;
  cart: CartState;
  orders: OrderState;
  products: ProductState;
  notifications: NotificationState;
  realTimeUpdates: RealTimeUpdateState;
}

interface UserState {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  walletBalance: number;
  isLoggedIn: boolean;
  lastActive: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  lastUpdated: string;
}

interface OrderState {
  orders: Order[];
  activeOrders: Order[];
  lastUpdated: string;
}

interface ProductState {
  products: Product[];
  categories: string[];
  brands: string[];
  lastUpdated: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  lastUpdated: string;
}

interface RealTimeUpdateState {
  isConnected: boolean;
  lastSync: string;
  pendingUpdates: UpdateItem[];
}

interface Notification {
  id: string;
  type: 'order' | 'product' | 'system' | 'promotion';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

interface UpdateItem {
  id: string;
  type: 'cart' | 'order' | 'product' | 'user';
  action: 'create' | 'update' | 'delete';
  timestamp: string;
  data: any;
}

// Action Types
export type AppAction =
  | { type: 'SET_USER'; payload: UserState | null }
  | { type: 'UPDATE_USER'; payload: Partial<UserState> }
  | { type: 'LOGOUT' }
  | { type: 'SET_CART'; payload: CartState }
  | { type: 'UPDATE_CART_ITEM'; payload: { itemId: number; updates: Partial<CartItem> } }
  | { type: 'ADD_CART_ITEM'; payload: CartItem }
  | { type: 'REMOVE_CART_ITEM'; payload: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_ORDERS'; payload: OrderState }
  | { type: 'ADD_ORDER'; payload: Order }
  | { type: 'UPDATE_ORDER_STATUS'; payload: { orderId: number; status: string } }
  | { type: 'SET_PRODUCTS'; payload: ProductState }
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: number; stock: number } }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_REAL_TIME_UPDATE'; payload: Partial<RealTimeUpdateState> }
  | { type: 'ADD_PENDING_UPDATE'; payload: UpdateItem }
  | { type: 'REMOVE_PENDING_UPDATE'; payload: string }
  | { type: 'SYNC_STATE' };

// Initial State
const initialState: AppState = {
  user: null,
  cart: {
    items: [],
    total: 0,
    itemCount: 0,
    lastUpdated: new Date().toISOString(),
  },
  orders: {
    orders: [],
    activeOrders: [],
    lastUpdated: new Date().toISOString(),
  },
  products: {
    products: [],
    categories: [],
    brands: [],
    lastUpdated: new Date().toISOString(),
  },
  notifications: {
    notifications: [],
    unreadCount: 0,
    lastUpdated: new Date().toISOString(),
  },
  realTimeUpdates: {
    isConnected: false,
    lastSync: new Date().toISOString(),
    pendingUpdates: [],
  },
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          lastSync: new Date().toISOString(),
        },
      };

    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          lastSync: new Date().toISOString(),
        },
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        cart: {
          ...initialState.cart,
          lastUpdated: new Date().toISOString(),
        },
        orders: {
          ...initialState.orders,
          lastUpdated: new Date().toISOString(),
        },
        notifications: {
          ...initialState.notifications,
          lastUpdated: new Date().toISOString(),
        },
        realTimeUpdates: {
          ...state.realTimeUpdates,
          lastSync: new Date().toISOString(),
        },
      };

    case 'SET_CART':
      return {
        ...state,
        cart: {
          ...action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'UPDATE_CART_ITEM':
      return {
        ...state,
        cart: {
          ...state.cart,
          items: (state.cart.items || []).map(item =>
            item.id === action.payload.itemId
              ? { ...item, ...action.payload.updates }
              : item
          ),
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'ADD_CART_ITEM':
      return {
        ...state,
        cart: {
          ...state.cart,
          items: [...(state.cart.items || []), action.payload],
          itemCount: state.cart.itemCount + action.payload.quantity,
          total: state.cart.total + (action.payload.product?.price || 0) * action.payload.quantity,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'REMOVE_CART_ITEM':
      const removedItem = (state.cart.items || []).find(item => item.id === action.payload);
      return {
        ...state,
        cart: {
          ...state.cart,
          items: (state.cart.items || []).filter(item => item.id !== action.payload),
          itemCount: state.cart.itemCount - (removedItem?.quantity || 0),
          total: state.cart.total - (removedItem?.product?.price || 0) * (removedItem?.quantity || 0),
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'CLEAR_CART':
      return {
        ...state,
        cart: {
          ...initialState.cart,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'SET_ORDERS':
      return {
        ...state,
        orders: {
          ...action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'ADD_ORDER':
      return {
        ...state,
        orders: {
          ...state.orders,
          orders: [action.payload, ...state.orders.orders],
          activeOrders: [action.payload, ...state.orders.activeOrders],
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'UPDATE_ORDER_STATUS':
      return {
        ...state,
        orders: {
          ...state.orders,
          orders: state.orders.orders.map(order =>
            order.id === action.payload.orderId
              ? { ...order, status: action.payload.status }
              : order
          ),
          activeOrders: state.orders.activeOrders.map(order =>
            order.id === action.payload.orderId
              ? { ...order, status: action.payload.status }
              : order
          ),
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'SET_PRODUCTS':
      return {
        ...state,
        products: {
          ...action.payload,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'UPDATE_PRODUCT_STOCK':
      return {
        ...state,
        products: {
          ...state.products,
          products: state.products.products.map(product =>
            product.id === action.payload.productId
              ? { ...product, stock: action.payload.stock }
              : product
          ),
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          notifications: [action.payload, ...state.notifications.notifications],
          unreadCount: state.notifications.unreadCount + 1,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          notifications: state.notifications.notifications.map(notification =>
            notification.id === action.payload
              ? { ...notification, isRead: true }
              : notification
          ),
          unreadCount: Math.max(0, state.notifications.unreadCount - 1),
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          notifications: [],
          unreadCount: 0,
          lastUpdated: new Date().toISOString(),
        },
      };

    case 'SET_REAL_TIME_UPDATE':
      return {
        ...state,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          ...action.payload,
          lastSync: new Date().toISOString(),
        },
      };

    case 'ADD_PENDING_UPDATE':
      return {
        ...state,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          pendingUpdates: [...state.realTimeUpdates.pendingUpdates, action.payload],
        },
      };

    case 'REMOVE_PENDING_UPDATE':
      return {
        ...state,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          pendingUpdates: state.realTimeUpdates.pendingUpdates.filter(
            update => update.id !== action.payload
          ),
        },
      };

    case 'SYNC_STATE':
      return {
        ...state,
        realTimeUpdates: {
          ...state.realTimeUpdates,
          lastSync: new Date().toISOString(),
          pendingUpdates: [],
        },
      };

    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  updateUser: (updates: Partial<UserState>) => void;
  updateCart: (cartData: CartState) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: number) => void;
  updateOrderStatus: (orderId: number, status: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  markNotificationRead: (notificationId: string) => void;
  syncState: () => void;
  getPendingUpdates: () => UpdateItem[];
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider Component
interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    loadStateFromStorage();
  }, []);

  // Save state to AsyncStorage when it changes
  useEffect(() => {
    saveStateToStorage();
  }, [state]);

  // Start network monitoring when component mounts
  useEffect(() => {
    // Start network monitoring with smart intervals
    apiService.startNetworkMonitoring(20000); // 20 saniye aralıklarla kontrol et (15'ten 20'ye çıkarıldı)
    
    // Cleanup on unmount
    return () => {
      apiService.stopNetworkMonitoring();
    };
  }, []);

  // Load state from AsyncStorage
  const loadStateFromStorage = async () => {
    try {
      const savedState = await AsyncStorage.getItem('appState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Only restore non-sensitive data with fallbacks
        if (parsedState.user) {
          dispatch({ type: 'SET_USER', payload: parsedState.user });
        }
        if (parsedState.cart) {
          // Ensure cart has proper structure
          const cartData = {
            items: parsedState.cart.items || [],
            total: parsedState.cart.total || 0,
            itemCount: parsedState.cart.itemCount || 0,
            lastUpdated: parsedState.cart.lastUpdated || new Date().toISOString(),
          };
          dispatch({ type: 'SET_CART', payload: cartData });
        }
        if (parsedState.orders) {
          dispatch({ type: 'SET_ORDERS', payload: parsedState.orders });
        }
      }

      // Eğer storage'da kullanıcı yoksa UserController üzerinden hydrate et
      if (!state.user) {
        try {
          const current = await UserController.getCurrentUser();
          if (current && current.id) {
            const hydratedUser = {
              id: current.id,
              name: current.name || '',
              email: current.email || '',
              phone: current.phone || '',
              address: current.address || '',
              walletBalance: 0,
              isLoggedIn: true,
              lastActive: new Date().toISOString(),
            } as UserState;
            dispatch({ type: 'SET_USER', payload: hydratedUser });
          }
        } catch (e) {
          // sessiz geç
        }
      }
    } catch (error) {
      console.error('Error loading state from storage:', error);
    }
  };

  // Save state to AsyncStorage
  const saveStateToStorage = async () => {
    try {
      const stateToSave = {
        user: state.user,
        cart: state.cart,
        orders: state.orders,
      };
      await AsyncStorage.setItem('appState', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Error saving state to storage:', error);
    }
  };

  // Helper functions
  const updateUser = (updates: Partial<UserState>) => {
    dispatch({ type: 'UPDATE_USER', payload: updates });
  };

  const updateCart = (cartData: CartState) => {
    dispatch({ type: 'SET_CART', payload: cartData });
  };

  const addToCart = (item: CartItem) => {
    dispatch({ type: 'ADD_CART_ITEM', payload: item });
  };

  const removeFromCart = (itemId: number) => {
    dispatch({ type: 'REMOVE_CART_ITEM', payload: itemId });
  };

  const updateOrderStatus = (orderId: number, status: string) => {
    dispatch({ type: 'UPDATE_ORDER_STATUS', payload: { orderId, status } });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
  };

  const markNotificationRead = (notificationId: string) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
  };

  const syncState = () => {
    dispatch({ type: 'SYNC_STATE' });
  };

  const getPendingUpdates = () => {
    return state.realTimeUpdates.pendingUpdates;
  };

  const logout = async () => {
    try {
      // Check cart before logout and send notification if needed
      if (state.user && state.cart.items && state.cart.items.length > 0) {
        try {
          const { DiscountWheelController } = await import('../controllers/DiscountWheelController');
          
          let deviceId: string | undefined;
          if (state.user.id === 1) {
            try {
              deviceId = await DiscountWheelController.getDeviceId();
            } catch (e) {
              console.warn('Device ID not available for guest user');
            }
          }
          
          const cartCheckResponse = await apiService.checkCartBeforeLogout(state.user.id, deviceId);
          if (cartCheckResponse.success && cartCheckResponse.data?.hasItems) {
            console.log(`📱 Cart abandonment notification sent for user ${state.user.id} with ${cartCheckResponse.data.itemCount} items`);
            
            // Yerel bildirim (Ntfy kaldırıldı)
            // Bildirim sistemi tamamen kaldırıldı; lokal bildirim gönderilmiyor
          }
        } catch (cartError) {
          console.warn('⚠️ Cart check before logout failed:', cartError);
          // Don't fail logout if cart check fails
        }
      }
      
      // Clear state
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Still clear state even if cart check fails
      dispatch({ type: 'LOGOUT' });
    }
  };

  const contextValue: AppContextType = {
    state,
    dispatch,
    updateUser,
    updateCart,
    addToCart,
    removeFromCart,
    updateOrderStatus,
    addNotification,
    markNotificationRead,
    syncState,
    getPendingUpdates,
    logout,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom Hook
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Export types for use in other files
// Re-export kaldırıldı; bu dosyada zaten export edildiği için tekrar export gereksiz
