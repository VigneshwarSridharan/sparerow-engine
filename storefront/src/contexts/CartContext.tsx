import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CartItem, Product, Order, CustomerInfo } from '@/types';
import { toast } from '@/hooks/use-toast';

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
  applyCoupon: (code: string) => boolean;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const COUPONS: Record<string, number> = {
  'SAVE10': 10, 'SPARE20': 20, 'FIRST15': 15, 'BULK25': 25,
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(items)); }, [items]);

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

  const applyCoupon = useCallback((code: string) => {
    const discount = COUPONS[code.toUpperCase()];
    if (discount) {
      setCouponCode(code.toUpperCase());
      setCouponDiscount(discount);
      toast({ title: 'Coupon applied!', description: `${discount}% discount applied` });
      return true;
    }
    toast({ title: 'Invalid coupon', description: 'Please enter a valid coupon code', variant: 'destructive' });
    return false;
  }, []);

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
