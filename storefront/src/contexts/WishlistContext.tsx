import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';

interface WishlistContextType {
  wishlistIds: string[];
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  toggleWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('wishlist', JSON.stringify(wishlistIds)); }, [wishlistIds]);

  const addToWishlist = useCallback((id: string) => {
    setWishlistIds(prev => prev.includes(id) ? prev : [...prev, id]);
    toast({ title: 'Added to wishlist' });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    setWishlistIds(prev => prev.filter(i => i !== id));
  }, []);

  const toggleWishlist = useCallback((id: string) => {
    setWishlistIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const isInWishlist = useCallback((id: string) => wishlistIds.includes(id), [wishlistIds]);

  return (
    <WishlistContext.Provider value={{ wishlistIds, addToWishlist, removeFromWishlist, toggleWishlist, isInWishlist }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
