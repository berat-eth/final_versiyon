const express = require('express');
const router = express.Router();
const UserDataLogger = require('../services/user-data-logger');

const userDataLogger = new UserDataLogger();

// Kullanıcı verilerini kaydet
router.post('/save-user', async (req, res) => {
  try {
    const { userId, name, surname } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    const result = await userDataLogger.saveUserData(userId, name, surname);
    
    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı aktivitesini kaydet
router.post('/log-activity', async (req, res) => {
  try {
    const { userId, activityType, activityData } = req.body;

    if (!userId || !activityType) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID ve aktivite türü gerekli'
      });
    }

    const result = await userDataLogger.logUserActivity(userId, activityType, activityData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Aktivite başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Aktivite kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Aktivite kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Tüm kullanıcı verilerini getir
router.get('/users', (req, res) => {
  try {
    const usersData = userDataLogger.getUsersData();
    res.json({
      success: true,
      data: usersData
    });
  } catch (error) {
    console.error('❌ Kullanıcı verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri getirilemedi'
    });
  }
});

// Tüm aktivite verilerini getir
router.get('/activities', (req, res) => {
  try {
    const activitiesData = userDataLogger.getActivitiesData();
    res.json({
      success: true,
      data: activitiesData
    });
  } catch (error) {
    console.error('❌ Aktivite verileri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri getirilemedi'
    });
  }
});

// Belirli kullanıcının aktivitelerini getir
router.get('/user-activities/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const activities = userDataLogger.getUserActivities(parseInt(userId));
    
    res.json({
      success: true,
      data: {
        userId: parseInt(userId),
        activities: activities
      }
    });
  } catch (error) {
    console.error('❌ Kullanıcı aktiviteleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı aktiviteleri getirilemedi'
    });
  }
});

// Günlük rapor oluştur
router.get('/daily-report/:date?', (req, res) => {
  try {
    const { date } = req.params;
    const report = userDataLogger.generateDailyReport(date);
    
    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('❌ Günlük rapor oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Günlük rapor oluşturulamadı'
    });
  }
});

// Veri dosyalarını indir
router.get('/download/users', (req, res) => {
  try {
    const usersData = userDataLogger.getUsersData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=users.json');
    res.json(usersData);
  } catch (error) {
    console.error('❌ Kullanıcı verileri indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı verileri indirilemedi'
    });
  }
});

router.get('/download/activities', (req, res) => {
  try {
    const activitiesData = userDataLogger.getActivitiesData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=user-activities.json');
    res.json(activitiesData);
  } catch (error) {
    console.error('❌ Aktivite verileri indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Aktivite verileri indirilemedi'
    });
  }
});

// Veri dosyalarını temizle (sadece admin)
router.delete('/clear-data', (req, res) => {
  try {
    const { adminKey } = req.body;
    
    // Basit admin kontrolü (gerçek uygulamada daha güvenli olmalı)
    if (adminKey !== 'admin123') {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    const result = userDataLogger.clearAllData();
    
    if (result) {
      res.json({
        success: true,
        message: 'Tüm veriler temizlendi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Veriler temizlenemedi'
      });
    }
  } catch (error) {
    console.error('❌ Veri temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Veriler temizlenemedi'
    });
  }
});

module.exports = router;
