import { AppAction, UpdateItem } from '../contexts/AppContext';

export interface RealTimeConfig {
  syncInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export class RealTimeService {
  private static instance: RealTimeService;
  private syncInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private isConnected = false;
  private config: RealTimeConfig;
  private dispatch: React.Dispatch<AppAction> | null = null;
  private onConnectionChange: ((connected: boolean) => void) | null = null;

  private constructor(config: RealTimeConfig) {
    this.config = config;
  }

  public static getInstance(config?: RealTimeConfig): RealTimeService {
    if (!RealTimeService.instance) {
      RealTimeService.instance = new RealTimeService(
        config || {
          syncInterval: 60000, // 60 seconds (less frequent for stability)
          retryAttempts: 2,   // Fewer retry attempts
          retryDelay: 3000,   // 3 seconds base delay
        }
      );
    }
    return RealTimeService.instance;
  }

  // Initialize the service with dispatch function
  public initialize(dispatch: React.Dispatch<AppAction>): void {
    this.dispatch = dispatch;
    this.startSync();
  }

  // Set connection change callback
  public setConnectionChangeCallback(callback: (connected: boolean) => void): void {
    this.onConnectionChange = callback;
  }

  // Start periodic sync
  public startSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, this.config.syncInterval);

    // Initial sync
    this.performSync();
  }

  // Stop periodic sync
  public stopSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Perform sync operation
  private async performSync(): Promise<void> {
    try {
      // Simulate network request
      const success = await this.simulateNetworkRequest();
      
      if (success) {
        this.setConnectionStatus(true);
        this.retryCount = 0;
        
        // Dispatch sync success action
        if (this.dispatch) {
          this.dispatch({ type: 'SYNC_STATE' });
        }
        
        console.log('Sync completed successfully');
      } else {
        // Don't throw error for simulated failures, just handle them gracefully
        console.log('Simulated sync failure, will retry');
        this.handleSyncError();
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.handleSyncError();
    }
  }

  // Simulate network request (replace with actual API call)
  private async simulateNetworkRequest(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% success rate for more stability
        // Also add some randomness to make it more realistic
        const randomValue = Math.random();
        const success = randomValue > 0.05; // 95% success rate
        
        // Log for debugging (remove in production)
        if (!success) {
          console.log('Simulated network failure (this is normal for testing)');
        }
        
        resolve(success);
      }, 500); // Reduced delay for better responsiveness
    });
  }

  // Handle sync errors
  private handleSyncError(): void {
    this.setConnectionStatus(false);
    
    if (this.retryCount < this.config.retryAttempts) {
      this.retryCount++;
      console.log(`Retrying sync in ${this.config.retryDelay}ms (attempt ${this.retryCount})`);
      
      // Exponential backoff for retries
      const backoffDelay = this.config.retryDelay * Math.pow(2, this.retryCount - 1);
      
      setTimeout(() => {
        this.performSync();
      }, backoffDelay);
    } else {
      console.log('Max retry attempts reached, will retry on next sync cycle');
      this.retryCount = 0;
      // Don't keep retrying indefinitely, wait for next sync cycle
    }
  }

  // Set connection status
  private setConnectionStatus(connected: boolean): void {
    if (this.isConnected !== connected) {
      this.isConnected = connected;
      
      if (this.dispatch) {
        this.dispatch({
          type: 'SET_REAL_TIME_UPDATE',
          payload: { isConnected: connected }
        });
      }

      if (this.onConnectionChange) {
        this.onConnectionChange(connected);
      }
    }
  }

  // Add pending update
  public addPendingUpdate(update: Omit<UpdateItem, 'id' | 'timestamp'>): void {
    if (this.dispatch) {
      const pendingUpdate: UpdateItem = {
        ...update,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };

      this.dispatch({
        type: 'ADD_PENDING_UPDATE',
        payload: pendingUpdate
      });
    }
  }

  // Remove pending update
  public removePendingUpdate(updateId: string): void {
    if (this.dispatch) {
      this.dispatch({
        type: 'REMOVE_PENDING_UPDATE',
        payload: updateId
      });
    }
  }

  // Force immediate sync
  public forceSync(): void {
    this.performSync();
  }

  // Get connection status
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Update configuration
  public updateConfig(newConfig: Partial<RealTimeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart sync with new interval if changed
    if (newConfig.syncInterval) {
      this.startSync();
    }
  }

  // Cleanup
  public cleanup(): void {
    this.stopSync();
    this.dispatch = null;
    this.onConnectionChange = null;
    this.retryCount = 0;
    this.isConnected = false;
  }
}

// Export singleton instance
export const realTimeService = RealTimeService.getInstance();
