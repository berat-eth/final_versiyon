export interface UserLevel {
  id: string;
  name: string;
  displayName: string;
  minExp: number;
  maxExp: number;
  color: string;
  icon: string;
  benefits: string[];
  multiplier: number;
}

export interface UserLevelProgress {
  currentLevel: UserLevel;
  nextLevel: UserLevel | null;
  currentExp: number;
  expToNextLevel: number;
  progressPercentage: number;
  totalExp: number;
  levelUpRewards: LevelUpReward[];
}

export interface LevelUpReward {
  type: 'discount' | 'gift' | 'points' | 'badge';
  value: number;
  description: string;
  icon: string;
}

export interface ExpTransaction {
  id: string;
  userId: string;
  source: 'purchase' | 'invitation' | 'social_share' | 'review' | 'login' | 'special';
  amount: number;
  description: string;
  timestamp: string;
  orderId?: string;
  productId?: string;
}

export class UserLevelSystem {
  private static readonly LEVELS: UserLevel[] = [
    {
      id: 'bronze',
      name: 'bronze',
      displayName: 'Bronz',
      minExp: 0,
      maxExp: 1500,
      color: '#CD7F32',
      icon: 'medal',
      benefits: [
        'Temel indirimler',
        'Ücretsiz kargo',
        'Özel ürün erişimi'
      ],
      multiplier: 1.0
    },
    {
      id: 'iron',
      name: 'iron',
      displayName: 'Demir',
      minExp: 1500,
      maxExp: 4500, // 1500 * 3
      color: '#C0C0C0',
      icon: 'shield',
      benefits: [
        'Bronz faydaları',
        '%5 ekstra indirim',
        'Öncelikli destek',
        'Özel kampanyalar'
      ],
      multiplier: 1.2
    },
    {
      id: 'gold',
      name: 'gold',
      displayName: 'Altın',
      minExp: 4500,
      maxExp: 10500, // 4500 * 2.33
      color: '#FFD700',
      icon: 'star',
      benefits: [
        'Demir faydaları',
        '%10 ekstra indirim',
        'Hediye paketleri',
        'VIP müşteri hizmetleri',
        'Erken erişim'
      ],
      multiplier: 1.5
    },
    {
      id: 'platinum',
      name: 'platinum',
      displayName: 'Platin',
      minExp: 10500,
      maxExp: 22500, // 10500 * 2.14
      color: '#E5E4E2',
      icon: 'diamond',
      benefits: [
        'Altın faydaları',
        '%15 ekstra indirim',
        'Özel ürün koleksiyonları',
        'Kişisel alışveriş danışmanı',
        'Ücretsiz hediye paketleri'
      ],
      multiplier: 2.0
    },
    {
      id: 'diamond',
      name: 'diamond',
      displayName: 'Elmas',
      minExp: 22500,
      maxExp: Infinity,
      color: '#B9F2FF',
      icon: 'diamond',
      benefits: [
        'Platin faydaları',
        '%15 ekstra indirim',
        'Sınırsız ücretsiz kargo',
        'Özel etkinlik davetleri',
        'Kişisel stil danışmanı',
        'Sınırlı ürün erişimi'
      ],
      multiplier: 3.0
    }
  ];

  // Kullanıcının mevcut seviyesini hesapla
  static calculateUserLevel(totalExp: number): UserLevelProgress {
    const currentLevel = this.getLevelByExp(totalExp);
    const nextLevel = this.getNextLevel(currentLevel);
    
    const expToNextLevel = nextLevel ? nextLevel.minExp - totalExp : 0;
    const progressPercentage = nextLevel 
      ? Math.min(100, ((totalExp - currentLevel.minExp) / (nextLevel.minExp - currentLevel.minExp)) * 100)
      : 100;

    return {
      currentLevel,
      nextLevel,
      currentExp: totalExp,
      expToNextLevel,
      progressPercentage,
      totalExp,
      levelUpRewards: this.getLevelUpRewards(currentLevel)
    };
  }

  // EXP miktarına göre seviye bul
  private static getLevelByExp(exp: number): UserLevel {
    for (let i = this.LEVELS.length - 1; i >= 0; i--) {
      if (exp >= this.LEVELS[i].minExp) {
        return this.LEVELS[i];
      }
    }
    return this.LEVELS[0]; // Bronz seviye
  }

  // Sonraki seviyeyi bul
  private static getNextLevel(currentLevel: UserLevel): UserLevel | null {
    const currentIndex = this.LEVELS.findIndex(level => level.id === currentLevel.id);
    return currentIndex < this.LEVELS.length - 1 ? this.LEVELS[currentIndex + 1] : null;
  }

  // Seviye atlama ödüllerini hesapla
  private static getLevelUpRewards(level: UserLevel): LevelUpReward[] {
    const rewards: LevelUpReward[] = [];

    switch (level.id) {
      case 'bronze':
        rewards.push({
          type: 'discount',
          value: 5,
          description: '%5 indirim kuponu',
          icon: 'gift'
        });
        break;
      case 'iron':
        rewards.push(
          {
            type: 'discount',
            value: 10,
            description: '%10 indirim kuponu',
            icon: 'gift'
          },
          {
            type: 'points',
            value: 1000,
            description: '1000 puan',
            icon: 'star'
          }
        );
        break;
      case 'gold':
        rewards.push(
          {
            type: 'gift',
            value: 0,
            description: 'Hediye paketi',
            icon: 'gift'
          },
          {
            type: 'discount',
            value: 15,
            description: '%15 indirim kuponu',
            icon: 'gift'
          }
        );
        break;
      case 'platinum':
        rewards.push(
          {
            type: 'gift',
            value: 0,
            description: 'Premium hediye paketi',
            icon: 'gift'
          },
          {
            type: 'discount',
            value: 15,
            description: '%15 indirim kuponu',
            icon: 'gift'
          },
          {
            type: 'points',
            value: 5000,
            description: '5000 puan',
            icon: 'star'
          }
        );
        break;
      case 'diamond':
        rewards.push(
          {
            type: 'gift',
            value: 0,
            description: 'Elmas hediye paketi',
            icon: 'gift'
          },
          {
            type: 'discount',
            value: 15,
            description: '%15 indirim kuponu',
            icon: 'gift'
          },
          {
            type: 'badge',
            value: 0,
            description: 'Elmas rozeti',
            icon: 'medal'
          }
        );
        break;
    }

    return rewards;
  }

  // EXP kazanma hesaplaması
  static calculateExpGain(source: string, amount: number, orderTotal?: number): number {
    let baseExp = 0;

    switch (source) {
      case 'purchase':
        baseExp = 50; // Her alışveriş +50 EXP
        if (orderTotal) {
          baseExp += Math.floor(orderTotal * 0.1); // Sepet tutarının %10'u
        }
        break;
      case 'invitation':
        baseExp = 250; // Davet +250 EXP
        break;
      case 'social_share':
        baseExp = 25; // Sosyal paylaşım +25 EXP
        break;
      case 'review':
        baseExp = 15; // Yorum +15 EXP
        break;
      case 'login':
        baseExp = 5; // Günlük giriş +5 EXP
        break;
      case 'special':
        baseExp = amount; // Özel etkinlikler
        break;
      default:
        baseExp = 0;
    }

    return baseExp;
  }

  // Tüm seviyeleri getir
  static getAllLevels(): UserLevel[] {
    return [...this.LEVELS];
  }

  // Seviye bilgilerini getir
  static getLevelInfo(levelId: string): UserLevel | null {
    return this.LEVELS.find(level => level.id === levelId) || null;
  }
}
