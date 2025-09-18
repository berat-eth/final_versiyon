/**
 * Yaş hesaplama ve doğrulama yardımcı fonksiyonları
 */

/**
 * Doğum tarihinden yaşı hesaplar
 * @param birthDate - Doğum tarihi (DD-MM-YYYY formatında)
 * @returns Hesaplanan yaş
 */
export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  
  try {
    // DD-MM-YYYY formatını parse et
    const [day, month, year] = birthDate.split('-').map(Number);
    
    // Geçerli tarih kontrolü
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return 0;
    }
    
    // Geçerli tarih aralığı kontrolü
    if (year < 1900 || year > new Date().getFullYear()) {
      return 0;
    }
    
    if (month < 1 || month > 12) {
      return 0;
    }
    
    if (day < 1 || day > 31) {
      return 0;
    }
    
    const birth = new Date(year, month - 1, day);
    const today = new Date();
    
    // Doğum tarihi gelecekte olamaz
    if (birth > today) {
      return 0;
    }
    
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Henüz doğum günü gelmemişse yaşı 1 azalt
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  } catch (error) {
    console.error('Yaş hesaplama hatası:', error);
    return 0;
  }
};

/**
 * Kullanıcının 18 yaşında veya daha büyük olup olmadığını kontrol eder
 * @param birthDate - Doğum tarihi (DD-MM-YYYY formatında)
 * @returns 18 yaş kontrolü sonucu
 */
export const isAdult = (birthDate: string): boolean => {
  const age = calculateAge(birthDate);
  return age >= 18;
};

/**
 * Doğum tarihi formatını kontrol eder
 * @param birthDate - Doğum tarihi string'i
 * @returns Format geçerliliği
 */
export const isValidBirthDateFormat = (birthDate: string): boolean => {
  if (!birthDate) return false;
  
  // DD-MM-YYYY formatı kontrolü
  const dateRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  if (!dateRegex.test(birthDate)) {
    return false;
  }
  
  const [day, month, year] = birthDate.split('-').map(Number);
  
  // Tarih geçerliliği kontrolü
  const date = new Date(year, month - 1, day);
  return (
    date.getDate() === day &&
    date.getMonth() === month - 1 &&
    date.getFullYear() === year
  );
};

/**
 * Yaş kontrolü ile birlikte doğum tarihi validasyonu
 * @param birthDate - Doğum tarihi (DD-MM-YYYY formatında)
 * @returns Validasyon sonucu ve hata mesajı
 */
export const validateBirthDate = (birthDate: string): { isValid: boolean; message: string } => {
  if (!birthDate) {
    return { isValid: false, message: 'Doğum tarihi gereklidir' };
  }
  
  if (!isValidBirthDateFormat(birthDate)) {
    return { isValid: false, message: 'Geçerli bir doğum tarihi giriniz (GG-AA-YYYY)' };
  }
  
  const age = calculateAge(birthDate);
  
  if (age === 0) {
    return { isValid: false, message: 'Geçersiz doğum tarihi' };
  }
  
  if (age < 18) {
    return { 
      isValid: false, 
      message: `18 yaşından küçük kullanıcılar kayıt olamaz. Mevcut yaşınız: ${age}` 
    };
  }
  
  if (age > 120) {
    return { isValid: false, message: 'Geçersiz doğum tarihi' };
  }
  
  return { isValid: true, message: '' };
};
