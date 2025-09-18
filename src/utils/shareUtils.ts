import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { UserLevelController } from '../controllers/UserLevelController';
import { NotificationController } from '../controllers/NotificationController';
import { canEarnShareExp, recordSuccessfulShare, DAILY_LIMIT } from './social-share-limit';
import { UserController } from '../controllers/UserController';

export interface ProductShareData {
  productName: string;
  productPrice: number;
  productImage?: string;
  productBrand?: string;
  productDescription?: string;
}

export interface CartShareData {
  cartItems: Array<{
    productName: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalAmount: number;
}

export class ShareUtils {
  private static async downloadImageToCache(imageUrl: string): Promise<string | null> {
    try {
      if (!imageUrl) return null;
      const fileName = encodeURIComponent(imageUrl.split('/').pop() || `img_${Date.now()}.jpg`);
      const ext = (fileName.split('.').pop() || 'jpg').toLowerCase();
      const localUri = `${FileSystem.cacheDirectory}share_${fileName}`;
      // Eğer önceden indirilmişse yeniden indirme
      const info = await FileSystem.getInfoAsync(localUri);
      if (info.exists) return localUri;
      const download = await FileSystem.downloadAsync(imageUrl, localUri, { cache: true });
      if (download.status === 200) return download.uri;
      return null;
    } catch {
      return null;
    }
  }

