import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { ShareUtils, CartShareData } from '../utils/shareUtils';

interface CartShareButtonsProps {
  cartItems: Array<{
    id: number;
    productName: string;
    price: number;
    quantity: number;
    image?: string;
  }>;
  totalAmount: number;
  onShareSuccess?: (platform: string, expGained: number) => void;
}

export const CartShareButtons: React.FC<CartShareButtonsProps> = ({
  cartItems,
  totalAmount,
  onShareSuccess,
}) => {
  const [sharing, setSharing] = useState<string | null>(null);

  const socialPlatforms = [
    {
      id: 'instagram',
      name: 'Instagram',
      icon: 'camera-alt',
      color: '#E4405F',
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#1877F2',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'chat',
      color: '#25D366',
    },
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'alternate-email',
      color: '#1DA1F2',
    },
  ];

  const generateCartShareText = () => {
    const itemCount = cartItems.length;
    const itemNames = cartItems.slice(0, 3).map(item => item.productName).join(', ');
    const moreItems = itemCount > 3 ? ` ve ${itemCount - 3} ürün daha` : '';
    
    return `🛒 Sepetimi paylaşıyorum!\n\n${itemNames}${moreItems}\n\nToplam: ${totalAmount} TL\n\nKamp malzemeleri için Huğlu Outdoor! 🏕️\n\n#Kamp #Outdoor #HuğluOutdoor #Sepet`;
  };

  const handleCartShare = async (platform: string) => {
    try {
      setSharing(platform);
      
      const cartData: CartShareData = {
        cartItems,
        totalAmount,
      };

      await ShareUtils.shareCart(
        cartData,
        platform,
        onShareSuccess
      );
    } catch (error) {
      console.error('Error sharing cart:', error);
      Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
    } finally {
      setSharing(null);
    }
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="share" size={20} color="#1A1A1A" />
        <Text style={styles.title}>Sepetini Paylaş</Text>
      </View>
      
      <Text style={styles.subtitle}>Sepetini paylaş, 25 EXP kazan</Text>
      
      <View style={styles.buttonsContainer}>
        {socialPlatforms.map((platform) => (
          <TouchableOpacity
            key={platform.id}
            style={[
              styles.shareButton,
              { backgroundColor: platform.color },
              sharing === platform.id && styles.sharingButton,
            ]}
            onPress={() => handleCartShare(platform.id)}
            disabled={sharing !== null}
          >
            <Icon
              name={platform.icon}
              size={20}
              color="#FFFFFF"
            />
            {sharing === platform.id && (
              <Text style={styles.sharingText}>Paylaşılıyor...</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.infoContainer}>
        <Icon name="info" size={14} color="#8E8E93" />
        <Text style={styles.infoText}>
          Sepet paylaşımında 25 EXP kazanırsınız
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 16,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
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
    bottom: -18,
    fontSize: 9,
    color: '#8E8E93',
    textAlign: 'center',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#8E8E93',
    marginLeft: 6,
    flex: 1,
    textAlign: 'center',
  },
});
