import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Colors } from '../theme/colors';
import { Spacing } from '../theme/theme';

interface DatePickerProps {
  value: string;
  onDateChange: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const { width } = Dimensions.get('window');

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onDateChange,
  placeholder = 'Gün-Ay-Yıl seçin',
  disabled = false,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const days = Array.from(
    { length: getDaysInMonth(selectedYear, selectedMonth) },
    (_, i) => i + 1
  );

  const formatDate = (year: number, month: number, day: number) => {
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${dayStr}-${monthStr}-${year}`;
  };

  const handleConfirm = () => {
    const formattedDate = formatDate(selectedYear, selectedMonth, selectedDay);
    onDateChange(formattedDate);
    setModalVisible(false);
  };

  const handleCancel = () => {
    setModalVisible(false);
  };

  const openModal = () => {
    if (value) {
      const [day, month, year] = value.split('-').map(Number);
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
    }
    setModalVisible(true);
  };

  const renderPickerColumn = (
    data: any[],
    selectedValue: number,
    onValueChange: (value: number) => void,
    labelKey?: string
  ) => (
    <ScrollView
      style={styles.pickerColumn}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.pickerContent}
    >
      {data.map((item, index) => {
        const value = typeof item === 'object' ? item.value : item;
        const label = typeof item === 'object' ? item[labelKey || 'label'] : item.toString();
        const isSelected = value === selectedValue;
        
        return (
          <TouchableOpacity
            key={index}
            style={[styles.pickerItem, isSelected && styles.pickerItemSelected]}
            onPress={() => onValueChange(value)}
          >
            <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.inputContainer, disabled && styles.inputDisabled]}
        onPress={openModal}
        disabled={disabled}
      >
        <Icon name="cake" size={20} color="#6b7280" style={styles.inputIcon} />
        <Text style={[styles.inputText, !value && styles.placeholderText]}>
          {value || placeholder}
        </Text>
        <Icon name="keyboard-arrow-down" size={24} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={handleCancel}>
                <Text style={styles.cancelButton}>İptal</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Doğum Tarihi Seçin</Text>
              <TouchableOpacity onPress={handleConfirm}>
                <Text style={styles.confirmButton}>Tamam</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              {renderPickerColumn(years, selectedYear, setSelectedYear)}
              {renderPickerColumn(months, selectedMonth, setSelectedMonth, 'label')}
              {renderPickerColumn(days, selectedDay, setSelectedDay)}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.6,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area için
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  pickerContainer: {
    flexDirection: 'row',
    height: 200,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerContent: {
    paddingVertical: 20,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 8,
    marginHorizontal: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    fontWeight: '600',
    color: Colors.primary,
  },
});
