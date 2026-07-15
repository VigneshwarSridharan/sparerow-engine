import { ArrowRight, ChevronRight, Search, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandCard } from '@/components/BrandCard';
import { ProductCard } from '@/components/ProductCard';
import { SmartPartFinder } from '@/components/SmartPartFinder';
import { Testimonials, TrustBadges } from '@/components/Footer';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { fetchStorefrontHomeFilters, fetchStorefrontProductSections } from '@/lib/graphql/storefront';

const SECTION_LIMIT = 8;

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: SECTION_LIMIT }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
      ))}
    </div>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();

  const { data: homeFilters, isLoading: isHomeFiltersLoading } = useQuery({
    queryKey: ['home-filters'],
    queryFn: fetchStorefrontHomeFilters,
  });
  const { data: productSections, isLoading: isProductSectionsLoading } = useQuery({
    queryKey: ['product-sections', SECTION_LIMIT],
    queryFn: () => fetchStorefrontProductSections(SECTION_LIMIT),
  });

  const brands = homeFilters?.brands ?? [];
  const categories = homeFilters?.categories ?? [];
  const featuredProducts = productSections?.featured ?? [];
  const bestSellers = productSections?.bestSellers ?? [];
  const newArrivals = productSections?.newArrivals ?? [];

  return (
    <>
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
              Find genuine spare parts for Apple, Samsung, Xiaomi and more. Fast shipping, warranty support, and curated quality.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Button size="lg" onClick={() => navigate('/products')}>
                Browse All Parts <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/products')}>
                <Search className="h-4 w-4 mr-2" /> Search Parts
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SmartPartFinder onQuickView={onQuickView} brands={brands} categories={categories} />

      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Shop by Brand</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
              View Catalog <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isHomeFiltersLoading ? (
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} onClick={() => navigate(`/products?brand=${brand.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">Popular Categories</h2>
          <div className="flex gap-2 flex-wrap">
            {categories.slice(0, 12).map((category) => (
              <Button
                key={category.id}
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => navigate(`/products?category=${encodeURIComponent(category.name)}`)}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/products')}>
              View All <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isProductSectionsLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} onViewDetails={() => navigate(`/products/${product.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">Best Sellers</h2>
          {isProductSectionsLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} onViewDetails={() => navigate(`/products/${product.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-12">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6">New Arrivals</h2>
          {isProductSectionsLoading ? (
            <ProductGridSkeleton />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} onQuickView={onQuickView} onViewDetails={() => navigate(`/products/${product.id}`)} />
              ))}
            </div>
          )}
        </div>
      </section>

      <TrustBadges />
      <Testimonials />
    </>
  );
}
