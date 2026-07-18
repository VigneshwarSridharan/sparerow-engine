export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
  productCount: number;
}

export interface Model {
  id: string;
  name: string;
  brandId: string;
  modelNumber: string;
  slug: string;
  image: string;
  productCount: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  attributes: Record<string, string>;
  priceInMinor: string;
  price: number;
  quantityOnHand: number;
  availableToSell: number;
  inStock: boolean;
  imageUrl: string | null;
}

export interface Product {
  id: string;
  name: string;
  brandId: string;
  brandName: string;
  modelId: string;
  modelName: string;
  partType: string;
  price: number;
  discountPercent: number;
  discountPrice: number;
  sku: string;
  inStock: boolean;
  stockQty: number;
  image: string;
  images: string[];
  description: string;
  warranty: string;
  rating: number;
  reviewCount: number;
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  variants: ProductVariant[];
}

export interface CartItem {
  product: Product;
  quantity: number;
  variantSku?: string;
}

export interface WishlistItem {
  productId: string;
  addedAt: Date;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  customer: CustomerInfo;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  couponDiscount?: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered';
  createdAt: Date;
}

export type SortOption = 'featured' | 'price-low' | 'price-high' | 'newest' | 'best-selling';

export interface FilterState {
  brandId?: string;
  modelId?: string;
  partTypes: string[];
  priceRange: [number, number];
  inStockOnly: boolean;
  searchQuery: string;
  sort: SortOption;
}
