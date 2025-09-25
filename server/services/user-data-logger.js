const fs = require('fs');
const path = require('path');

class UserDataLogger {
  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.activitiesFile = path.join(this.dataDir, 'user-activities.json');
    
    // Veri klasörünü oluştur
    this.ensureDataDirectory();
    
    // JSON dosyalarını başlat
    this.initializeFiles();
  }

  ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  initializeFiles() {
    // Kullanıcılar dosyasını başlat
    if (!fs.existsSync(this.usersFile)) {
      fs.writeFileSync(this.usersFile, JSON.stringify({ users: [] }, null, 2));
    }

    // Aktivite dosyasını başlat
    if (!fs.existsSync(this.activitiesFile)) {
      fs.writeFileSync(this.activitiesFile, JSON.stringify({ activities: [] }, null, 2));
    }
  }

  // Kullanıcı verilerini kaydet (sadece ad, soyad, ID)
  async saveUserData(userId, name, surname) {
    try {
      const usersData = this.loadUsersData();
      
      // Kullanıcı zaten var mı kontrol et
      const existingUserIndex = usersData.users.findIndex(user => user.id === userId);
      
      const userData = {
        id: userId,
        name: name || '',
        surname: surname || '',
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString()
      };

      if (existingUserIndex >= 0) {
        // Kullanıcı varsa sadece lastSeen'i güncelle
        usersData.users[existingUserIndex].lastSeen = userData.lastSeen;
        if (name) usersData.users[existingUserIndex].name = name;
        if (surname) usersData.users[existingUserIndex].surname = surname;
      } else {
        // Yeni kullanıcı ekle
        usersData.users.push(userData);
      }

      this.saveUsersData(usersData);
      console.log(`✅ Kullanıcı verisi kaydedildi: ${userId} - ${name} ${surname}`);
      
      return true;
    } catch (error) {
      console.error('❌ Kullanıcı verisi kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı aktivitesini kaydet
  async logUserActivity(userId, activityType, activityData = {}) {
    try {
      const activitiesData = this.loadActivitiesData();
      
      const activity = {
        id: Date.now() + Math.random(), // Benzersiz ID
        userId: userId,
        activityType: activityType,
        activityData: activityData,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD formatında
        time: new Date().toTimeString().split(' ')[0] // HH:MM:SS formatında
      };

      activitiesData.activities.push(activity);

      // Son 10000 aktiviteyi sakla (performans için)
      if (activitiesData.activities.length > 10000) {
        activitiesData.activities = activitiesData.activities.slice(-10000);
      }

      this.saveActivitiesData(activitiesData);
      console.log(`📝 Aktivite kaydedildi: ${userId} - ${activityType}`);
      
      return true;
    } catch (error) {
      console.error('❌ Aktivite kaydedilemedi:', error);
      return false;
    }
  }

  // Kullanıcı verilerini yükle
  loadUsersData() {
    try {
      const data = fs.readFileSync(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Kullanıcı verileri yüklenemedi:', error);
      return { users: [] };
    }
  }

  // Aktivite verilerini yükle
  loadActivitiesData() {
    try {
      const data = fs.readFileSync(this.activitiesFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Aktivite verileri yüklenemedi:', error);
      return { activities: [] };
    }
  }

  // Kullanıcı verilerini kaydet
  saveUsersData(data) {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Kullanıcı verileri kaydedilemedi:', error);
    }
  }

  // Aktivite verilerini kaydet
  saveActivitiesData(data) {
    try {
      fs.writeFileSync(this.activitiesFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Aktivite verileri kaydedilemedi:', error);
    }
  }

  // Kullanıcı verilerini getir
  getUsersData() {
    return this.loadUsersData();
  }

  // Aktivite verilerini getir
  getActivitiesData() {
    return this.loadActivitiesData();
  }

  // Belirli kullanıcının aktivitelerini getir
  getUserActivities(userId) {
    const activitiesData = this.loadActivitiesData();
    return activitiesData.activities.filter(activity => activity.userId === userId);
  }

  // Günlük aktivite raporu oluştur
  generateDailyReport(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const activitiesData = this.loadActivitiesData();
    const usersData = this.loadUsersData();
    
    const dailyActivities = activitiesData.activities.filter(activity => 
      activity.date === targetDate
    );

    const report = {
      date: targetDate,
      totalActivities: dailyActivities.length,
      uniqueUsers: [...new Set(dailyActivities.map(a => a.userId))].length,
      activitiesByType: {},
      userActivities: {}
    };

    // Aktivite türlerine göre grupla
    dailyActivities.forEach(activity => {
      if (!report.activitiesByType[activity.activityType]) {
        report.activitiesByType[activity.activityType] = 0;
      }
      report.activitiesByType[activity.activityType]++;

      // Kullanıcı aktivitelerini grupla
      if (!report.userActivities[activity.userId]) {
        const user = usersData.users.find(u => u.id === activity.userId);
        report.userActivities[activity.userId] = {
          name: user ? `${user.name} ${user.surname}`.trim() : 'Bilinmeyen Kullanıcı',
          activities: []
        };
      }
      report.userActivities[activity.userId].activities.push(activity);
    });

    return report;
  }

  // Veri dosyalarını temizle (isteğe bağlı)
  clearAllData() {
    try {
      fs.writeFileSync(this.usersFile, JSON.stringify({ users: [] }, null, 2));
      fs.writeFileSync(this.activitiesFile, JSON.stringify({ activities: [] }, null, 2));
      console.log('🗑️ Tüm veriler temizlendi');
      return true;
    } catch (error) {
      console.error('❌ Veriler temizlenemedi:', error);
      return false;
    }
  }
}

module.exports = UserDataLogger;