  private static async downloadImageToCacheWithTimeout(imageUrl: string, timeoutMs: number = 1200): Promise<string | null> {
    try {
      let timedOut = false;
      const timeout = new Promise<null>((resolve) => setTimeout(() => { timedOut = true; resolve(null); }, timeoutMs));
      const download = (async () => {
        const uri = await ShareUtils.downloadImageToCache(imageUrl);
        return timedOut ? null : uri;
      })();
      return await Promise.race([download, timeout]);
    } catch {
      return null;
    }
  }
  // Ürün paylaşım kartını oluştur ve paylaş
  static async shareProduct(
    productData: ProductShareData,
    platform: string,
    onSuccess?: (platform: string, expGained: number) => void
  ): Promise<void> {
    try {
      const currentUser = await UserController.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Paylaşım yapmak için giriş yapmanız gerekiyor.');
        return;
      }

      // Fiyat biçimlendirici
      const formatPrice = (price: number) =>
        new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(price);

      // Açıklamayı kısalt
      const shortDescription = (productData.productDescription || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 140);

      // Paylaşım metni oluştur (ürün adı, marka, fiyat, kısa açıklama + görsel linki)
      const lines: string[] = [];
      lines.push(`🔥 ${productData.productName}`);
      if (productData.productBrand) {
        lines.push(`🏷️ Marka: ${productData.productBrand}`);
      }
      lines.push(`💰 Fiyat: ${formatPrice(productData.productPrice)}`);
      if (shortDescription) {
        lines.push('');
        lines.push(shortDescription);
      }
      // Görsel linkini mesaja ekle (çoğu platform linki önizler)
      if (productData.productImage) {
        lines.push('');
        lines.push(productData.productImage);
      }
      lines.push('');
      lines.push("#Kamp #Outdoor #HuğluOutdoor");
      const shareText = lines.join('\n');

      // Native share dialog'u kullan (görseli yerel dosya olarak paylaşmayı dene)
      const { Share } = require('react-native');
      const sharePayload: any = { message: shareText, title: productData.productName };
      let localImageUri: string | null = null;
      if (productData.productImage) {
        // Görsel indirimi için kısa bir zaman sınırı; aşarsa link ile paylaş
        localImageUri = await ShareUtils.downloadImageToCacheWithTimeout(productData.productImage, 1200);
      }
      if (localImageUri) {
        sharePayload.url = localImageUri; // iOS ve birçok Android paylaşım hedefi dosya yolunu destekler
      } else if (productData.productImage) {
        // En azından link olarak ekle
        sharePayload.url = productData.productImage;
      }
      const result = await Share.share(sharePayload);

      if (result.action === Share.sharedAction) {
        // Kullanıcıya anında geri bildirim ver, EXP işlemlerini arka planda yap
        Alert.alert('Paylaşım Başarılı!', 'Ürünü başarıyla paylaştınız.');
        (async () => {
          try {
            const { allowed, remaining } = await canEarnShareExp(currentUser.id);
            if (allowed) {
              const expResult = await UserLevelController.addSocialShareExp(currentUser.id.toString());
              if (expResult.success) {
                await recordSuccessfulShare(currentUser.id);
                try {
                  await NotificationController.createSystemNotification(currentUser.id, 'EXP Kazanımı', 'Paylaşımınız için +25 EXP hesabınıza tanımlandı.');
                } catch {}
                onSuccess?.(platform, 25);
              }
            }
            // Cache'i temizle: indirilen resmi sil (opsiyonel, yer açar)
            try {
              if (localImageUri) {
                await FileSystem.deleteAsync(localImageUri, { idempotent: true });
              }
            } catch {}
          } catch {}
        })();
      }
    } catch (error) {
      console.error('Error sharing product:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    }
  }

  // Sepet paylaşım kartını oluştur ve paylaş
  static async shareCart(
    cartData: CartShareData,
    platform: string,
    onSuccess?: (platform: string, expGained: number) => void
  ): Promise<void> {
    try {
      const currentUser = await UserController.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Paylaşım yapmak için giriş yapmanız gerekiyor.');
        return;
      }

      // Sepet paylaşım metni oluştur
      const itemCount = cartData.cartItems.length;
      const itemNames = cartData.cartItems.slice(0, 3).map(item => item.productName).join(', ');
      const moreItems = itemCount > 3 ? ` ve ${itemCount - 3} ürün daha` : '';
      
      const shareText = `🛒 Sepetimi paylaşıyorum!\n\n${itemNames}${moreItems}\n\nToplam: ${cartData.totalAmount} TL\n\nKamp malzemeleri için Huğlu Outdoor! 🏕️\n\n#Kamp #Outdoor #HuğluOutdoor #Sepet`;

      // Native share dialog'u kullan
      const { Share } = require('react-native');
      const result = await Share.share({
        message: shareText,
        title: 'Huğlu Outdoor Sepetim',
      });

      if (result.action === Share.sharedAction) {
        const { allowed, remaining } = await canEarnShareExp(currentUser.id);
        if (allowed) {
          const expResult = await UserLevelController.addSocialShareExp(currentUser.id.toString());
          if (expResult.success) {
            await recordSuccessfulShare(currentUser.id);
            Alert.alert('🎉 Sepet Paylaşımı Başarılı!', `+25 EXP kazandınız!\n\nBugün kalan EXP hakları: ${remaining - 1}/${DAILY_LIMIT}`, [{ text: 'Harika!' }]);
            onSuccess?.(platform, 25);

            // Bildirim: EXP tanımlandı
            try {
              await NotificationController.createSystemNotification(currentUser.id, 'EXP Kazanımı', 'Paylaşımınız için +25 EXP hesabınıza tanımlandı.');
            } catch {}
          } else {
            Alert.alert('Paylaşım Başarılı!', 'Sepetinizi başarıyla paylaştınız.');
          }
        } else {
          Alert.alert('Paylaşım Başarılı', `Günlük EXP limitine ulaştınız (${DAILY_LIMIT}/gün). Yarın tekrar deneyin.`);
        }
      }
    } catch (error) {
      console.error('Error sharing cart:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    }
  }

  // Platform'a özel paylaşım URL'si oluştur
  static generatePlatformShareUrl(
    platform: string,
    shareText: string,
    shareUrl: string
  ): string {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case 'instagram':
        return `https://www.instagram.com/`;
      case 'facebook':
        return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
      case 'whatsapp':
        return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
      case 'twitter':
        return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      default:
        return shareUrl;
    }
  }

  // Paylaşım kartı için renk paleti
  static getPlatformColors(platform: string) {
    const colors = {
      instagram: {
        primary: '#E4405F',
        gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
      },
      facebook: {
        primary: '#1877F2',
        gradient: ['#1877F2', '#42A5F5'],
      },
      whatsapp: {
        primary: '#25D366',
        gradient: ['#25D366', '#128C7E'],
      },
      twitter: {
        primary: '#1DA1F2',
        gradient: ['#1DA1F2', '#0D8BD9'],
      },
    };
    return colors[platform as keyof typeof colors] || colors.instagram;
  }
}
