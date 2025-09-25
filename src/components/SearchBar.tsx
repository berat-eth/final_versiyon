import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
  FlatList
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Ürün ara...',
  onSubmit,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  

  const showDropdown = useMemo(() => {
    if (!isFocused) return false;
    // Öneri sistemi kaldırıldı: sadece input boşken geçmiş göster
    return (!value || value.trim().length === 0) && history.length > 0;
  }, [isFocused, value, history.length]);

  useEffect(() => {
    loadHistory();
  }, []);

  const HISTORY_KEY = 'search_history_v1';

  const loadHistory = async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setHistory(parsed.filter((t) => typeof t === 'string'));
        }
      }
    } catch {}
  };

  const saveToHistory = async (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    const next = [clean, ...history.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, 10);
    setHistory(next);
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch {}
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch {}
    setHistory([]);
  };

  const handleSubmit = () => {
    if (onSubmit) onSubmit();
    saveToHistory(value);
    setIsFocused(false);
  };

  const handleSelect = (term: string) => {
    onChangeText(term);
    setTimeout(() => {
      if (onSubmit) onSubmit();
      saveToHistory(term);
      setIsFocused(false);
    }, 0);
  };


  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Image
          source={require('../../assets/search-interface-symbol.png')}
          style={styles.searchIcon}
          resizeMode="contain"
        />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#8A8A8A"
          onSubmitEditing={handleSubmit}
          returnKeyType="search"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <View style={styles.dropdownHeaderRow}>
            <Text style={styles.dropdownHeader}>Geçmiş Aramalar</Text>
            {history.length > 0 && (
              <TouchableOpacity onPress={clearHistory}>
                <Text style={styles.clearHistory}>Temizle</Text>
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={history}
            keyExtractor={(item) => `h_${item}`}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemRow} onPress={() => handleSelect(item)}>
                <Image
                  source={require('../../assets/history.png')}
                  style={styles.historyIcon}
                  resizeMode="contain"
                />
                <Text style={styles.itemText}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>Geçmiş yok</Text>}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#1A1A2E',
  },
  searchIcon: {
    width: 18,
    height: 18,
    marginRight: 12,
    tintColor: '#1A1A2E',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  clearIcon: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 8,
    fontWeight: '600',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 260,
    overflow: 'hidden',
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownHeader: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  clearHistory: {
    fontSize: 12,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemText: {
    fontSize: 15,
    color: '#1A1A2E',
    fontWeight: '500',
  },
  historyIcon: {
    width: 16,
    height: 16,
    marginRight: 8,
    tintColor: '#6b7280',
  },
  suggestIcon: {
    marginRight: 8,
    fontSize: 14,
  },
  emptyText: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#999999',
    fontSize: 13,
  },
});