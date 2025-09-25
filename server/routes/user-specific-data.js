const express = require('express');
const router = express.Router();
const UserSpecificDataLogger = require('../services/UserSpecificDataLogger');

const userDataLogger = new UserSpecificDataLogger();

// Kullanıcı profil verilerini kaydet
router.post('/save-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = req.body;

    const result = await userDataLogger.saveUserProfile(parseInt(userId), userData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı profili başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Kullanıcı profili kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı profili kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı aktivitesini kaydet
router.post('/save-activity/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const activityData = req.body;

    const result = await userDataLogger.saveUserActivity(parseInt(userId), activityData);
    
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

// Kullanıcı davranış verilerini kaydet
router.post('/save-behavior/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const behaviorData = req.body;

    const result = await userDataLogger.saveBehaviorData(parseInt(userId), behaviorData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Davranış verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Davranış verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Davranış verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı e-ticaret verilerini kaydet
router.post('/save-ecommerce/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const ecommerceData = req.body;

    const result = await userDataLogger.saveEcommerceData(parseInt(userId), ecommerceData);
    
    if (result) {
      res.json({
        success: true,
        message: 'E-ticaret verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'E-ticaret verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ E-ticaret verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı performans verilerini kaydet
router.post('/save-performance/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const performanceData = req.body;

    const result = await userDataLogger.savePerformanceData(parseInt(userId), performanceData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Performans verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Performans verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Performans verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı sosyal medya verilerini kaydet
router.post('/save-social/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const socialData = req.body;

    const result = await userDataLogger.saveSocialData(parseInt(userId), socialData);
    
    if (result) {
      res.json({
        success: true,
        message: 'Sosyal medya verisi başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Sosyal medya verisi kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ Sosyal medya verisi kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı istatistiklerini kaydet
router.post('/save-stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const statsData = req.body;

    const result = await userDataLogger.saveUserStats(parseInt(userId), statsData);
    
    if (result) {
      res.json({
        success: true,
        message: 'İstatistikler başarıyla kaydedildi'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'İstatistikler kaydedilemedi'
      });
    }
  } catch (error) {
    console.error('❌ İstatistik kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı verilerini getir
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await userDataLogger.getUserData(parseInt(userId));
    
    if (userData) {
      res.json({
        success: true,
        data: userData
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı verisi bulunamadı'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Tüm kullanıcıları listele
router.get('/users', async (req, res) => {
  try {
    const users = await userDataLogger.getAllUsers();
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('❌ Kullanıcı listesi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı verilerini indir (ZIP olarak)
router.get('/download/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const userData = await userDataLogger.getUserData(parseInt(userId));
    
    if (userData) {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=user_${userId}_data.json`);
      res.json(userData);
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı verisi bulunamadı'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi indirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı verilerini yedekle
router.post('/backup/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userDataLogger.backupUserData(parseInt(userId));
    
    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı verisi başarıyla yedeklendi'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı verisi bulunamadı'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi yedekleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı verilerini temizle
router.post('/cleanup/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { daysToKeep = 30 } = req.body;
    
    const result = await userDataLogger.cleanupUserData(parseInt(userId), daysToKeep);
    
    if (result) {
      res.json({
        success: true,
        message: `Kullanıcı verisi temizlendi (son ${daysToKeep} gün korundu)`
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı verisi bulunamadı'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi temizleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

// Kullanıcı verilerini sil
router.delete('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await userDataLogger.deleteUserData(parseInt(userId));
    
    if (result) {
      res.json({
        success: true,
        message: 'Kullanıcı verisi başarıyla silindi'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı verisi bulunamadı'
      });
    }
  } catch (error) {
    console.error('❌ Kullanıcı verisi silme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Sunucu hatası'
    });
  }
});

module.exports = router;
