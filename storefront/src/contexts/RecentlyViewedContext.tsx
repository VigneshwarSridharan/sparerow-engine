import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '@/types';

interface RecentlyViewedContextType {
  recentlyViewed: string[];
  addToRecentlyViewed: (productId: string) => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextType | undefined>(undefined);

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('recentlyViewed') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('recentlyViewed', JSON.stringify(recentlyViewed)); }, [recentlyViewed]);

  const addToRecentlyViewed = useCallback((id: string) => {
    setRecentlyViewed(prev => [id, ...prev.filter(i => i !== id)].slice(0, 20));
  }, []);

  return (
    <RecentlyViewedContext.Provider value={{ recentlyViewed, addToRecentlyViewed }}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  const ctx = useContext(RecentlyViewedContext);
  if (!ctx) throw new Error('useRecentlyViewed must be used within RecentlyViewedProvider');
  return ctx;
}
