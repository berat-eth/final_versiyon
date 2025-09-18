import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { LoadingIndicator } from '../components/LoadingIndicator';

interface FAQScreenProps {
  navigation: any;
}

interface FAQItem {
  id: number;
  category: string;
  question: string;
  answer: string;
  isExpanded?: boolean;
}

interface FAQCategory {
  name: string;
  icon: string;
  count: number;
}

// Android için LayoutAnimation'u etkinleştir
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const FAQScreen: React.FC<FAQScreenProps> = ({ navigation }) => {
  const [faqs, setFaqs] = useState<FAQItem[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tümü');

  // Mock S.S.S. verileri
  const mockFAQs: FAQItem[] = [
    {
      id: 1,
      category: 'Sipariş',
      question: 'Siparişimi nasıl takip edebilirim?',
      answer: 'Siparişinizi takip etmek için "Hesabım" > "Siparişlerim" bölümüne gidin. Burada siparişinizin güncel durumunu görebilir ve kargo takip numaranızı bulabilirsiniz. Ayrıca SMS ve e-posta ile de bilgilendirileceksiniz.'
    },
    {
      id: 2,
      category: 'Sipariş',
      question: 'Siparişimi iptal edebilir miyim?',
      answer: 'Siparişiniz henüz kargoya verilmediyse iptal edebilirsiniz. "Siparişlerim" bölümünden siparişinizin yanındaki "İptal Et" butonuna tıklayın. Kargoya verilen siparişler için iade işlemi başlatabilirsiniz.'
    },
    {
      id: 3,
      category: 'Ödeme',
      question: 'Hangi ödeme yöntemlerini kabul ediyorsunuz?',
      answer: 'Kredi kartı, banka kartı, havale/EFT ve dijital cüzdan seçeneklerini kabul ediyoruz. Kapıda ödeme mevcut değildir. Tüm kart ödemeleri 3D Secure ile güvence altındadır.'
    },
    {
      id: 4,
      category: 'Ödeme',
      question: 'Taksitli ödeme yapabilir miyim?',
      answer: 'Evet, kredi kartınızla 2, 3, 6, 9 ve 12 aya varan taksit seçenekleri mevcuttur. Taksit oranları bankanıza göre değişiklik gösterebilir.'
    },
    {
      id: 5,
      category: 'Kargo',
      question: 'Kargo ücreti ne kadar?',
      answer: '650 TL ve üzeri alışverişlerde kargo ücretsizdir. 650 TL altındaki siparişler için kargo ücreti 160 TL\'dir. Bazı özel ürünlerde farklı kargo ücretleri uygulanabilir.'
    },
    {
      id: 6,
      category: 'Kargo',
      question: 'Ne kadar sürede teslim alırım?',
      answer: 'Stokta bulunan ürünler 1-3 iş günü içinde kargoya verilir. Kargo süresi bulunduğunuz ile göre 1-5 iş günü arasında değişir. Özel siparişler için teslimat süresi daha uzun olabilir.'
    },
    {
      id: 7,
      category: 'İade',
      question: 'Ürün iade edebilir miyim?',
      answer: 'Evet, teslim aldığınız tarihten itibaren 14 gün içinde ürünü iade edebilirsiniz. Ürün orijinal ambalajında, kullanılmamış ve etiketli olmalıdır. İade işlemi için "İade Taleplerim" bölümünden talepte bulunun.'
    },
    {
      id: 8,
      category: 'İade',
      question: 'İade ücretini kim karşılıyor?',
      answer: 'Ürün hatalı veya hasarlı ise iade kargo ücreti tarafımızdan karşılanır. Müşteri kaynaklı iadeler için (beğenmeme, yanlış sipariş vb.) kargo ücreti müşteriye aittir.'
    },
    {
      id: 9,
      category: 'Hesap',
      question: 'Şifremi unuttum, nasıl sıfırlayabilirim?',
      answer: 'Giriş ekranında "Şifremi Unuttum" linkine tıklayın. E-posta adresinizi girin ve size gönderilen link ile yeni şifre oluşturun. Sorun yaşıyorsanız müşteri hizmetlerimizle iletişime geçin.'
    },
    {
      id: 10,
      category: 'Hesap',
      question: 'Hesabımı nasıl silebilirim?',
      answer: 'Hesabınızı silmek için müşteri hizmetlerimizle iletişime geçin. Hesap silme işlemi geri alınamaz ve tüm verileriniz kalıcı olarak silinir. Aktif siparişleriniz varsa önce bunları tamamlamanız gerekir.'
    },
    {
      id: 11,
      category: 'Ürün',
      question: 'Ürün stokta var mı nasıl anlarım?',
      answer: 'Ürün sayfasında stok durumu gösterilir. "Stokta var", "Son X adet" veya "Stokta yok" şeklinde bilgilendirme yapılır. Stokta olmayan ürünler için "Stok gelince haber ver" seçeneğini kullanabilirsiniz.'
    },
    {
      id: 12,
      category: 'Ürün',
      question: 'Ürün garantisi var mı?',
      answer: 'Tüm ürünlerimiz üretici garantisi ile satılmaktadır. Garanti süresi ürüne göre değişir ve ürün sayfasında belirtilir. Garanti kapsamında arızalı ürünler ücretsiz onarılır veya değiştirilir.'
    },
    // Seviye Sistemi Soruları
    {
      id: 13,
      category: 'Seviye Sistemi',
      question: 'Seviye sistemi nedir ve nasıl çalışır?',
      answer: 'Seviye sistemi, müşterilerimizin sadakatini ödüllendiren bir programdır. Alışveriş yaparak, sosyal medyada paylaşım yaparak ve arkadaşlarınızı davet ederek EXP kazanırsınız. Kazandığınız EXP\'lerle seviye atlar ve özel ayrıcalıklar elde edersiniz.'
    },
    {
      id: 14,
      category: 'Seviye Sistemi',
      question: 'EXP nasıl kazanırım?',
      answer: 'EXP kazanmanın birçok yolu var: • Alışveriş yapın (100₺ = 10 EXP) • Sosyal medyada paylaşım yapın (5 EXP) • Arkadaş davet edin (50 EXP) • Ürün yorumu yapın (10 EXP) • Günlük giriş yapın (1 EXP) • Özel etkinliklere katılın (değişken EXP)'
    },
    {
      id: 15,
      category: 'Seviye Sistemi',
      question: 'Hangi seviyeler var ve ayrıcalıkları nelerdir?',
      answer: '5 farklı seviyemiz var: • Bronz (0-999 EXP): %5 ek indirim • Gümüş (1000-2999 EXP): %10 ek indirim, özel ürünlere erişim • Altın (3000-5999 EXP): %15 ek indirim, hızlı kargo • Platin (6000-9999 EXP): %20 ek indirim, kişisel müşteri temsilcisi • Elmas (10000+ EXP): %25 ek indirim, VIP ayrıcalıklar'
    },
    {
      id: 16,
      category: 'Seviye Sistemi',
      question: 'Seviyemi nasıl kontrol edebilirim?',
      answer: 'Seviyenizi kontrol etmek için "Hesabım" > "Seviye Sistemi" bölümüne gidin. Burada mevcut seviyenizi, bir sonraki seviyeye kalan EXP miktarınızı ve EXP geçmişinizi görebilirsiniz.'
    },
    {
      id: 17,
      category: 'Seviye Sistemi',
      question: 'EXP\'lerim kaybolur mu?',
      answer: 'Hayır, kazandığınız EXP\'ler asla kaybolmaz. Ancak seviye atladıktan sonra bir sonraki seviyeye geçmek için gerekli EXP miktarı sıfırlanır ve yeni seviye için EXP toplamaya devam edersiniz.'
    },
    {
      id: 18,
      category: 'Seviye Sistemi',
      question: 'Seviye ayrıcalıklarımı nasıl kullanırım?',
      answer: 'Seviye ayrıcalıklarınız otomatik olarak uygulanır. Alışveriş yaparken seviyenize göre ek indirimler otomatik olarak hesaplanır. Özel ürünlere erişim hakkınız varsa, bu ürünler size özel olarak gösterilir.'
    },
    {
      id: 19,
      category: 'Seviye Sistemi',
      question: 'Hızlı seviye atlamak için ne yapabilirim?',
      answer: 'Hızlı seviye atlamak için: • Daha sık alışveriş yapın • Arkadaşlarınızı davet edin (en yüksek EXP) • Sosyal medyada paylaşım yapın • Ürün yorumları yazın • Özel kampanyaları takip edin • Günlük giriş yapmayı unutmayın'
    },
    {
      id: 20,
      category: 'Seviye Sistemi',
      question: 'Seviye sistemi hesabımı silersem ne olur?',
      answer: 'Hesabınızı sildiğinizde tüm seviye verileriniz ve kazandığınız EXP\'ler kalıcı olarak silinir. Bu işlem geri alınamaz. Yeni hesap açtığınızda sıfırdan başlamanız gerekir.'
    },
    {
      id: 21,
      category: 'Seviye Sistemi',
      question: 'Seviye sisteminde hata var, ne yapmalıyım?',
      answer: 'Seviye sisteminde herhangi bir hata fark ederseniz, müşteri hizmetlerimizle iletişime geçin. Sorununuzu detaylı bir şekilde açıklayın ve gerekirse ekran görüntüsü paylaşın. En kısa sürede çözüm sağlayacağız.'
    },
    {
      id: 22,
      category: 'Seviye Sistemi',
      question: 'Seviye sistemi tüm ürünlerde geçerli mi?',
      answer: 'Seviye sistemi çoğu ürünümüzde geçerlidir. Ancak bazı özel ürünler, kampanya ürünleri veya indirimli ürünlerde seviye indirimleri uygulanmayabilir. Ürün sayfasında bu bilgi belirtilir.'
    }
  ];

  const categories: FAQCategory[] = [
    { name: 'Tümü', icon: 'apps', count: mockFAQs.length },
    { name: 'Sipariş', icon: 'shopping-cart', count: mockFAQs.filter(f => f.category === 'Sipariş').length },
    { name: 'Ödeme', icon: 'payment', count: mockFAQs.filter(f => f.category === 'Ödeme').length },
    { name: 'Kargo', icon: 'local-shipping', count: mockFAQs.filter(f => f.category === 'Kargo').length },
    { name: 'İade', icon: 'assignment-return', count: mockFAQs.filter(f => f.category === 'İade').length },
    { name: 'Hesap', icon: 'account-circle', count: mockFAQs.filter(f => f.category === 'Hesap').length },
    { name: 'Ürün', icon: 'inventory', count: mockFAQs.filter(f => f.category === 'Ürün').length },
    { name: 'Seviye Sistemi', icon: 'emoji-events', count: mockFAQs.filter(f => f.category === 'Seviye Sistemi').length },
  ];

  useEffect(() => {
    loadFAQs();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [faqs, searchQuery, selectedCategory]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      // Simülasyon - gerçek uygulamada API çağrısı yapılacak
      setTimeout(() => {
        setFaqs(mockFAQs);
        setLoading(false);
      }, 500);
    } catch (error) {
      console.error('Error loading FAQs:', error);
      setLoading(false);
    }
  };

  const filterFAQs = () => {
    let filtered = faqs;

    // Kategori filtresi
    if (selectedCategory !== 'Tümü') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    // Arama filtresi
    if (searchQuery.trim()) {
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredFaqs(filtered);
  };

  const toggleFAQ = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFilteredFaqs(prev => 
      prev.map(faq => 
        faq.id === id ? { ...faq, isExpanded: !faq.isExpanded } : faq
      )
    );
  };

  const renderCategory = ({ name, icon, count }: FAQCategory) => (
    <TouchableOpacity
      key={name}
      style={[
        styles.categoryItem,
        selectedCategory === name && styles.categoryItemSelected
      ]}
      onPress={() => setSelectedCategory(name)}
    >
      <Icon 
        name={icon} 
        size={20} 
        color={selectedCategory === name ? Colors.primary : Colors.textLight} 
      />
      <Text style={[
        styles.categoryText,
        selectedCategory === name && styles.categoryTextSelected
      ]}>
        {name} ({count})
      </Text>
    </TouchableOpacity>
  );

  const renderFAQ = (faq: FAQItem) => (
    <ModernCard key={faq.id} style={styles.faqCard}>
      <TouchableOpacity
        style={styles.faqHeader}
        onPress={() => toggleFAQ(faq.id)}
        activeOpacity={0.7}
      >
        <View style={styles.questionContainer}>
          <Text style={styles.categoryBadge}>{faq.category}</Text>
          <Text style={styles.question}>{faq.question}</Text>
        </View>
        <Icon
          name={faq.isExpanded ? 'expand-less' : 'expand-more'}
          size={24}
          color={Colors.textLight}
        />
      </TouchableOpacity>
      
      {faq.isExpanded && (
        <View style={styles.answerContainer}>
          <Text style={styles.answer}>{faq.answer}</Text>
        </View>
      )}
    </ModernCard>
  );

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sıkça Sorulan Sorular</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Arama Çubuğu */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Soru ara..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={Colors.textLight}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="clear" size={20} color={Colors.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Kategoriler */}
        <View style={styles.categoriesContainer}>
          <Text style={styles.sectionTitle}>Kategoriler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollView}
          >
            {(categories || []).map(renderCategory)}
          </ScrollView>
        </View>

        {/* S.S.S. Listesi */}
        <View style={styles.faqsContainer}>
          <Text style={styles.sectionTitle}>
            {selectedCategory === 'Tümü' ? 'Tüm Sorular' : selectedCategory} 
            {searchQuery && ` - "${searchQuery}" için sonuçlar`}
          </Text>
          
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map(renderFAQ)
          ) : (
            <View style={styles.emptyState}>
              <Icon name="help-outline" size={64} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>
                {searchQuery ? 'Sonuç Bulunamadı' : 'Soru Bulunamadı'}
              </Text>
              <Text style={styles.emptyStateDescription}>
                {searchQuery 
                  ? `"${searchQuery}" aramanız için sonuç bulunamadı. Farklı anahtar kelimeler deneyebilirsiniz.`
                  : 'Bu kategoride henüz soru bulunmuyor.'
                }
              </Text>
              {searchQuery && (
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={styles.clearSearchText}>Aramayı Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Yardım Bölümü */}
        <ModernCard style={styles.helpCard}>
          <View style={styles.helpContent}>
            <Icon name="support-agent" size={48} color={Colors.primary} />
            <Text style={styles.helpTitle}>Cevabınızı bulamadınız mı?</Text>
            <Text style={styles.helpDescription}>
              Müşteri hizmetlerimizle iletişime geçin, size yardımcı olmaktan mutluluk duyarız.
            </Text>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => navigation.navigate('Support')}
            >
              <Text style={styles.contactButtonText}>İletişime Geç</Text>
            </TouchableOpacity>
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Shadows.small,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  categoriesContainer: {
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  categoriesScrollView: {
    paddingHorizontal: Spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: Spacing.xs,
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  faqsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  faqCard: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.md,
  },
  questionContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: Spacing.xs,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    lineHeight: 22,
  },
  answerContainer: {
    paddingTop: 0,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  answer: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  clearSearchButton: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
  helpCard: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  helpContent: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  helpDescription: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  contactButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: 8,
  },
  contactButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textOnPrimary,
  },
});
