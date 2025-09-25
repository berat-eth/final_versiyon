import { setupDatabase } from './database-setup';
import { getDatabase } from './database';

// Database cleanup function
const cleanupDatabase = async () => {
  try {
    console.log('🧹 Cleaning up database connections...');
    const database = await getDatabase();
    
    // Close any open connections and clean up
    database.closeSync();
    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.warn('Warning: Database cleanup failed:', error);
  }
};

// Error recovery function
const recoverFromDatabaseError = async (error: any) => {
  console.log('🔄 Attempting database error recovery...');
  
  try {
    // Clean up existing connections
    await cleanupDatabase();
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Try to reinitialize
    await setupDatabase();
    console.log('✅ Database recovery successful');
    return true;
  } catch (recoveryError) {
    console.error('❌ Database recovery failed:', recoveryError);
    return false;
  }
};

export const initializeDatabase = async () => {
  const maxRetries = 3;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`🚀 Initializing database (attempt ${attempt}/${maxRetries})...`);
      
      await setupDatabase();
      
      console.log('✅ Database initialization completed successfully!');
      return true;
      
    } catch (error: any) {
      console.error(`❌ Database initialization attempt ${attempt} failed:`, error);
      
      // Check if it's a table lock error
      if (error.message && error.message.includes('database table is locked')) {
        console.log('🔒 Detected table lock error, attempting recovery...');
        
        const recovered = await recoverFromDatabaseError(error);
        if (recovered) {
          console.log('✅ Database recovered from lock error');
          return true;
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt >= maxRetries) {
        console.error('❌ All database initialization attempts failed');
        throw error;
      }
      
      // Wait before retrying
      const waitTime = attempt * 2000; // Exponential backoff
      console.log(`⏳ Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Database initialization failed after all retry attempts');
};
