import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors, Gradients } from '../theme/colors';
import { Spacing, Shadows } from '../theme/theme';
import { ModernCard } from '../components/ui/ModernCard';
import { ModernButton } from '../components/ui/ModernButton';
import { Product } from '../utils/types';
import { ProductController } from '../controllers/ProductController';
import { CustomProductionController, CreateCustomProductionRequestData } from '../controllers/CustomProductionController';
import { useLanguage } from '../contexts/LanguageContext';

const { width } = Dimensions.get('window');

interface CustomProductionScreenProps {
  navigation: any;
}

interface SelectedProduct {
  product: Product;
  quantity: number;
  customizations: {
    text: string;
    logo: string | null;
    color: string;
    position: 'front' | 'back' | 'left' | 'right';
    logoTransform?: {
      x: number;
      y: number;
      scale: number;
    };
    logoSize?: {
      width: number; // cm
      height: number; // cm
    };
    // Benden özellikleri
    isBenden?: boolean;
    bendenSize?: string;
    bendenQuantity?: number;
    bendenDescription?: string;
  };
}

export const CustomProductionScreen: React.FC<CustomProductionScreenProps> = ({ navigation }) => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [customizationModal, setCustomizationModal] = useState(false);
  const [currentCustomization, setCurrentCustomization] = useState<SelectedProduct | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(true);
  const [quantity, setQuantity] = useState<number>(1);
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const logoPan = useRef(new Animated.ValueXY({ x: 80, y: 80 })).current;
  const [logoScale, setLogoScale] = useState<number>(1);
  const [logoWidth, setLogoWidth] = useState<number>(5); // cm
  const [logoHeight, setLogoHeight] = useState<number>(5); // cm
  
  // Benden form state'leri
  const [showBendenForm, setShowBendenForm] = useState(false);
  const [bendenForm, setBendenForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    size: 'M',
    quantity: 1,
    description: '',
    specialRequests: '',
    budget: '',
    deadline: '',
    preferredContact: 'email'
  });

  // Load products on component mount
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        
        // Minimum loading time to show loading indicator
        const minLoadingTime = new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try multiple methods to get products
        let productsArray: Product[] = [];
        
        try {
          console.log('🔄 Method 1: getAllProducts...');
          // Method 1: getAllProducts
          const result = await ProductController.getAllProducts(1, 1000);
          
          if (Array.isArray(result)) {
            productsArray = result;
            console.log('✅ Method 1 success:', productsArray.length, 'products');
          } else if (result && typeof result === 'object' && Array.isArray(result.products)) {
            productsArray = result.products;
            console.log('✅ Method 1 success (nested):', productsArray.length, 'products');
          }
        } catch (error) {
          console.log('❌ Method 1 failed, trying method 2...');
        }
        
        // Method 2: If no products, try getProductsByCategory with 'all'
        if (productsArray.length === 0) {
          try {
            console.log('🔄 Method 2: getProductsByCategory("all")...');
            const alternativeResult = await ProductController.getProductsByCategory('all');
            if (Array.isArray(alternativeResult)) {
              productsArray = alternativeResult;
              console.log('✅ Method 2 success:', productsArray.length, 'products');
            }
          } catch (error) {
            console.log('❌ Method 2 failed, trying method 3...');
          }
        }
        
        // Method 3: If still no products, try with specific categories
        if (productsArray.length === 0) {
          try {
            console.log('🔄 Method 3: Loading specific categories...');
            const categories = ['Tişört', 'T-Shirt', 'Hoodie', 'Sweatshirt', 'Kamp Ürünleri'];
            for (const category of categories) {
              const categoryProducts = await ProductController.getProductsByCategory(category);
              if (Array.isArray(categoryProducts)) {
                productsArray = [...productsArray, ...categoryProducts];
              }
            }
            console.log('✅ Method 3 success:', productsArray.length, 'products');
          } catch (error) {
            console.log('❌ Method 3 failed');
          }
        }
        
        // Wait for minimum loading time
        await minLoadingTime;
        
        setProducts(productsArray);
        
        // Extract unique categories
        const uniqueCategories = [...new Set(productsArray.map(p => p.category))];
        setCategories(uniqueCategories);
        
        console.log('✅ Product loading completed:', productsArray.length, 'products,', uniqueCategories.length, 'categories');
      } catch (error) {
        console.error('❌ Error loading products:', error);
        Alert.alert('Hata', 'Ürünler yüklenirken bir hata oluştu');
        setProducts([]); // Fallback to empty array
      } finally {
        setLoading(false);
        console.log('🏁 Loading state set to false');
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    if (currentCustomization?.customizations.logo && currentCustomization.customizations.logoTransform) {
      const { x, y, scale } = currentCustomization.customizations.logoTransform;
      logoPan.setValue({ x, y });
      setLogoScale(scale);
    }
    if (currentCustomization?.customizations.logoSize) {
      const { width, height } = currentCustomization.customizations.logoSize;
      setLogoWidth(width);
      setLogoHeight(height);
    }
  }, [currentCustomization?.customizations.logo, currentCustomization?.customizations.logoSize]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const v: any = logoPan as any;
        logoPan.setOffset({ x: v._value?.x || 0, y: v._value?.y || 0 });
      },
      onPanResponderMove: Animated.event([
        null,
        { dx: logoPan.x, dy: logoPan.y },
      ], { useNativeDriver: false }),
      onPanResponderRelease: () => {
        logoPan.flattenOffset();
      },
    })
  ).current;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allProducts, allCategories] = await Promise.all([
        ProductController.getAllProducts(),
        ProductController.getAllCategories(),
      ]);
      
      setProducts(allProducts || []);
      
      // Sadece tekstil/giyim kategorilerini filtrele
      const clothingCategories = [
        'Mont', 'Pantolon', 'Gömlek', 'Hırka', 'Eşofmanlar', 'Bandana', 
        'Polar Bere', 'Rüzgarlık', 'Şapka', 'Hoodie', 'Tişört', 'T-Shirt', 
        'Sweatshirt', 'Yelek', 'Yardımcı Giyim Ürünleri', 'Yağmurluk'
      ];
      const filteredCategories = (allCategories || []).filter(category => 
        clothingCategories.includes(category)
      );
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sadece tekstil/giyim kategorileri
  const clothingCategories = [
    'Mont', 'Pantolon', 'Gömlek', 'Hırka', 'Eşofmanlar', 'Bandana', 
    'Polar Bere', 'Rüzgarlık', 'Şapka', 'Hoodie', 'Tişört', 'T-Shirt', 
    'Sweatshirt', 'Yelek', 'Yardımcı Giyim Ürünleri', 'Yağmurluk'
  ];

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) {
      console.log('Products is not an array:', products);
      return [];
    }
    
    console.log('Total products:', products.length);
    console.log('Search query:', searchQuery);
    console.log('Selected category:', selectedCategory);
    console.log('Clothing categories:', clothingCategories);
    
    const filtered = products.filter(product => {
      const isClothing = clothingCategories.includes(product.category);
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      
      if (!isClothing) {
        console.log(`Product ${product.name} (${product.category}) filtered out - not clothing`);
      }
      
      return isClothing && matchesSearch && matchesCategory;
    });
    
    console.log('Filtered products:', filtered.length);
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const handleProductSelect = (product: Product) => {
    // Direkt olarak customization modal'ına git
    handleAddToCustomization(product, 1);
  };

  const handleAddToCustomization = (product: Product, quantity: number) => {
    const newCustomization: SelectedProduct = {
      product,
      quantity: 1, // Başlangıç adeti, beden formundan güncellenecek
      customizations: {
        text: '',
        logo: null,
        color: '#000000',
        position: 'front',
        logoSize: {
          width: 5, // cm
          height: 5, // cm
        },
        // Benden özellikleri
        isBenden: false,
        bendenSize: 'M',
        bendenQuantity: 1, // Adet buradan alınacak
        bendenDescription: '',
      },
    };
    setCurrentCustomization(newCustomization);
    setShowProductModal(false);
    setCustomizationModal(true);
  };

  const handleSaveCustomization = () => {
    if (currentCustomization) {
      // Adet bilgisini beden formundan al
      const updatedCustomization = {
        ...currentCustomization,
        quantity: currentCustomization.customizations.bendenQuantity || 1
      };
      
      setSelectedProducts(prev => [...prev, updatedCustomization]);
      setCustomizationModal(false);
      setCurrentCustomization(null);
    }
  };

  const handleOpenLogoEditor = () => {
    setShowLogoEditor(true);
  };

  const handleSaveLogoTransform = () => {
    if (currentCustomization) {
      const v: any = logoPan as any;
      const transform = {
        x: v._value?.x ?? 80,
        y: v._value?.y ?? 80,
        scale: logoScale,
      };
      setCurrentCustomization(prev => 
        prev ? {
          ...prev,
          customizations: {
            ...prev.customizations,
            logoTransform: transform,
            logoSize: {
              width: logoWidth,
              height: logoHeight,
            }
          }
        } : null
      );
      setShowLogoEditor(false);
    }
  };

  const handleLogoUpload = async () => {
    try {
      // İzin iste
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Uyarı', 'Galeri erişim izni gerekli!');
        return;
      }

      // Resim seç
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const logoUri = result.assets[0].uri;
        setCurrentCustomization(prev => 
          prev ? {
            ...prev,
            customizations: { ...prev.customizations, logo: logoUri }
          } : null
        );
        Alert.alert('Başarılı', 'Logo başarıyla yüklendi!');
      }
    } catch (error) {
      console.error('Logo yükleme hatası:', error);
      Alert.alert('Hata', 'Logo yüklenirken bir hata oluştu.');
    }
  };

  const handleRemoveProduct = (index: number) => {
    setSelectedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitRequest = async () => {
    if (selectedProducts.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir ürün seçin.');
      return;
    }

    // Minimum sipariş limiti kontrolü
    const totalQuantity = selectedProducts.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity < 100) {
      Alert.alert(
        'Minimum Sipariş Limiti',
        `Toplam sipariş adediniz ${totalQuantity} adet. Minimum sipariş limiti 100 adettir. Lütfen ürün adetlerini artırın.`,
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
      // Prepare request data
      const requestData: CreateCustomProductionRequestData = {
        userId: 1, // Will be replaced with actual user context
        items: selectedProducts.map(item => ({
          productId: item.product.id,
          productPrice: item.product.price,
          quantity: item.quantity,
          customizations: item.customizations
        })),
        customerName: 'Müşteri', // Will be replaced with actual user profile
        customerEmail: 'customer@example.com', // Will be replaced with actual user profile
        customerPhone: '', // Will be replaced with actual user profile
        notes: '' // Will be replaced with actual notes input
      };

      const result = await CustomProductionController.createCustomProductionRequest(requestData);
      
      if (result.success) {
        Alert.alert(
          'Talep Gönderildi',
          `Özel üretim talebiniz başarıyla gönderildi. Talep numarası: ${result.data?.requestNumber || 'N/A'}. Toplam ${totalQuantity} adet ürün için ${selectedProducts.length} farklı ürün talebi oluşturuldu. En kısa sürede size dönüş yapacağız.`,
          [{ text: 'Tamam', onPress: () => {
            setSelectedProducts([]);
            navigation.goBack();
          }}]
        );
      } else {
        Alert.alert('Hata', result.message || 'Talebiniz gönderilemedi. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
      }
    } catch (error) {
      console.error('Error submitting custom production request:', error);
      Alert.alert('Hata', 'Talebiniz gönderilemedi. Lütfen tekrar deneyin.', [{ text: 'Tamam' }]);
    }
  };

  const handleBendenFormSubmit = async () => {
    if (!bendenForm.name || !bendenForm.email || !bendenForm.phone) {
      Alert.alert('Uyarı', 'Lütfen ad, e-posta ve telefon alanlarını doldurun.');
      return;
    }

    try {
      const requestData: CreateCustomProductionRequestData = {
        userId: 1, // Will be replaced with actual user context
        items: [], // Benden formu için ürün seçimi yok
        notes: `Benden Formu - ${bendenForm.description}`,
        bendenForm: {
          ...bendenForm,
          submittedAt: new Date().toISOString()
        }
      };

      const result = await CustomProductionController.createCustomProductionRequest(requestData);
      
      if (result.success) {
        Alert.alert('Başarılı', 'Benden talebiniz başarıyla gönderildi!', [
          { text: 'Tamam', onPress: () => {
            setShowBendenForm(false);
            setBendenForm({
              name: '',
              email: '',
              phone: '',
              company: '',
              size: 'M',
              quantity: 1,
              description: '',
              specialRequests: '',
              budget: '',
              deadline: '',
              preferredContact: 'email'
            });
          }}
        ]);
      } else {
        Alert.alert('Hata', result.message || 'Talep gönderilirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Error submitting benden form:', error);
      Alert.alert('Hata', 'Talep gönderilirken bir hata oluştu');
    }
  };

  const renderProductCard = ({ item }: { item: Product }) => {
    return (
      <TouchableOpacity onPress={() => handleProductSelect(item)}>
        <ModernCard style={styles.productCard}>
          <View style={styles.productImageContainer}>
            <Image
              source={{ uri: item.image || 'https://via.placeholder.com/300x300?text=No+Image' }}
              style={styles.productImage}
              resizeMode="cover"
            />
          </View>
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productPrice}>
              {ProductController.formatPrice(item.price)}
            </Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Icon name="add" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </ModernCard>
      </TouchableOpacity>
    );
  };

  const renderSelectedProduct = (item: SelectedProduct, index: number) => (
    <ModernCard key={`selected-${item.product.id}-${index}`} style={styles.selectedProductCard}>
      <Image
        source={{ uri: item.product.image }}
        style={styles.selectedProductImage}
        resizeMode="cover"
      />
      <View style={styles.selectedProductInfo}>
        <Text style={styles.selectedProductName} numberOfLines={2}>
          {item.product.name}
        </Text>
        <Text style={styles.selectedProductQuantity}>
          Adet: {item.quantity}
        </Text>
        {item.customizations.text && (
          <Text style={styles.customizationText}>
            Yazı: {item.customizations.text}
          </Text>
        )}
        {item.customizations.logo && (
          <View style={styles.logoInfo}>
            <Text style={styles.customizationText}>Logo: </Text>
            <Image
              source={{ uri: item.customizations.logo }}
              style={styles.selectedLogoImage}
              resizeMode="contain"
            />
          </View>
        )}
        <Text style={styles.customizationText}>
          Konum: {item.customizations.position}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveProduct(index)}
      >
        <Icon name="close" size={20} color={Colors.error} />
      </TouchableOpacity>
    </ModernCard>
  );

  const renderQuantityModal = () => (
    <Modal
      visible={showProductModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowProductModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ürün Seçimi</Text>
            <TouchableOpacity onPress={() => setShowProductModal(false)}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          {currentProduct && (
            <View style={styles.productDetails}>
              <Image
                source={{ uri: currentProduct.image }}
                style={styles.modalProductImage}
                resizeMode="cover"
              />
              <Text style={styles.modalProductName}>{currentProduct.name}</Text>
              <Text style={styles.modalProductPrice}>
                {ProductController.formatPrice(currentProduct.price)}
              </Text>
              
              <View style={styles.quantityContainer}>
                <Text style={styles.quantityLabel}>Adet:</Text>
                <View style={styles.quantityButtons}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
                  >
                    <Icon name="remove" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.quantityInput}
                    value={String(quantity)}
                    onChangeText={(text) => {
                      const onlyNums = text.replace(/[^0-9]/g, '');
                      const num = onlyNums === '' ? 0 : parseInt(onlyNums, 10);
                      setQuantity(Math.max(1, Math.min(999999, isNaN(num) ? 1 : num)));
                    }}
                    keyboardType="number-pad"
                  />
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setQuantity(prev => Math.min(999999, prev + 1))}
                  >
                    <Icon name="add" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <ModernButton
                title="Özelleştir"
                onPress={() => handleAddToCustomization(currentProduct, quantity)}
                style={styles.customizeButton}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderInfoModal = () => (
    <Modal
      visible={showInfoModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowInfoModal(false)}
    >
      <View style={styles.infoModalOverlay}>
        <View style={styles.infoModalContent}>
          <View style={styles.infoModalHeader}>
            <View style={styles.infoIconContainer}>
              <Icon name="info" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.infoModalTitle}>Özel Üretim Bilgilendirmesi</Text>
          </View>
          
          <ScrollView style={styles.infoModalBody}>
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Icon name="shopping-cart" size={20} color={Colors.primary} />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>Minimum Sipariş Limiti</Text>
                  <Text style={styles.infoItemText}>
                    Özel üretim talepleriniz için minimum sipariş adedi 100 adettir. 
                    Bu limit, üretim maliyetlerini optimize etmek ve kaliteli hizmet 
                    sunabilmek için belirlenmiştir.
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="assignment-return" size={20} color={Colors.warning} />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>İade Koşulları</Text>
                  <Text style={styles.infoItemText}>
                    Özel üretim ürünlerinizde iade işlemi sadece fabrikadan kaynaklanan 
                    üretim hataları durumunda mümkündür. Kişisel tercih değişiklikleri, 
                    ölçü uyumsuzlukları veya müşteri kaynaklı nedenlerle iade kabul 
                    edilmemektedir.
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="schedule" size={20} color={Colors.success} />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>Üretim Süreci</Text>
                  <Text style={styles.infoItemText}>
                    Özel üretim talepleriniz onaylandıktan sonra 7-14 iş günü içerisinde 
                    hazırlanacaktır. Üretim sürecinde size düzenli bilgilendirme yapılacaktır.
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Icon name="palette" size={20} color={Colors.primary} />
                <View style={styles.infoItemContent}>
                  <Text style={styles.infoItemTitle}>Tasarım Özellikleri</Text>
                  <Text style={styles.infoItemText}>
                    Ürünlerinize yazı, logo ve özel tasarımlar ekleyebilirsiniz. 
                    Tasarım dosyalarınızın yüksek kalitede olması önerilir.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.infoModalFooter}>
            <ModernButton
              title="Anladım, Devam Et"
              onPress={() => setShowInfoModal(false)}
              style={styles.infoModalButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderLogoEditorModal = () => (
    <Modal
      visible={showLogoEditor}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLogoEditor(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.logoEditorModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Logo Düzenleyici</Text>
            <TouchableOpacity onPress={() => setShowLogoEditor(false)}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.logoEditorBody}>
            <Text style={styles.logoEditorInstructions}>
              Logoyu sürükleyerek konumlandırın ve boyutunu ayarlayın
            </Text>
            
            <View style={styles.logoCanvas}>
              {currentProduct && (
                <Image source={{ uri: currentProduct.image }} style={styles.logoCanvasProduct} resizeMode="cover" />
              )}
              <Animated.View
                style={[
                  styles.logoDraggable,
                  {
                    transform: [
                      { translateX: (logoPan as any).x },
                      { translateY: (logoPan as any).y },
                      { scale: logoScale },
                    ],
                  },
                ]}
                {...(panResponder as any).panHandlers}
              >
                <Image source={{ uri: currentCustomization?.customizations.logo! }} style={styles.logoDraggableImage} />
              </Animated.View>
            </View>

            <View style={styles.scaleControls}>
              <TouchableOpacity
                style={styles.scaleButton}
                onPress={() => setLogoScale(prev => Math.max(0.4, parseFloat((prev - 0.1).toFixed(2))))}
              >
                <Icon name="remove" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <Text style={styles.scaleValue}>{Math.round(logoScale * 100)}%</Text>
              <TouchableOpacity
                style={styles.scaleButton}
                onPress={() => setLogoScale(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
              >
                <Icon name="add" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLogoEditor(false)}
            >
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
            <ModernButton
              title="Kaydet"
              onPress={handleSaveLogoTransform}
              style={styles.saveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderBendenForm = () => (
    <Modal
      visible={showBendenForm}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBendenForm(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.bendenFormModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Benden Formu</Text>
            <TouchableOpacity onPress={() => setShowBendenForm(false)}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.bendenFormContent} showsVerticalScrollIndicator={false}>
            {/* Kişisel Bilgiler */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Kişisel Bilgiler</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ad Soyad *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.name}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, name: text }))}
                  placeholder="Adınızı ve soyadınızı girin"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-posta *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.email}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, email: text }))}
                  placeholder="ornek@email.com"
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Telefon *</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.phone}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, phone: text }))}
                  placeholder="0555 123 45 67"
                  keyboardType="phone-pad"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şirket</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.company}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, company: text }))}
                  placeholder="Şirket adı (opsiyonel)"
                />
              </View>
            </View>

            {/* Ürün Bilgileri */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Ürün Bilgileri</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Beden</Text>
                <View style={styles.sizeSelector}>
                  {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map(size => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeOption,
                        bendenForm.size === size && styles.sizeOptionSelected
                      ]}
                      onPress={() => setBendenForm(prev => ({ ...prev, size }))}
                    >
                      <Text style={[
                        styles.sizeOptionText,
                        bendenForm.size === size && styles.sizeOptionTextSelected
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Adet</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.quantity.toString()}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, quantity: parseInt(text) || 1 }))}
                  placeholder="1"
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Proje Detayları */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Proje Detayları</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ürün Açıklaması *</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={bendenForm.description}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, description: text }))}
                  placeholder="İstediğiniz ürünü detaylı olarak açıklayın..."
                  multiline
                  numberOfLines={4}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Özel İstekler</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={bendenForm.specialRequests}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, specialRequests: text }))}
                  placeholder="Özel isteklerinizi yazın..."
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Bütçe</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.budget}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, budget: text }))}
                  placeholder="Bütçe aralığınız (opsiyonel)"
                />
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teslim Tarihi</Text>
                <TextInput
                  style={styles.textInput}
                  value={bendenForm.deadline}
                  onChangeText={(text) => setBendenForm(prev => ({ ...prev, deadline: text }))}
                  placeholder="İstediğiniz teslim tarihi (opsiyonel)"
                />
              </View>
            </View>

            {/* İletişim Tercihi */}
            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>İletişim Tercihi</Text>
              
              <View style={styles.contactOptions}>
                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    bendenForm.preferredContact === 'email' && styles.contactOptionSelected
                  ]}
                  onPress={() => setBendenForm(prev => ({ ...prev, preferredContact: 'email' }))}
                >
                  <Icon 
                    name="email" 
                    size={20} 
                    color={bendenForm.preferredContact === 'email' ? Colors.primary : Colors.textMuted} 
                  />
                  <Text style={[
                    styles.contactOptionText,
                    bendenForm.preferredContact === 'email' && styles.contactOptionTextSelected
                  ]}>
                    E-posta
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.contactOption,
                    bendenForm.preferredContact === 'phone' && styles.contactOptionSelected
                  ]}
                  onPress={() => setBendenForm(prev => ({ ...prev, preferredContact: 'phone' }))}
                >
                  <Icon 
                    name="phone" 
                    size={20} 
                    color={bendenForm.preferredContact === 'phone' ? Colors.primary : Colors.textMuted} 
                  />
                  <Text style={[
                    styles.contactOptionText,
                    bendenForm.preferredContact === 'phone' && styles.contactOptionTextSelected
                  ]}>
                    Telefon
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <ModernButton
              title="Formu Gönder"
              onPress={handleBendenFormSubmit}
              style={styles.submitButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCustomizationModal = () => (
    <Modal
      visible={customizationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setCustomizationModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Ürün Özelleştirme</Text>
            <TouchableOpacity onPress={() => setCustomizationModal(false)}>
              <Icon name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.customizationContent}>
            <View style={styles.customizationSection}>
              <Text style={styles.sectionTitle}>Yazı Ekle</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ürün üzerine yazılacak metin"
                value={currentCustomization?.customizations.text || ''}
                onChangeText={(text) => setCurrentCustomization(prev => 
                  prev ? {
                    ...prev,
                    customizations: { ...prev.customizations, text }
                  } : null
                )}
              />
            </View>

            <View style={styles.customizationSection}>
              <Text style={styles.sectionTitle}>Logo Yükle</Text>
              <TouchableOpacity style={styles.logoButton} onPress={handleLogoUpload}>
                <Icon name="image" size={24} color={Colors.primary} />
                <Text style={styles.logoButtonText}>
                  {currentCustomization?.customizations.logo ? 'Logo Değiştir' : 'Logo Seç'}
                </Text>
              </TouchableOpacity>
              {currentCustomization?.customizations.logo && (
                <View style={styles.logoPreview}>
                  <Image
                    source={{ uri: currentCustomization.customizations.logo }}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.removeLogoButton}
                    onPress={() => setCurrentCustomization(prev => 
                      prev ? {
                        ...prev,
                        customizations: { ...prev.customizations, logo: null }
                      } : null
                    )}
                  >
                    <Icon name="close" size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {currentCustomization?.customizations.logo && (
              <View style={styles.customizationSection}>
                <Text style={styles.sectionTitle}>Logo Boyutu (cm)</Text>
                <View style={styles.logoSizeContainer}>
                  <View style={styles.logoSizeInput}>
                    <Text style={styles.logoSizeLabel}>Genişlik:</Text>
                    <TextInput
                      style={styles.logoSizeTextInput}
                      value={logoWidth.toString()}
                      onChangeText={(text) => {
                        const num = parseFloat(text) || 1;
                        setLogoWidth(Math.max(0.5, Math.min(50, num)));
                      }}
                      keyboardType="numeric"
                      placeholder="5"
                    />
                    <Text style={styles.logoSizeUnit}>cm</Text>
                  </View>
                  <View style={styles.logoSizeInput}>
                    <Text style={styles.logoSizeLabel}>Yükseklik:</Text>
                    <TextInput
                      style={styles.logoSizeTextInput}
                      value={logoHeight.toString()}
                      onChangeText={(text) => {
                        const num = parseFloat(text) || 1;
                        setLogoHeight(Math.max(0.5, Math.min(50, num)));
                      }}
                      keyboardType="numeric"
                      placeholder="5"
                    />
                    <Text style={styles.logoSizeUnit}>cm</Text>
                  </View>
                </View>
                <Text style={styles.logoSizeNote}>
                  Logo boyutu: {logoWidth}cm x {logoHeight}cm
                </Text>
              </View>
            )}

            <View style={styles.customizationSection}>
              <Text style={styles.sectionTitle}>Renk Seç</Text>
              <View style={styles.colorOptions}>
                {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'].map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorOption, { backgroundColor: color }]}
                    onPress={() => setCurrentCustomization(prev => 
                      prev ? {
                        ...prev,
                        customizations: { ...prev.customizations, color }
                      } : null
                    )}
                  />
                ))}
              </View>
            </View>

            {/* Beden ve Adet - Her zaman görünür */}
            <View style={styles.customizationSection}>
              <Text style={styles.sectionTitle}>Beden ve Adet</Text>
              
              <View style={styles.bendenForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Beden</Text>
                  <View style={styles.sizeSelector}>
                    {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'].map(size => (
                      <TouchableOpacity
                        key={size}
                        style={[
                          styles.sizeOption,
                          currentCustomization?.customizations.bendenSize === size && styles.sizeOptionSelected
                        ]}
                        onPress={() => setCurrentCustomization(prev => 
                          prev ? {
                            ...prev,
                            customizations: { ...prev.customizations, bendenSize: size }
                          } : null
                        )}
                      >
                        <Text style={[
                          styles.sizeOptionText,
                          currentCustomization?.customizations.bendenSize === size && styles.sizeOptionTextSelected
                        ]}>
                          {size}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Adet *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={currentCustomization?.customizations.bendenQuantity?.toString() || ''}
                    onChangeText={(text) => setCurrentCustomization(prev => 
                      prev ? {
                        ...prev,
                        customizations: { 
                          ...prev.customizations, 
                          bendenQuantity: parseInt(text) || 1 
                        }
                      } : null
                    )}
                    placeholder="Kaç adet istiyorsunuz?"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Özel Açıklama</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={currentCustomization?.customizations.bendenDescription || ''}
                    onChangeText={(text) => setCurrentCustomization(prev => 
                      prev ? {
                        ...prev,
                        customizations: { ...prev.customizations, bendenDescription: text }
                      } : null
                    )}
                    placeholder="Özel beden talebinizi detaylı olarak açıklayın..."
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>

            {currentCustomization?.customizations.logo && (
              <View style={styles.customizationSection}>
                <Text style={styles.sectionTitle}>Logo Konumlandırma</Text>
                <TouchableOpacity style={styles.logoEditButton} onPress={handleOpenLogoEditor}>
                  <Icon name="edit" size={20} color={Colors.primary} />
                  <Text style={styles.logoEditButtonText}>Logo Düzenle</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.customizationSection}>
              <Text style={styles.sectionTitle}>Konum Seç</Text>
              <View style={styles.positionOptions}>
                {[
                  { value: 'front', label: 'Ön' },
                  { value: 'back', label: 'Arka' },
                  { value: 'left', label: 'Sol' },
                  { value: 'right', label: 'Sağ' },
                ].map(({ value, label }) => {
                  const isSelected = currentCustomization?.customizations.position === (value as any);
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.positionOption,
                        isSelected && styles.positionOptionSelected
                      ]}
                      onPress={() => setCurrentCustomization(prev => 
                        prev ? {
                          ...prev,
                          customizations: { ...prev.customizations, position: value as any }
                        } : null
                      )}
                    >
                      <Text style={[
                        styles.positionText,
                        isSelected && styles.positionTextSelected
                      ]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <ModernButton
              title="Kaydet"
              onPress={handleSaveCustomization}
              style={styles.saveButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Özel Üretim Talebi</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingSpinner}>
            <Icon name="refresh" size={48} color={Colors.primary} />
          </View>
          <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
          <Text style={styles.loadingSubText}>Lütfen bekleyin</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Özel Üretim Talebi</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Arama ve Filtre */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ürün ara..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Kategori Filtreleri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryContainer}>
          <TouchableOpacity
            style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryChipText, !selectedCategory && styles.categoryChipTextActive]}>
              Tümü
            </Text>
          </TouchableOpacity>
          {(categories || []).map(category => (
            <TouchableOpacity
              key={`cat-${category}`}
              style={[styles.categoryChip, selectedCategory === category && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === category && styles.categoryChipTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Seçilen Ürünler */}
        {selectedProducts.length > 0 && (
          <View style={styles.selectedProductsSection}>
            <Text style={styles.sectionTitle}>Seçilen Ürünler ({selectedProducts.length})</Text>
            {selectedProducts.map((item, index) => (
              <View key={`sel-${item.product.id}-${index}`}>
                {renderSelectedProduct(item, index)}
              </View>
            ))}
          </View>
        )}

        {/* Ürün Listesi */}
        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Ürün Seçin</Text>
          <FlatList
            data={filteredProducts}
            renderItem={renderProductCard}
            keyExtractor={(item) => `prod-${item.id}`}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.productsGrid}
          />
        </View>

      </ScrollView>

      {/* Alt Buton */}
      {selectedProducts.length > 0 && (
        <View style={styles.bottomContainer}>
          <View style={styles.orderSummary}>
            <Text style={styles.orderSummaryText}>
              Toplam: {selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} adet
            </Text>
            <Text style={styles.orderSummaryText}>
              Ürün: {selectedProducts.length} çeşit
            </Text>
          </View>
          <ModernButton
            title={`Talep Gönder (${selectedProducts.reduce((sum, item) => sum + item.quantity, 0)} adet)`}
            onPress={handleSubmitRequest}
            style={styles.submitButton}
          />
        </View>
      )}

      {renderInfoModal()}
      {renderQuantityModal()}
      {renderCustomizationModal()}
      {renderLogoEditorModal()}
      {renderBendenForm()}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  searchContainer: {
    marginVertical: Spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.text,
  },
  categoryContainer: {
    marginBottom: Spacing.md,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: Colors.textOnPrimary,
  },
  selectedProductsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  selectedProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    padding: Spacing.md,
  },
  selectedProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: Spacing.md,
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedProductQuantity: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  customizationText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  productsSection: {
    marginBottom: Spacing.xl,
  },
  productsGrid: {
    paddingBottom: Spacing.xl,
  },
  productCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  productImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: Spacing.sm,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomContainer: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  orderSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  orderSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  submitButton: {
    backgroundColor: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  productDetails: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  modalProductImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalProductPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: Spacing.lg,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: Spacing.md,
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    width: 60,
    height: 40,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    marginHorizontal: Spacing.sm,
  },
  customizeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
  },
  customizationContent: {
    maxHeight: 400,
    padding: Spacing.lg,
  },
  customizationSection: {
    marginBottom: Spacing.lg,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
  },
  logoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  logoButtonText: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  logoPreview: {
    marginTop: Spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  logoEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    marginTop: Spacing.sm,
  },
  logoEditButtonText: {
    marginLeft: Spacing.sm,
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  logoEditorModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: '95%',
    maxHeight: '90%',
  },
  logoEditorBody: {
    padding: Spacing.lg,
  },
  logoEditorInstructions: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  cancelButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginRight: Spacing.md,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  logoCanvas: {
    position: 'relative',
    width: '100%',
    height: 240,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginTop: Spacing.sm,
  },
  logoCanvasProduct: {
    width: '100%',
    height: '100%',
    opacity: 0.9,
  },
  logoDraggable: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  logoDraggableImage: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFFFFF',
  },
  scaleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  scaleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  scaleValue: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  removeLogoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  selectedLogoImage: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginLeft: Spacing.xs,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: Spacing.xs,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  positionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  positionOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    margin: Spacing.xs,
  },
  positionOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  positionTextSelected: {
    color: Colors.textOnPrimary,
  },
  positionText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  // Bilgilendirme Modal Stilleri
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  infoModalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
    ...Shadows.large,
  },
  infoModalHeader: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  infoModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  infoModalBody: {
    maxHeight: 400,
    padding: Spacing.lg,
  },
  
  // Benden Form Styles
  bendenSection: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    ...Shadows.small,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  bendenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  bendenButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  bendenButtonSubtext: {
    fontSize: 12,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  bendenFormModal: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    borderRadius: 16,
    maxHeight: '90%',
    ...Shadows.large,
  },
  bendenFormContent: {
    maxHeight: 500,
    padding: Spacing.lg,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  sizeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sizeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  sizeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sizeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  sizeOptionTextSelected: {
    color: Colors.textOnPrimary,
  },
  contactOptions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  contactOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  contactOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  contactOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: Spacing.xs,
  },
  contactOptionTextSelected: {
    color: Colors.primary,
  },
  
  // Benden Form Styles (Customization Modal içinde)
  bendenOptions: {
    marginBottom: Spacing.md,
  },
  bendenOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  bendenOptionSelected: {
    backgroundColor: Colors.primary + '20',
    borderColor: Colors.primary,
  },
  bendenOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: Spacing.sm,
  },
  bendenOptionTextSelected: {
    color: Colors.primary,
  },
  bendenForm: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  sizeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  sizeOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sizeOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sizeOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  sizeOptionTextSelected: {
    color: Colors.surface,
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Loading styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.background,
  },
  loadingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.medium,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  loadingSubText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  infoSection: {
    gap: Spacing.lg,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoItemContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  infoItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  infoItemText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textMuted,
  },
  infoModalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  infoModalButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
  },
  logoSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  logoSizeInput: {
    flex: 1,
    marginHorizontal: Spacing.xs,
  },
  logoSizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  logoSizeTextInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.surface,
    textAlign: 'center',
  },
  logoSizeUnit: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  logoSizeNote: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  productImageContainer: {
    position: 'relative',
  },
});
