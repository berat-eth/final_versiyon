import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface ImageGalleryProps {
  images: string[];
  mainImage?: string;
  style?: any;
  showThumbnails?: boolean;
  onImagePress?: (imageUrl: string, index: number) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  mainImage,
  style,
  showThumbnails = true,
  onImagePress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  // Sadece geçerli görselleri birleştir ve tekrarları kaldır
  const allImages = [];
  
  // Ana görseli ekle (eğer varsa)
  if (mainImage && mainImage.trim() !== '') {
    allImages.push(mainImage);
  }
  
  // Diğer görselleri ekle (tekrarları kaldırarak)
  images.forEach(img => {
    if (img && img.trim() !== '' && !allImages.includes(img)) {
      allImages.push(img);
    }
  });
  
  const validImages = allImages;

  if (validImages.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholder}>
          <Icon name="image" size={48} color="#ccc" />
          <Text style={styles.placeholderText}>Görsel Yok</Text>
        </View>
      </View>
    );
  }

  const handleImagePress = (index: number) => {
    setCurrentIndex(index);
    if (onImagePress) {
      onImagePress(validImages[index], index);
    } else {
      setModalVisible(true);
    }
  };

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % validImages.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + validImages.length) % validImages.length);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Ana Görsel */}
      <TouchableOpacity
        style={styles.mainImageContainer}
        onPress={() => handleImagePress(0)}
        activeOpacity={0.9}
      >
        <Image
          source={{ uri: validImages[currentIndex] }}
          style={styles.mainImage}
          resizeMode="cover"
        />
        
        {/* Görsel Sayısı Göstergesi */}
        {validImages.length > 1 && (
          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {currentIndex + 1} / {validImages.length}
            </Text>
          </View>
        )}

        {/* Önceki/Sonraki Butonları */}
        {validImages.length > 1 && (
          <>
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={prevImage}
            >
              <Icon name="chevron-left" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={nextImage}
            >
              <Icon name="chevron-right" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </TouchableOpacity>

      {/* Küçük Görseller */}
      {showThumbnails && validImages.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.thumbnailsContainer}
          contentContainerStyle={styles.thumbnailsContent}
        >
          {validImages.map((image, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.thumbnail,
                index === currentIndex && styles.activeThumbnail
              ]}
              onPress={() => setCurrentIndex(index)}
            >
              <Image
                source={{ uri: image }}
                style={styles.thumbnailImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Tam Ekran Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalCounter}>
              {currentIndex + 1} / {validImages.length}
            </Text>
          </View>

          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / screenWidth
              );
              setCurrentIndex(index);
            }}
            style={styles.modalScrollView}
          >
            {validImages.map((image, index) => (
              <View key={index} style={styles.modalImageContainer}>
                <Image
                  source={{ uri: image }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>

          {/* Modal Navigasyon Butonları */}
          {validImages.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.modalNavButton, styles.modalPrevButton]}
                onPress={prevImage}
              >
                <Icon name="chevron-left" size={32} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalNavButton, styles.modalNextButton]}
                onPress={nextImage}
              >
                <Icon name="chevron-right" size={32} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
  },
  mainImageContainer: {
    position: 'relative',
    backgroundColor: '#f8f9fa',
  },
  mainImage: {
    width: '100%',
    height: 300,
  },
  imageCounter: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
  },
  prevButton: {
    left: 12,
  },
  nextButton: {
    right: 12,
  },
  thumbnailsContainer: {
    marginTop: 12,
  },
  thumbnailsContent: {
    paddingHorizontal: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeThumbnail: {
    borderColor: '#007AFF',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCounter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalScrollView: {
    flex: 1,
  },
  modalImageContainer: {
    width: screenWidth,
    height: screenHeight - 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: screenWidth,
    height: screenHeight - 100,
  },
  modalNavButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
  },
  modalPrevButton: {
    left: 20,
  },
  modalNextButton: {
    right: 20,
  },
});
