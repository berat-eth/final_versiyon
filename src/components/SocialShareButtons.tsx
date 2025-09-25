import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ShareUtils, ProductShareData } from '../utils/shareUtils';
import { canEarnShareExp, DAILY_LIMIT } from '../utils/social-share-limit';
import { UserController } from '../controllers/UserController';
import { Linking } from 'react-native';
import { SocialSharingController } from '../controllers/SocialSharingController';
import { UserLevelController } from '../controllers/UserLevelController';

interface SocialShareButtonsProps {
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  productBrand?: string;
  productDescription?: string;
  onShareSuccess?: (platform: string, expGained: number) => void;
}

export const SocialShareButtons: React.FC<SocialShareButtonsProps> = ({
  productId,
  productName,
  productPrice,
  productImage,
  productBrand,
  productDescription,
  onShareSuccess,
}) => {
  const [sharing, setSharing] = useState<string | null>(null);

  const socialPlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'camera-alt',
      color: '#E4405F',
      gradient: ['#833AB4', '#FD1D1D', '#FCB045'],
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
      gradient: ['#1877F2', '#42A5F5'],
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'chat',
      color: '#25D366',
      gradient: ['#25D366', '#128C7E'],
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'alternate-email',
      color: '#1DA1F2',
      gradient: ['#1DA1F2', '#0D8BD9'],
    },
  ];

  const handleSocialShare = async (platform: string) => {
    try {
      setSharing(platform);
      
      const current = await UserController.getCurrentUser();
      if (!current) {
        Alert.alert('Giriş Gerekli', 'Paylaşım yapmak için giriş yapın.');
        return;
      }
      const { allowed, remaining } = await canEarnShareExp(current.id);
      if (!allowed) {
        Alert.alert('Limit Aşıldı', `Günlük EXP limitine ulaştınız (${DAILY_LIMIT}/gün). Yarın tekrar deneyin.`);
        return;
      }

      const productData: ProductShareData = {
        productName,
        productPrice,
        productImage,
        productBrand,
        productDescription,
      };

      await ShareUtils.shareProduct(
        productData,
        platform,
        onShareSuccess
      );
    } catch (error) {
      console.error('Error sharing to social:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    } finally {
      setSharing(null);
    }
  };

  const handleDirectShare = async (platform: string) => {
    try {
      setSharing(platform);
      
      const currentUser = await UserController.getCurrentUser();
      if (!currentUser) {
        Alert.alert('Hata', 'Paylaşım yapmak için giriş yapmanız gerekiyor.');
        return;
      }

      const shareText = `🔥 ${productName} - ${productPrice} TL\n\nKamp malzemeleri için Huğlu Outdoor! 🏕️\n\n#Kamp #Outdoor #HuğluOutdoor`;

      const shareLink = SocialSharingController.generateShareUrl(
        platform,
        productId,
        undefined,
        shareText
      );

      const canOpen = await Linking.canOpenURL(shareLink);
      if (canOpen) {
        await Linking.openURL(shareLink);
        
        // Paylaşım başarılı kabul et ve EXP ekle
        setTimeout(async () => {
          const expResult = await UserLevelController.addSocialShareExp(currentUser.id.toString());
          
          if (expResult.success) {
            Alert.alert(
              '🎉 Paylaşım Başarılı!',
              `+25 EXP kazandınız!\n\n${expResult.message}`,
              [{ text: 'Harika!' }]
            );
            
            onShareSuccess?.(platform, 25);
          }
        }, 2000); // 2 saniye sonra EXP ekle
      } else {
        Alert.alert('Hata', `${platform} uygulaması bulunamadı.`);
      }
    } catch (error) {
      console.error('Error opening social app:', error);
      Alert.alert('Hata', 'Sosyal medya uygulaması açılamadı.');
    } finally {
      setSharing(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paylaş ve Kazan! 🎁</Text>
      <Text style={styles.subtitle}>Bu ürünü paylaş, 25 EXP kazan</Text>
      
      <View style={styles.buttonsContainer}>
        {socialPlatforms.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.shareButton,
              { backgroundColor: platform.color },
              sharing === platform.id && styles.sharingButton,
            ]}
            onPress={() => handleSocialShare(platform.id)}
            disabled={sharing !== null}
          >
            <Icon
              name={platform.icon}
              size={24}
              color="#FFFFFF"
            />
            {sharing === platform.id && (
              <Text style={styles.sharingText}>Paylaşılıyor...</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.infoContainer}>
        <Icon name="info" size={16} color="#8E8E93" />
        <Text style={styles.infoText}>
          Her paylaşımda 25 EXP kazanırsınız. EXP'lerinizle seviye atlayın!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 16,
    marginVertical: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  shareButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sharingButton: {
    opacity: 0.7,
  },
  sharingText: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#8E8E93',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 12,
    color: '#8E8E93',
    marginLeft: 8,
    flex: 1,
    textAlign: 'center',
  },
});
