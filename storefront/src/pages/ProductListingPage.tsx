import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FilterDrawer } from '@/components/FilterDrawer';
import { ProductCard } from '@/components/ProductCard';
import { FilterState, SortOption } from '@/types';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';

function buildInitialFilters(searchParams: URLSearchParams, maxPrice: number): FilterState {
  return {
    brandId: searchParams.get('brand') || undefined,
    modelId: searchParams.get('model') || undefined,
    partTypes: searchParams.get('category') ? [searchParams.get('category') as string] : [],
    priceRange: [0, maxPrice],
    inStockOnly: false,
    searchQuery: searchParams.get('search') || '',
    sort: 'featured',
  };
}

export default function ProductListingPage() {
  const { brands, models, products, isLoading } = useStorefrontData();
  const maxPrice = Math.max(0, ...products.map((product) => product.price));
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(() => buildInitialFilters(searchParams, maxPrice));

  useEffect(() => {
    if (maxPrice > 0 && filters.priceRange[1] === 0) {
      setFilters((prev) => ({ ...prev, priceRange: [0, maxPrice] }));
    }
  }, [maxPrice, filters.priceRange]);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    if (filters.brandId) result = result.filter((product) => product.brandId === filters.brandId);
    if (filters.modelId) result = result.filter((product) => product.modelId === filters.modelId);
    if (filters.partTypes.length > 0) result = result.filter((product) => filters.partTypes.includes(product.partType));
    if (filters.inStockOnly) result = result.filter((product) => product.inStock);
    result = result.filter((product) => product.discountPrice >= filters.priceRange[0] && product.discountPrice <= filters.priceRange[1]);

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter((product) => {
        const brand = brands.find((item) => item.id === product.brandId);
        const model = models.find((item) => item.id === product.modelId);
        return (
          product.name.toLowerCase().includes(query) ||
          product.partType.toLowerCase().includes(query) ||
          product.sku.toLowerCase().includes(query) ||
          brand?.name.toLowerCase().includes(query) ||
          model?.name.toLowerCase().includes(query)
        );
      });
    }

    switch (filters.sort) {
      case 'price-low':
        result.sort((a, b) => a.discountPrice - b.discountPrice);
        break;
      case 'price-high':
        result.sort((a, b) => b.discountPrice - a.discountPrice);
        break;
      case 'newest':
        result.sort((a, b) => Number(b.newArrival) - Number(a.newArrival));
        break;
      case 'best-selling':
        result.sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller));
        break;
      default:
        result.sort((a, b) => Number(b.featured) - Number(a.featured));
        break;
    }

    return result;
  }, [filters]);

  const updateFilters = (nextFilters: FilterState) => {
    setFilters(nextFilters);
    const nextParams = new URLSearchParams();
    if (nextFilters.brandId) nextParams.set('brand', nextFilters.brandId);
    if (nextFilters.modelId) nextParams.set('model', nextFilters.modelId);
    if (nextFilters.searchQuery) nextParams.set('search', nextFilters.searchQuery);
    if (nextFilters.partTypes[0]) nextParams.set('category', nextFilters.partTypes[0]);
    setSearchParams(nextParams);
  };

  return (
    <div className="container py-8">
      {isLoading && <p className="mb-4 text-sm text-muted-foreground">Syncing product catalog…</p>}
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <button onClick={() => navigate('/')} className="hover:text-foreground">Home</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">Products</span>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setFilterDrawerOpen(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Filters
          </Button>
          <span className="text-sm text-muted-foreground">{filteredProducts.length} products</span>
        </div>
        <Select value={filters.sort} onValueChange={(value) => updateFilters({ ...filters, sort: value as SortOption })}>
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
        <FilterDrawer
          filters={filters}
          onFiltersChange={updateFilters}
          isOpen={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          maxPrice={maxPrice}
        />
        <div className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-lg text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters</p>
              <Button variant="outline" className="mt-4" onClick={() => updateFilters(buildInitialFilters(new URLSearchParams(), maxPrice))}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickView={onQuickView}
                  onViewDetails={() => navigate(`/products/${product.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
