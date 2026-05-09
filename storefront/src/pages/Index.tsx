import { useState, useMemo } from 'react';
import { Search, ArrowRight, Zap, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/Header';
import { SearchBar } from '@/components/SearchBar';
import { BrandCard } from '@/components/BrandCard';
import { ModelCard } from '@/components/ModelCard';
import { ProductCard } from '@/components/ProductCard';
import { ProductQuickView } from '@/components/ProductQuickView';
import { CartDrawer } from '@/components/CartDrawer';
import { FilterDrawer } from '@/components/FilterDrawer';
import { Checkout } from '@/components/Checkout';
import { Footer, TrustBadges, Testimonials } from '@/components/Footer';
import { SmartPartFinder } from '@/components/SmartPartFinder';
import { brands, models, products, partTypes } from '@/data/seedData';
import { Product, FilterState, SortOption, Brand, Model } from '@/types';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';

type AppSection = 'home' | 'brands' | 'catalog' | 'deals' | 'wishlist' | 'checkout';

const Index = () => {
  const [section, setSection] = useState<AppSection>('home');
  const [searchOpen, setSearchOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const { setIsCartOpen } = useCart();
  const { wishlistIds } = useWishlist();

  const maxPrice = useMemo(() => Math.max(...products.map(p => p.price)), []);

  const [filters, setFilters] = useState<FilterState>({
    brandId: undefined, modelId: undefined, partTypes: [], priceRange: [0, maxPrice],
    inStockOnly: false, searchQuery: '', sort: 'featured',
  });

  const filteredProducts = useMemo(() => {
    let result = products;
    if (filters.brandId) result = result.filter(p => p.brandId === filters.brandId);
    if (filters.modelId) result = result.filter(p => p.modelId === filters.modelId);
    if (filters.partTypes.length > 0) result = result.filter(p => filters.partTypes.includes(p.partType));
    if (filters.inStockOnly) result = result.filter(p => p.inStock);
    result = result.filter(p => p.discountPrice >= filters.priceRange[0] && p.discountPrice <= filters.priceRange[1]);
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(p => {
        const brand = brands.find(b => b.id === p.brandId);
        const model = models.find(m => m.id === p.modelId);
        return p.name.toLowerCase().includes(q) || p.partType.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || brand?.name.toLowerCase().includes(q) || model?.name.toLowerCase().includes(q);
      });
    }
    switch (filters.sort) {
      case 'price-low': result.sort((a, b) => a.discountPrice - b.discountPrice); break;
      case 'price-high': result.sort((a, b) => b.discountPrice - a.discountPrice); break;
      case 'newest': result.sort((a, b) => (b.newArrival ? 1 : 0) - (a.newArrival ? 1 : 0)); break;
      case 'best-selling': result.sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0)); break;
      default: result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }, [filters, maxPrice]);

  const navigateTo = (s: string) => {
    setSection(s as AppSection);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBrandSelect = (brand: Brand) => {
    setFilters(f => ({ ...f, brandId: brand.id, modelId: undefined }));
    setSection('catalog');
  };

  const handleModelSelect = (model: Model) => {
    setFilters(f => ({ ...f, modelId: model.id }));
    setSection('catalog');
  };

  const handleSearchNav = (query: string) => {
    setFilters(f => ({ ...f, searchQuery: query }));
    setSection('catalog');
  };

  const featuredProducts = products.filter(p => p.featured).slice(0, 8);
  const bestSellers = products.filter(p => p.bestSeller).slice(0, 8);
  const newArrivals = products.filter(p => p.newArrival).slice(0, 8);
  const wishlistProducts = products.filter(p => wishlistIds.includes(p.id));

  return (
    <div className="min-h-screen bg-background">
      <Header onSearchOpen={() => setSearchOpen(true)} onCartOpen={() => setIsCartOpen(true)} onNavigate={navigateTo} />
      <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} onProductSelect={setQuickViewProduct} onNavigateToCatalog={handleSearchNav} />
      <CartDrawer onCheckout={() => setCheckoutOpen(true)} />
      <ProductQuickView product={quickViewProduct} isOpen={!!quickViewProduct} onClose={() => setQuickViewProduct(null)} />
      <Checkout isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} />

      {section === 'home' && (
        <>
          {/* Hero */}
          <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5">
            <div className="container py-16 md:py-24">
              <div className="max-w-2xl">
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                  <Zap className="h-3 w-3 mr-1" /> Trusted by 10,000+ repair shops
                </Badge>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                  Premium Mobile <span className="text-primary">Spare Parts</span> Store
                </h1>
                <p className="text-lg text-muted-foreground mt-4 max-w-lg">
                  Find genuine spare parts for Apple, Samsung, Xiaomi & more. 595+ products with fast delivery & warranty.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mt-8">
                  <Button size="lg" onClick={() => navigateTo('catalog')}>
                    Browse All Parts <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setSearchOpen(true)}>
                    <Search className="h-4 w-4 mr-2" /> Search Parts
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Smart Part Finder */}
          <SmartPartFinder onQuickView={setQuickViewProduct} />

          {/* Shop by Brand */}
          <section className="py-12">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Shop by Brand</h2>
                <Button variant="ghost" size="sm" onClick={() => navigateTo('brands')}>View All <ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
                {brands.map(brand => (
                  <BrandCard key={brand.id} brand={brand} onClick={handleBrandSelect} />
                ))}
              </div>
            </div>
          </section>

          {/* Popular Categories */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
              <div className="flex gap-2 flex-wrap">
                {partTypes.slice(0, 12).map(pt => (
                  <Button key={pt} variant="outline" size="sm" className="rounded-full" onClick={() => { setFilters(f => ({ ...f, partTypes: [pt] })); navigateTo('catalog'); }}>
                    {pt}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Products */}
          <section className="py-12">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Featured Products</h2>
                <Button variant="ghost" size="sm" onClick={() => { setFilters(f => ({ ...f, sort: 'featured' as SortOption })); navigateTo('catalog'); }}>View All <ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {featuredProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
              </div>
            </div>
          </section>

          {/* Best Sellers */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Best Sellers</h2>
                <Button variant="ghost" size="sm" onClick={() => { setFilters(f => ({ ...f, sort: 'best-selling' as SortOption })); navigateTo('catalog'); }}>View All <ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {bestSellers.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
              </div>
            </div>
          </section>

          {/* New Arrivals */}
          <section className="py-12">
            <div className="container">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">New Arrivals</h2>
                <Button variant="ghost" size="sm" onClick={() => { setFilters(f => ({ ...f, sort: 'newest' as SortOption })); navigateTo('catalog'); }}>View All <ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {newArrivals.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
              </div>
            </div>
          </section>

          <TrustBadges />
          <Testimonials />
        </>
      )}

      {section === 'brands' && (
        <div className="container py-8">
          <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
            <button onClick={() => navigateTo('home')} className="hover:text-foreground">Home</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Brands</span>
          </div>
          <h1 className="text-3xl font-bold mb-8">All Brands</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {brands.map(brand => (
              <BrandCard key={brand.id} brand={brand} onClick={handleBrandSelect} />
            ))}
          </div>

          {/* Show models for selected brand */}
          {filters.brandId && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">
                {brands.find(b => b.id === filters.brandId)?.name} Models
              </h2>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {models.filter(m => m.brandId === filters.brandId).map(model => (
                  <ModelCard key={model.id} model={model} onClick={handleModelSelect} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {section === 'catalog' && (
        <div className="container py-8">
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <button onClick={() => navigateTo('home')} className="hover:text-foreground">Home</button>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Products</span>
            {filters.brandId && <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{brands.find(b => b.id === filters.brandId)?.name}</span>
            </>}
            {filters.modelId && <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{models.find(m => m.id === filters.modelId)?.name}</span>
            </>}
          </div>

          {/* Model selector when brand is selected */}
          {filters.brandId && !filters.modelId && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Select Model</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {models.filter(m => m.brandId === filters.brandId).map(model => (
                  <ModelCard key={model.id} model={model} onClick={handleModelSelect} isSelected={filters.modelId === model.id} />
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFilterDrawerOpen(true)}>
                <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
              </Button>
              <span className="text-sm text-muted-foreground">{filteredProducts.length} products</span>
            </div>
            <Select value={filters.sort} onValueChange={(v) => setFilters(f => ({ ...f, sort: v as SortOption }))}>
              <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="best-selling">Best Selling</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-6">
            <FilterDrawer filters={filters} onFiltersChange={setFilters} isOpen={filterDrawerOpen} onClose={() => setFilterDrawerOpen(false)} maxPrice={maxPrice} />
            <div className="flex-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-lg text-muted-foreground">No products found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
                  <Button variant="outline" className="mt-4" onClick={() => setFilters({ brandId: undefined, modelId: undefined, partTypes: [], priceRange: [0, maxPrice], inStockOnly: false, searchQuery: '', sort: 'featured' })}>Clear Filters</Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {section === 'deals' && (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-2">Hot Deals</h1>
          <p className="text-muted-foreground mb-8">Save big on mobile spare parts</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.filter(p => p.discountPercent >= 25).slice(0, 16).map(p => (
              <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />
            ))}
          </div>
        </div>
      )}

      {section === 'wishlist' && (
        <div className="container py-8">
          <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
          <p className="text-muted-foreground mb-8">{wishlistProducts.length} items saved</p>
          {wishlistProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">Your wishlist is empty</p>
              <Button className="mt-4" onClick={() => navigateTo('catalog')}>Browse Products</Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {wishlistProducts.map(p => <ProductCard key={p.id} product={p} onQuickView={setQuickViewProduct} />)}
            </div>
          )}
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Index;
