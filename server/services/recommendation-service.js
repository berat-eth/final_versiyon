const TIME_DECAY_HALF_LIFE_DAYS = 14;
const DECAY_LAMBDA = Math.log(2) / (TIME_DECAY_HALF_LIFE_DAYS * 24 * 60 * 60); // per second

// Etkinlik ağırlıkları
const EVENT_WEIGHTS = {
	view: 1,
	click: 2,
	add_to_cart: 5,
	purchase: 10,
	favorite: 4,
	search: 1,
	filter: 1
};

class RecommendationService {
	constructor(poolWrapper) {
		this.pool = poolWrapper;
	}

	// Zaman bozunması faktörü
	static getTimeDecayFactor(eventTimestamp) {
		const eventTime = new Date(eventTimestamp).getTime() / 1000;
		const now = Date.now() / 1000;
		const deltaSec = Math.max(0, now - eventTime);
		return Math.exp(-DECAY_LAMBDA * deltaSec);
	}

	// Popüler ürünleri getir (tenant bazlı)
	async getPopularProducts(tenantId, limit = 20) {
		const [rows] = await this.pool.execute(
			`SELECT p.id as productId, p.category, p.brand, p.price,
				COALESCE(oiCount.cnt, 0) as orderCount,
				COALESCE(evCount.cnt, 0) as eventCount
			 FROM products p
			 LEFT JOIN (
			   SELECT productId, COUNT(*) cnt FROM order_items WHERE tenantId = ? GROUP BY productId
			 ) oiCount ON oiCount.productId = p.id
			 LEFT JOIN (
			   SELECT productId, COUNT(*) cnt FROM user_events WHERE tenantId = ? GROUP BY productId
			 ) evCount ON evCount.productId = p.id
			 WHERE p.tenantId = ? AND p.stock > 0
			 ORDER BY (COALESCE(oiCount.cnt,0) * 2 + COALESCE(evCount.cnt,0)) DESC, p.lastUpdated DESC
			 LIMIT ?`,
			[tenantId, tenantId, tenantId, limit]
		);
		return rows;
	}

