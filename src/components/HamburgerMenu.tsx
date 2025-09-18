import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  Pressable,
  Image,
} from 'react-native';

interface HamburgerMenuProps {
  navigation: any;
  categories: string[];
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ navigation, categories }) => {
  const [isVisible, setIsVisible] = useState(false);

  const handleCategoryPress = (categoryName: string) => {
    setIsVisible(false);
    navigation.navigate('Products', {
      screen: 'ProductsMain',
      params: { category: categoryName },
    });
  };

  const handleProfilePress = () => {
    setIsVisible(false);
    navigation.navigate('Profile');
  };

  return (
    <>
      <TouchableOpacity
        style={styles.hamburgerButton}
        onPress={() => setIsVisible(true)}
      >
        <View style={{ width: 20, height: 16, justifyContent: 'space-between' }}>
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
          <View style={{ width: '100%', height: 2, backgroundColor: '#000000', borderRadius: 1 }} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsVisible(false)}
        >
          <Pressable
            style={styles.menuContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.header}>
                <Text style={styles.headerTitle}>Kategoriler</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsVisible(false)}
                >
                  <Image 
                    source={require('../../assets/folder delete.png')} 
                    style={{ width: 16, height: 16, tintColor: '#FFFFFF' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.categoriesContainer}
                showsVerticalScrollIndicator={false}
              >
                {(categories || []).map((category, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.categoryItem}
                    onPress={() => handleCategoryPress(category)}
                  >
                    <Text style={styles.categoryName}>{category}</Text>
                    <Image 
                      source={require('../../assets/verified-tick.png')} 
                      style={{ width: 12, height: 12, tintColor: '#999' }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                ))}

                <View style={styles.divider} />

                <TouchableOpacity
                  style={styles.categoryItem}
                  onPress={handleProfilePress}
                >
                  <Text style={styles.categoryName}>Hesabım</Text>
                  <Image 
                    source={require('../../assets/verified-tick.png')} 
                    style={{ width: 12, height: 12, tintColor: '#999' }}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    padding: 10,
  },
  hamburgerIcon: {
    fontSize: 24,
    color: '#000000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#1A1A2E',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  categoriesContainer: {
    flex: 1,
    paddingTop: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoryName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  categoryArrow: {
    fontSize: 20,
    color: '#999',
  },
  divider: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
});