// Product Types
export interface ProductVariation {
  id: number;
  productId: number;
  name: string; // e.g., "Size", "Color", "Material"
  options: ProductVariationOption[];
}

export interface ProductVariationOption {
  id: number;
  variationId: number;
  name: string; // e.g., "Size", "Color", "Material"
  value: string; // e.g., "XL", "Red", "Cotton"
  priceModifier: number; // Additional cost for this option
  stock: number;
  sku?: string;
  image?: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  images?: string[]; // Additional product images
  image1?: string; // Ayrı sütunlarda saklanan görseller
  image2?: string;
  image3?: string;
  image4?: string;
  image5?: string;
  stock: number;
  brand: string;
  rating: number;
  reviewCount: number;
  variations?: ProductVariation[];
  hasVariations: boolean;
  lastUpdated?: string; // API'den gelen son güncelleme tarihi
  externalId?: string; // Dış sistem ID'si
  source?: string; // Veri kaynağı
  sku?: string; // Stok kodu
  discountAmount?: number; // İndirim miktarı
  originalPrice?: number; // Orijinal fiyat
  finalPrice?: number; // İndirimli fiyat
  variationString?: string; // Varyasyon string'i
}

// Review Types
export interface Review {
  id: number;
  productId: number;
  userId: number;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// User Types
export interface User {
  id: number;
  user_id?: string; // 8 basamaklı kullanıcı ID'si
  name: string;
  email: string;
  password: string;
  phone: string;
  gender?: 'male' | 'female' | 'unspecified';
  address: string;
  birthDate?: string; // DD-MM-YYYY formatında doğum tarihi
  createdAt: string;
}

// Cart Types
export interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  userId: number;
  product?: Product;
  selectedVariations?: { [key: string]: ProductVariationOption };
  variationString?: string; // Human readable variation string
}

// Order Types
export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
  items: OrderItem[];
  shippingAddress: string;
  paymentMethod: string;
  city?: string;
  district?: string;
  fullAddress?: string;
  updatedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  quantity: number;
  price: number;
  productName?: string;
  productDescription?: string;
  productCategory?: string;
  productBrand?: string;
  productImage?: string;
  product?: Product;
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

// Category Types
export const Categories = {
  JACKETS: 'Ceketler',
  PANTS: 'Pantolonlar',
  SHOES: 'Ayakkabılar',
  BACKPACKS: 'Sırt Çantaları',
  TENTS: 'Çadırlar',
  SLEEPING_BAGS: 'Uyku Tulumları',
  ACCESSORIES: 'Aksesuarlar'
} as const;