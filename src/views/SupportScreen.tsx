import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';

interface SupportScreenProps {
  navigation: any;
}

interface ContactMethod {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  available: boolean;
  workingHours?: string;
}

interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export const SupportScreen: React.FC<SupportScreenProps> = ({ navigation }) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');

  const contactMethods: ContactMethod[] = [
    {
      id: 'phone',
      title: 'Telefon Desteği',
      description: '0530 312 58 13',
      icon: 'phone',
      available: true,
      workingHours: 'Pazartesi-Cumartesi 09:00-19:30',
      action: () => {
        Linking.openURL('tel:05303125813');
      }
    },
    {
      id: 'whatsapp',
      title: 'WhatsApp Desteği',
      description: 'Hızlı yanıt için WhatsApp (0530 312 58 13)',
      icon: 'chat',
      available: true,
      workingHours: '7/24 Aktif',
      action: () => {
        Linking.openURL('https://wa.me/905303125813?text=Merhaba, yardıma ihtiyacım var.');
      }
    },
    {
      id: 'email',
      title: 'E-posta Desteği',
      description: 'info@hugluoutdoor.com',
      icon: 'email',
      available: true,
      workingHours: '24 saat içinde yanıt',
      action: () => {
        Linking.openURL('mailto:info@hugluoutdoor.com');
      }
    },
    {
      id: 'live-chat',
      title: 'Canlı Destek',
      description: 'Anında yardım alın',
      icon: 'support-agent',
      available: false,
      workingHours: 'Çevrimdışı',
      action: () => {
        Alert.alert('Bilgi', 'Canlı destek şu anda çevrimdışı. Lütfen diğer iletişim yöntemlerini kullanın.');
      }
    }
  ];

  const supportCategories: SupportCategory[] = [
    {
      id: 'order',
      title: 'Sipariş Sorunu',
      description: 'Sipariş takibi, iptal, değişiklik',
      icon: 'shopping-cart',
      color: Colors.info
    },
    {
      id: 'payment',
      title: 'Ödeme Sorunu',
      description: 'Ödeme, fatura, iade',
      icon: 'payment',
      color: Colors.success
    },
    {
      id: 'product',
      title: 'Ürün Sorunu',
      description: 'Ürün bilgisi, stok, kalite',
      icon: 'inventory',
      color: Colors.warning
    },
    {
      id: 'shipping',
      title: 'Kargo Sorunu',
      description: 'Teslimat, hasar, gecikme',
      icon: 'local-shipping',
      color: Colors.secondary
    },
    {
      id: 'account',
      title: 'Hesap Sorunu',
      description: 'Giriş, şifre, profil',
      icon: 'account-circle',
      color: Colors.accent
    },
    {
      id: 'other',
      title: 'Diğer',
      description: 'Genel sorular ve öneriler',
      icon: 'help',
      color: Colors.primary
    }
  ];

  const handleSendMessage = () => {
    if (!selectedCategory) {
      Alert.alert('Uyarı', 'Lütfen bir kategori seçin');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Uyarı', 'Lütfen konu başlığını girin');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Uyarı', 'Lütfen mesajınızı yazın');
      return;
    }
    if (!senderName.trim()) {
      Alert.alert('Uyarı', 'Lütfen adınızı girin');
      return;
    }
    if (!senderEmail.trim()) {
      Alert.alert('Uyarı', 'Lütfen e-posta adresinizi girin');
      return;
    }

    // E-posta doğrulama
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(senderEmail)) {
      Alert.alert('Uyarı', 'Lütfen geçerli bir e-posta adresi girin');
      return;
    }

    // Mesaj gönderme simülasyonu
    Alert.alert(
      'Başarılı',
      'Mesajınız başarıyla gönderildi. En kısa sürede size geri dönüş yapacağız.',
      [
        { 
          text: 'Tamam', 
          onPress: () => {
            // Formu temizle
            setSelectedCategory('');
            setSubject('');
            setMessage('');
            setSenderName('');
            setSenderEmail('');
          }
        }
      ]
    );
  };

  const renderContactMethod = (method: ContactMethod) => (
    <ModernCard key={method.id} style={styles.contactCard}>
      <TouchableOpacity
        style={styles.contactContent}
        onPress={method.action}
        disabled={!method.available}
      >
        <View style={[
          styles.contactIcon,
          { backgroundColor: method.available ? Colors.primary + '10' : Colors.textMuted + '20' }
        ]}>
          <Icon 
            name={method.icon} 
            size={24} 
            color={method.available ? Colors.primary : Colors.textMuted} 
          />
        </View>
        <View style={styles.contactInfo}>
          <Text style={[
            styles.contactTitle,
            { color: method.available ? Colors.text : Colors.textMuted }
          ]}>
            {method.title}
          </Text>
          <Text style={styles.contactDescription}>{method.description}</Text>
          {method.workingHours && (
            <Text style={[
              styles.workingHours,
              { color: method.available ? Colors.success : Colors.error }
            ]}>
              {method.workingHours}
            </Text>
          )}
        </View>
        <Icon 
          name="chevron-right" 
          size={20} 
          color={method.available ? Colors.textLight : Colors.textMuted} 
        />
      </TouchableOpacity>
    </ModernCard>
  );

  const renderSupportCategory = (category: SupportCategory) => (
    <TouchableOpacity
      key={category.id}
      style={[
        styles.categoryCard,
        selectedCategory === category.id && styles.categoryCardSelected
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
        <Icon name={category.icon} size={24} color={category.color} />
      </View>
      <Text style={[
        styles.categoryTitle,
        selectedCategory === category.id && styles.categoryTitleSelected
      ]}>
        {category.title}
      </Text>
      <Text style={styles.categoryDescription}>{category.description}</Text>
      {selectedCategory === category.id && (
        <Icon name="check-circle" size={20} color={Colors.primary} style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Destek</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hızlı İletişim */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hızlı İletişim</Text>
          <Text style={styles.sectionDescription}>
            Size en uygun iletişim yöntemini seçin
          </Text>
          {contactMethods.map(renderContactMethod)}
        </View>

        {/* Destek Formu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek Talebi Oluştur</Text>
          <Text style={styles.sectionDescription}>
            Sorununuzu detaylı olarak anlatın, size yardımcı olalım
          </Text>

          <ModernCard style={styles.formCard}>
            {/* Kategori Seçimi */}
            <Text style={styles.fieldLabel}>Sorun Kategorisi *</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesGrid}
            >
              {supportCategories.map(renderSupportCategory)}
            </ScrollView>

            {/* Kişisel Bilgiler */}
            <Text style={[styles.fieldLabel, { marginTop: Spacing.xl }]}>Adınız *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Adınızı girin"
              value={senderName}
              onChangeText={setSenderName}
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.fieldLabel}>E-posta Adresiniz *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ornek@email.com"
              value={senderEmail}
              onChangeText={setSenderEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={Colors.textLight}
            />

            {/* Konu */}
            <Text style={styles.fieldLabel}>Konu *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Sorununuzu kısaca özetleyin"
              value={subject}
              onChangeText={setSubject}
              placeholderTextColor={Colors.textLight}
            />

            {/* Mesaj */}
            <Text style={styles.fieldLabel}>Mesajınız *</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              placeholder="Sorununuzu detaylı olarak açıklayın..."
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              placeholderTextColor={Colors.textLight}
            />

            <ModernButton
              title="Mesaj Gönder"
              onPress={handleSendMessage}
              style={{ marginTop: Spacing.lg }}
            />
          </ModernCard>
        </View>

        {/* Yardım Merkezi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yardım Merkezi</Text>
          
          <ModernCard style={styles.helpCard}>
            <TouchableOpacity
              style={styles.helpItem}
              onPress={() => navigation.navigate('FAQ')}
            >
              <Icon name="help-outline" size={24} color={Colors.primary} />
              <View style={styles.helpInfo}>
                <Text style={styles.helpTitle}>Sıkça Sorulan Sorular</Text>
                <Text style={styles.helpDescription}>
                  En sık sorulan soruların cevaplarını bulun
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </ModernCard>

          <ModernCard style={styles.helpCard}>
            <TouchableOpacity
              style={styles.helpItem}
              onPress={() => navigation.navigate('ReturnRequests')}
            >
              <Icon name="assignment-return" size={24} color={Colors.secondary} />
              <View style={styles.helpInfo}>
                <Text style={styles.helpTitle}>İptal ve İade Taleplerim</Text>
                <Text style={styles.helpDescription}>
                  İptal ve iade taleplerinizi yönetin
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </ModernCard>
        </View>

        {/* İletişim Bilgileri */}
        <ModernCard style={styles.contactInfoCard}>
          <Text style={styles.contactInfoTitle}>İletişim Bilgileri</Text>
          
          <View style={styles.contactInfoItem}>
            <Icon name="location-on" size={20} color={Colors.primary} />
            <Text style={styles.contactInfoText}>
              Bahçelievler, Prof. Dr. Yılmaz Muslu Cd. No: 9B, 42700 Beyşehir/Konya
            </Text>
          </View>
          
          <View style={styles.contactInfoItem}>
            <Icon name="phone" size={20} color={Colors.primary} />
            <Text style={styles.contactInfoText}>0530 312 58 13</Text>
          </View>
          
          <View style={styles.contactInfoItem}>
            <Icon name="email" size={20} color={Colors.primary} />
            <Text style={styles.contactInfoText}>info@hugluoutdoor.com</Text>
          </View>
          
          <View style={styles.contactInfoItem}>
            <Icon name="access-time" size={20} color={Colors.primary} />
            <Text style={styles.contactInfoText}>
              Pazartesi - Cumartesi: 09:00 - 19:30{'\n'}
              Pazar: Kapalı
            </Text>
          </View>
        </ModernCard>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.sm,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  contactCard: {
    marginBottom: Spacing.md,
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  workingHours: {
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    padding: Spacing.lg,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.xs,
  },
  categoryCard: {
    width: 160,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
    marginHorizontal: Spacing.xs,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    position: 'relative',
  },
  categoryCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  categoryTitleSelected: {
    color: Colors.primary,
  },
  categoryDescription: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  checkIcon: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  messageInput: {
    height: 120,
    textAlignVertical: 'top',
  },
  helpCard: {
    marginBottom: Spacing.md,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  helpInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  helpDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
  contactInfoCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
  },
  contactInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  contactInfoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  contactInfoText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: Spacing.md,
    flex: 1,
    lineHeight: 20,
  },
});
