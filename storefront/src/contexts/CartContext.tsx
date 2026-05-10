import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '@/types';
import { toast } from '@/hooks/use-toast';
import { useStorefrontData } from './StorefrontDataContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getCartTotal: () => number;
  getCartCount: () => number;
  couponCode: string;
  setCouponCode: (code: string) => void;
  couponDiscount: number;
  applyCoupon: (code: string) => Promise<boolean>;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { promoCodes, products } = useStorefrontData();
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);
  useEffect(() => {
    if (products.length === 0) return;
    setItems((prev) =>
      prev.filter((item) => products.some((product) => product.sku === item.product.sku))
    );
  }, [products]);

  const addToCart = useCallback((product: Product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { product, quantity }];
    });

    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems(prev => prev.filter(i => i.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setItems(prev => prev.map(i => i.product.id === productId ? { ...i, quantity } : i));
  }, [removeFromCart]);

  const clearCart = useCallback(() => { setItems([]); setCouponCode(''); setCouponDiscount(0); }, []);

  const getCartTotal = useCallback(() => {
    const subtotal = items.reduce((sum, i) => sum + i.product.discountPrice * i.quantity, 0);
    return subtotal - (subtotal * couponDiscount / 100);
  }, [items, couponDiscount]);

  const getCartCount = useCallback(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const applyCoupon = useCallback(async (code: string) => {
    const normalizedCode = code.toUpperCase();
    const subtotalMinor = items.reduce(
      (sum, item) => sum + Math.round(item.product.discountPrice * 100) * item.quantity,
      0
    );
    const promo = promoCodes.find((item) => item.code === normalizedCode);
    if (promo && subtotalMinor >= promo.minOrderSubtotalInMinor) {
      const discount = promo.discountPercent;
      setCouponCode(code.toUpperCase());
      setCouponDiscount(discount);
      toast({ title: 'Coupon applied!', description: `${discount}% discount applied` });
      return true;
    }
    toast({
      title: 'Invalid coupon',
      description: 'Please enter a valid code or meet minimum order value',
      variant: 'destructive',
    });
    return false;
  }, [items, promoCodes]);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, getCartCount, couponCode, setCouponCode, couponDiscount, applyCoupon, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
