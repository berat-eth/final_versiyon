const fs = require('fs');
const path = require('path');

class UserSpecificDataLogger {
  constructor() {
    this.dataDir = path.join(__dirname, '../data/users');
    this.ensureDataDirectory();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  // Kullanıcı klasörü oluştur
  createUserDirectory(userId) {
    const userDir = path.join(this.dataDir, `user_${userId}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    return userDir;
  }

  // Kullanıcı profil verilerini kaydet
  async saveUserProfile(userId, userData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const profileFile = path.join(userDir, 'profile.json');
      
      const profileData = {
        userId: userId,
        name: userData.name || '',
        surname: userData.surname || '',
        email: userData.email || '',
        phone: userData.phone || '',
        firstSeen: userData.firstSeen || new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalSessions: userData.totalSessions || 0,
        totalActivities: userData.totalActivities || 0,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(profileFile, JSON.stringify(profileData, null, 2));
      console.log(`✅ User profile saved: user_${userId}/profile.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving user profile for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı aktivitelerini kaydet
  async saveUserActivity(userId, activityData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const activitiesFile = path.join(userDir, 'activities.json');
      
      let activities = [];
      if (fs.existsSync(activitiesFile)) {
        const data = fs.readFileSync(activitiesFile, 'utf8');
        activities = JSON.parse(data);
      }

      const activity = {
        id: Date.now() + Math.random(),
        ...activityData,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0]
      };

      activities.push(activity);

      // Son 10000 aktiviteyi sakla
      if (activities.length > 10000) {
        activities = activities.slice(-10000);
      }

      fs.writeFileSync(activitiesFile, JSON.stringify(activities, null, 2));
      console.log(`📝 Activity saved: user_${userId}/activities.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving activity for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı davranış analizi verilerini kaydet
  async saveBehaviorData(userId, behaviorData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const behaviorFile = path.join(userDir, 'behavior.json');
      
      let behavior = [];
      if (fs.existsSync(behaviorFile)) {
        const data = fs.readFileSync(behaviorFile, 'utf8');
        behavior = JSON.parse(data);
      }

      const behaviorEntry = {
        id: Date.now() + Math.random(),
        ...behaviorData,
        timestamp: new Date().toISOString()
      };

      behavior.push(behaviorEntry);

      // Son 5000 davranış verisini sakla
      if (behavior.length > 5000) {
        behavior = behavior.slice(-5000);
      }

      fs.writeFileSync(behaviorFile, JSON.stringify(behavior, null, 2));
      console.log(`🎯 Behavior data saved: user_${userId}/behavior.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving behavior data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı e-ticaret verilerini kaydet
  async saveEcommerceData(userId, ecommerceData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const ecommerceFile = path.join(userDir, 'ecommerce.json');
      
      let ecommerce = [];
      if (fs.existsSync(ecommerceFile)) {
        const data = fs.readFileSync(ecommerceFile, 'utf8');
        ecommerce = JSON.parse(data);
      }

      const ecommerceEntry = {
        id: Date.now() + Math.random(),
        ...ecommerceData,
        timestamp: new Date().toISOString()
      };

      ecommerce.push(ecommerceEntry);

      // Son 3000 e-ticaret verisini sakla
      if (ecommerce.length > 3000) {
        ecommerce = ecommerce.slice(-3000);
      }

      fs.writeFileSync(ecommerceFile, JSON.stringify(ecommerce, null, 2));
      console.log(`🛒 Ecommerce data saved: user_${userId}/ecommerce.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving ecommerce data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı performans verilerini kaydet
  async savePerformanceData(userId, performanceData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const performanceFile = path.join(userDir, 'performance.json');
      
      let performance = [];
      if (fs.existsSync(performanceFile)) {
        const data = fs.readFileSync(performanceFile, 'utf8');
        performance = JSON.parse(data);
      }

      const performanceEntry = {
        id: Date.now() + Math.random(),
        ...performanceData,
        timestamp: new Date().toISOString()
      };

      performance.push(performanceEntry);

      // Son 2000 performans verisini sakla
      if (performance.length > 2000) {
        performance = performance.slice(-2000);
      }

      fs.writeFileSync(performanceFile, JSON.stringify(performance, null, 2));
      console.log(`⚡ Performance data saved: user_${userId}/performance.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving performance data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı sosyal medya verilerini kaydet
  async saveSocialData(userId, socialData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const socialFile = path.join(userDir, 'social.json');
      
      let social = [];
      if (fs.existsSync(socialFile)) {
        const data = fs.readFileSync(socialFile, 'utf8');
        social = JSON.parse(data);
      }

      const socialEntry = {
        id: Date.now() + Math.random(),
        ...socialData,
        timestamp: new Date().toISOString()
      };

      social.push(socialEntry);

      // Son 2000 sosyal medya verisini sakla
      if (social.length > 2000) {
        social = social.slice(-2000);
      }

      fs.writeFileSync(socialFile, JSON.stringify(social, null, 2));
      console.log(`📱 Social data saved: user_${userId}/social.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving social data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı istatistiklerini kaydet
  async saveUserStats(userId, statsData) {
    try {
      const userDir = this.createUserDirectory(userId);
      const statsFile = path.join(userDir, 'stats.json');
      
      const stats = {
        userId: userId,
        ...statsData,
        lastUpdated: new Date().toISOString()
      };

      fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));
      console.log(`📊 Stats saved: user_${userId}/stats.json`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving stats for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı verilerini oku
  async getUserData(userId) {
    try {
      const userDir = path.join(this.dataDir, `user_${userId}`);
      
      if (!fs.existsSync(userDir)) {
        return null;
      }

      const data = {
        profile: null,
        activities: [],
        behavior: [],
        ecommerce: [],
        performance: [],
        social: [],
        stats: null
      };

      // Profil verilerini oku
      const profileFile = path.join(userDir, 'profile.json');
      if (fs.existsSync(profileFile)) {
        data.profile = JSON.parse(fs.readFileSync(profileFile, 'utf8'));
      }

      // Aktivite verilerini oku
      const activitiesFile = path.join(userDir, 'activities.json');
      if (fs.existsSync(activitiesFile)) {
        data.activities = JSON.parse(fs.readFileSync(activitiesFile, 'utf8'));
      }

      // Davranış verilerini oku
      const behaviorFile = path.join(userDir, 'behavior.json');
      if (fs.existsSync(behaviorFile)) {
        data.behavior = JSON.parse(fs.readFileSync(behaviorFile, 'utf8'));
      }

      // E-ticaret verilerini oku
      const ecommerceFile = path.join(userDir, 'ecommerce.json');
      if (fs.existsSync(ecommerceFile)) {
        data.ecommerce = JSON.parse(fs.readFileSync(ecommerceFile, 'utf8'));
      }

      // Performans verilerini oku
      const performanceFile = path.join(userDir, 'performance.json');
      if (fs.existsSync(performanceFile)) {
        data.performance = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));
      }

      // Sosyal medya verilerini oku
      const socialFile = path.join(userDir, 'social.json');
      if (fs.existsSync(socialFile)) {
        data.social = JSON.parse(fs.readFileSync(socialFile, 'utf8'));
      }

      // İstatistik verilerini oku
      const statsFile = path.join(userDir, 'stats.json');
      if (fs.existsSync(statsFile)) {
        data.stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      }

      return data;
    } catch (error) {
      console.error(`❌ Error reading user data for ${userId}:`, error);
      return null;
    }
  }

  // Tüm kullanıcıları listele
  async getAllUsers() {
    try {
      const users = [];
      const userDirs = fs.readdirSync(this.dataDir);
      
      for (const userDir of userDirs) {
        if (userDir.startsWith('user_')) {
          const userId = parseInt(userDir.replace('user_', ''));
          const userData = await this.getUserData(userId);
          if (userData && userData.profile) {
            users.push({
              userId: userId,
              profile: userData.profile,
              totalActivities: userData.activities.length,
              totalBehavior: userData.behavior.length,
              totalEcommerce: userData.ecommerce.length,
              totalPerformance: userData.performance.length,
              totalSocial: userData.social.length
            });
          }
        }
      }
      
      return users;
    } catch (error) {
      console.error('❌ Error getting all users:', error);
      return [];
    }
  }

  // Kullanıcı verilerini sil
  async deleteUserData(userId) {
    try {
      const userDir = path.join(this.dataDir, `user_${userId}`);
      if (fs.existsSync(userDir)) {
        fs.rmSync(userDir, { recursive: true, force: true });
        console.log(`🗑️ User data deleted: user_${userId}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error deleting user data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı verilerini yedekle
  async backupUserData(userId) {
    try {
      const userDir = path.join(this.dataDir, `user_${userId}`);
      const backupDir = path.join(this.dataDir, `backup_user_${userId}_${Date.now()}`);
      
      if (fs.existsSync(userDir)) {
        fs.cpSync(userDir, backupDir, { recursive: true });
        console.log(`💾 User data backed up: ${backupDir}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error backing up user data for ${userId}:`, error);
      return false;
    }
  }

  // Kullanıcı verilerini temizle (eski verileri sil)
  async cleanupUserData(userId, daysToKeep = 30) {
    try {
      const userDir = path.join(this.dataDir, `user_${userId}`);
      if (!fs.existsSync(userDir)) return false;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const files = ['activities.json', 'behavior.json', 'ecommerce.json', 'performance.json', 'social.json'];
      
      for (const file of files) {
        const filePath = path.join(userDir, file);
        if (fs.existsSync(filePath)) {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const filteredData = data.filter(item => {
            const itemDate = new Date(item.timestamp || item.date || item.createdAt);
            return itemDate >= cutoffDate;
          });
          fs.writeFileSync(filePath, JSON.stringify(filteredData, null, 2));
        }
      }

      console.log(`🧹 User data cleaned up: user_${userId} (kept last ${daysToKeep} days)`);
      return true;
    } catch (error) {
      console.error(`❌ Error cleaning up user data for ${userId}:`, error);
      return false;
    }
  }
}

module.exports = UserSpecificDataLogger;
