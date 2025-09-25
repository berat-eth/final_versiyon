import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import apiService from '../utils/api-service';

export default function DealershipApplicationScreen() {
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [message, setMessage] = useState('');
  const [estimatedMonthlyRevenue, setEstimatedMonthlyRevenue] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): string | null => {
    if (!companyName.trim()) return 'Lütfen firma adını giriniz.';
    if (!fullName.trim()) return 'Lütfen ad soyad giriniz.';
    if (!phone.trim()) return 'Lütfen telefon numarası giriniz.';
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Lütfen geçerli bir e-posta giriniz.';
    if (!city.trim()) return 'Lütfen il/şehir bilgisini giriniz.';
    if (!estimatedMonthlyRevenue.trim() || isNaN(Number(estimatedMonthlyRevenue))) return 'Lütfen aylık tahmini cironuzu sayısal olarak giriniz.';
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) {
      Alert.alert('Eksik Bilgi', err);
      return;
    }
    try {
      setLoading(true);
      const payload = {
        companyName: companyName.trim(),
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city.trim(),
        message: message.trim(),
        source: 'mobile-app',
        estimatedMonthlyRevenue: Number(estimatedMonthlyRevenue),
      };
      const res = await apiService.post('/dealership/applications', payload);
      if (res?.success) {
        Alert.alert(
          'Başarılı', 
          'Başvurunuz alınmıştır. En kısa sürede sizinle iletişime geçeceğiz.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Formu temizle
                setCompanyName('');
                setFullName('');
                setPhone('');
                setEmail('');
                setCity('');
                setMessage('');
                setEstimatedMonthlyRevenue('');
                
                // Başvurular listesine yönlendir
                navigation.navigate('DealershipApplications');
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', res?.message || 'Başvuru gönderilemedi. Lütfen tekrar deneyin.');
      }
    } catch (e) {
      Alert.alert('Hata', 'Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 20, fontWeight: '700', marginBottom: 16 }}>Bayilik Başvurusu</Text>

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Firma Adı</Text>
      <TextInput value={companyName} onChangeText={setCompanyName} placeholder="Örn: ABC Ticaret A.Ş." style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Ad Soyad</Text>
      <TextInput value={fullName} onChangeText={setFullName} placeholder="Örn: Ahmet Yılmaz" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Telefon</Text>
      <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xx xxx xx xx" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>E-posta</Text>
      <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="mail@ornek.com" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>İl/Şehir</Text>
      <TextInput value={city} onChangeText={setCity} placeholder="Örn: İstanbul" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Aylık Tahmini Ciro (TL)</Text>
      <TextInput value={estimatedMonthlyRevenue} onChangeText={setEstimatedMonthlyRevenue} keyboardType="numeric" placeholder="Örn: 250000" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, marginBottom: 12 }} />

      <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Mesaj (opsiyonel)</Text>
      <TextInput value={message} onChangeText={setMessage} multiline placeholder="Kısaca başvurunuzu anlatın" style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 }} />

      <TouchableOpacity onPress={submit} disabled={loading} style={{ backgroundColor: '#1f6feb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' }}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Başvuruyu Gönder</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}