	// Kullanıcı profilini güncelle (interests, brand prefs, price band, discount affinity)
	async updateUserProfile(tenantId, userId) {
		// Son 90 güne bakarak profil çıkar
		const [events] = await this.pool.execute(
			`SELECT e.*, p.category, p.brand, p.price
			 FROM user_events e
			 LEFT JOIN products p ON p.id = e.productId
			 WHERE e.tenantId = ? AND e.userId = ? AND e.createdAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
			[tenantId, userId]
		);

		if (!events || events.length === 0) {
			// Boş profil başlangıcı
			await this.pool.execute(
				`INSERT INTO user_profiles (userId, tenantId, interests, brandPreferences, avgPriceMin, avgPriceMax, discountAffinity, lastActive, totalEvents)
				 VALUES (?, ?, JSON_OBJECT(), JSON_OBJECT(), NULL, NULL, 0, NOW(), 0)
				 ON DUPLICATE KEY UPDATE lastActive = NOW()`,
				[userId, tenantId]
			);
			return { interests: {}, brands: {}, avg: null, discountAffinity: 0 };
		}

		const categoryScores = {};
		const brandScores = {};
		const prices = [];
		let discountSignals = 0;
		let totalEvents = 0;

		for (const ev of events) {
			const weight = EVENT_WEIGHTS[ev.eventType] || 1;
			const decay = RecommendationService.getTimeDecayFactor(ev.createdAt);
			const score = weight * decay * (ev.eventValue || 1);
			totalEvents += 1;

			if (ev.category) categoryScores[ev.category] = (categoryScores[ev.category] || 0) + score;
			if (ev.brand) brandScores[ev.brand] = (brandScores[ev.brand] || 0) + score;
			if (ev.price != null) prices.push(Number(ev.price));

			// İndirim/ kampanya etkileşimi sinyali
			if (ev.eventType === 'purchase' || ev.eventType === 'add_to_cart' || ev.eventType === 'click' || ev.eventType === 'view') {
				if (ev.filterDetails) {
					try {
						const fd = typeof ev.filterDetails === 'string' ? JSON.parse(ev.filterDetails) : ev.filterDetails;
						if (fd && (fd.discountOnly || fd.maxPrice)) {
							discountSignals += 1;
						}
					} catch (_) { /* ignore parse errors */ }
				}
			}
		}

		// Fiyat aralığı (orta yüzde 50 bandı)
		prices.sort((a, b) => a - b);
		const q = (arr, p) => arr.length ? arr[Math.floor((arr.length - 1) * p)] : null;
		const p25 = q(prices, 0.25);
		const p75 = q(prices, 0.75);
		const avgPriceMin = p25 != null ? p25 : null;
		const avgPriceMax = p75 != null ? p75 : null;
		const discountAffinity = totalEvents > 0 ? Math.min(1, discountSignals / totalEvents) : 0;

		await this.pool.execute(
			`INSERT INTO user_profiles (userId, tenantId, interests, brandPreferences, avgPriceMin, avgPriceMax, discountAffinity, lastActive, totalEvents)
			 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?)
			 ON DUPLICATE KEY UPDATE interests = VALUES(interests), brandPreferences = VALUES(brandPreferences),
			 avgPriceMin = VALUES(avgPriceMin), avgPriceMax = VALUES(avgPriceMax), discountAffinity = VALUES(discountAffinity),
			 lastActive = NOW(), totalEvents = VALUES(totalEvents)`,
			[
				userId,
				tenantId,
				JSON.stringify(categoryScores),
				JSON.stringify(brandScores),
				avgPriceMin,
				avgPriceMax,
				discountAffinity,
				totalEvents
			]
		);

		return { interests: categoryScores, brands: brandScores, avg: { min: avgPriceMin, max: avgPriceMax }, discountAffinity };
	}

	// Basit hibrit öneri üretimi
	async generateRecommendations(tenantId, userId, limit = 20) {
		// Profil al
		const [profRows] = await this.pool.execute(
			`SELECT * FROM user_profiles WHERE userId = ? AND tenantId = ? LIMIT 1`,
			[userId, tenantId]
		);

		if (!profRows.length) {
			const popular = await this.getPopularProducts(tenantId, limit);
			await this.pool.execute(
				`INSERT INTO recommendations (userId, tenantId, recommendedProducts) VALUES (?, ?, ?)`,
				[userId, tenantId, JSON.stringify(popular.map(p => p.productId))]
			);
			return popular;
		}

		const profile = profRows[0];
		const interests = profile.interests ? (typeof profile.interests === 'string' ? JSON.parse(profile.interests) : profile.interests) : {};
		const brandPrefs = profile.brandPreferences ? (typeof profile.brandPreferences === 'string' ? JSON.parse(profile.brandPreferences) : profile.brandPreferences) : {};

		// İçerik bazlı filtreleme: kategori/brand eşleşmesi ve fiyat bandı
		const [candidates] = await this.pool.execute(
			`SELECT id as productId, category, brand, price FROM products WHERE tenantId = ? AND stock > 0 LIMIT 1000`,
			[tenantId]
		);

		const scoreOf = (prod) => {
			let s = 0;
			if (interests[prod.category]) s += interests[prod.category] * 1.0;
			if (brandPrefs[prod.brand]) s += brandPrefs[prod.brand] * 0.8;
			// Fiyat yakınlığı (opsiyonel, band içine bonus)
			if (profile.avgPriceMin != null && profile.avgPriceMax != null) {
				if (prod.price >= Number(profile.avgPriceMin) && prod.price <= Number(profile.avgPriceMax)) s += 1.0;
			}
			return s;
		};

		const scored = candidates
			.map(p => ({ ...p, _score: scoreOf(p) }))
			.sort((a, b) => b._score - a._score);

		let top = scored.filter(x => x._score > 0).slice(0, limit);
		if (top.length < limit) {
			const popular = await this.getPopularProducts(tenantId, limit - top.length);
			const popIds = new Set(top.map(t => t.productId));
			for (const p of popular) {
				if (!popIds.has(p.productId) && top.length < limit) top.push(p);
			}
		}

		await this.pool.execute(
			`INSERT INTO recommendations (userId, tenantId, recommendedProducts) VALUES (?, ?, ?)
			 ON DUPLICATE KEY UPDATE recommendedProducts = VALUES(recommendedProducts), generatedAt = NOW()`,
			[userId, tenantId, JSON.stringify(top.map(p => p.productId))]
		);

		return top;
	}

	// Event kaydet ve zincir reaksiyon: profil + öneri güncelle
	async recordEventAndRefresh(tenantId, userId, payload) {
		const { productId = null, eventType, eventValue = 1, searchQuery = null, filterDetails = null } = payload;
		await this.pool.execute(
			`INSERT INTO user_events (tenantId, userId, productId, eventType, eventValue, searchQuery, filterDetails)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			[tenantId, userId, productId || null, eventType, eventValue, searchQuery || null, filterDetails ? JSON.stringify(filterDetails) : null]
		);
		await this.updateUserProfile(tenantId, userId);
		const recs = await this.generateRecommendations(tenantId, userId, 20);
		return recs;
	}
}

module.exports = { RecommendationService, EVENT_WEIGHTS };


