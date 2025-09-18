const express = require('express');
const router = express.Router();

module.exports = (poolWrapper, recommendationService, authenticateTenant) => {
	// Event log endpoint
	router.post('/event', authenticateTenant, async (req, res) => {
		try {
			const { userId, eventType, productId, eventValue, searchQuery, filterDetails } = req.body;
			if (!userId || !eventType) {
				return res.status(400).json({ success: false, message: 'userId ve eventType zorunlu' });
			}
			const recs = await recommendationService.recordEventAndRefresh(req.tenant.id, parseInt(userId), {
				productId, eventType, eventValue, searchQuery, filterDetails
			});
			res.json({ success: true, data: { recommendations: recs } });
		} catch (error) {
			console.error('❌ Event log error:', error);
			res.status(500).json({ success: false, message: 'Event kaydedilemedi' });
		}
	});

	// Get recommendations
	router.get('/user/:userId', authenticateTenant, async (req, res) => {
		try {
			const { userId } = req.params;
			const recs = await recommendationService.generateRecommendations(req.tenant.id, parseInt(userId), parseInt(req.query.limit || '20'));
			res.json({ success: true, data: { recommendations: recs } });
		} catch (error) {
			console.error('❌ Get recommendations error:', error);
			res.status(500).json({ success: false, message: 'Öneriler alınamadı' });
		}
	});

	// Get user profile (current stored values)
	router.get('/user/:userId/profile', authenticateTenant, async (req, res) => {
		try {
			const { userId } = req.params;
			const [rows] = await poolWrapper.execute(
				`SELECT interests, brandPreferences, avgPriceMin, avgPriceMax, discountAffinity, lastActive, totalEvents
				 FROM user_profiles WHERE userId = ? AND tenantId = ? LIMIT 1`,
				[parseInt(userId), req.tenant.id]
			);
			if (!rows.length) return res.json({ success: true, data: null });
			const r = rows[0];
			const profile = {
				interests: typeof r.interests === 'string' ? JSON.parse(r.interests || '{}') : r.interests || {},
				brands: typeof r.brandPreferences === 'string' ? JSON.parse(r.brandPreferences || '{}') : r.brandPreferences || {},
				avgPriceMin: r.avgPriceMin,
				avgPriceMax: r.avgPriceMax,
				discountAffinity: r.discountAffinity,
				lastActive: r.lastActive,
				totalEvents: r.totalEvents
			};
			res.json({ success: true, data: { profile } });
		} catch (error) {
			console.error('❌ Get profile error:', error);
			res.status(500).json({ success: false, message: 'Profil alınamadı' });
		}
	});

	// Rebuild profile
	router.post('/user/:userId/rebuild-profile', authenticateTenant, async (req, res) => {
		try {
			const { userId } = req.params;
			const profile = await recommendationService.updateUserProfile(req.tenant.id, parseInt(userId));
			res.json({ success: true, data: { profile } });
		} catch (error) {
			console.error('❌ Rebuild profile error:', error);
			res.status(500).json({ success: false, message: 'Profil güncellenemedi' });
		}
	});

	return router;
};


