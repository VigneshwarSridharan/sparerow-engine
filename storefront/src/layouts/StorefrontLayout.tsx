import { Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { CartDrawer } from '@/components/CartDrawer';
import { ProductQuickView } from '@/components/ProductQuickView';
import { Checkout } from '@/components/Checkout';
import { Footer } from '@/components/Footer';
import { useCart } from '@/contexts/CartContext';
import { Product } from '@/types';

export interface StorefrontOutletContext {
  onQuickView: (product: Product) => void;
}

export function StorefrontLayout() {
  const navigate = useNavigate();
  const { setIsCartOpen } = useCart();
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <Header onSearchOpen={() => setSearchOpen(true)} onCartOpen={() => setIsCartOpen(true)} onNavigate={navigate} />
      <SearchBar
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onProductSelect={setQuickViewProduct}
        onNavigateToCatalog={(query) => navigate(`/products?search=${encodeURIComponent(query)}`)}
      />
      <CartDrawer onCheckout={() => setCheckoutOpen(true)} />
      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      <Checkout isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <Outlet context={{ onQuickView: setQuickViewProduct } satisfies StorefrontOutletContext} />
      <Footer />
    </div>
  );
}
