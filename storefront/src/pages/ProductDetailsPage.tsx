import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronRight, Heart, ShieldCheck, ShoppingCart, Star, Truck, X, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { getPartImage } from '@/lib/partImages';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/ProductCard';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';

export default function ProductDetailsPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { products, brands, models, isLoading } = useStorefrontData();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [products, productId]
  );

  if (!product && !isLoading) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-muted-foreground">Product not found.</p>
        <Button className="mt-4" onClick={() => navigate('/products')}>Back to Products</Button>
      </div>
    );
  }

  if (!product) {
    return <div className="container py-20 text-center text-muted-foreground">Loading product details…</div>;
  }

  const relatedProducts = products
    .filter((item) => item.id !== product.id && (item.brandId === product.brandId || item.partType === product.partType))
    .slice(0, 4);

  const brand = brands.find((item) => item.id === product.brandId);
  const model = models.find((item) => item.id === product.modelId);
  const fallbackImage = product.image || getPartImage(product.partType) || '/placeholder.svg';

  const galleryImages: string[] =
    product.images.length > 0 ? product.images : [fallbackImage];

  const activeImage = galleryImages[activeIndex] ?? fallbackImage;

  return (
    <div className="container py-8">
      <div className="flex items-center gap-2 mb-6 text-sm text-muted-foreground">
        <button onClick={() => navigate('/')} className="hover:text-foreground">Home</button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={() => navigate('/products')} className="hover:text-foreground">Products</button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Image gallery */}
        <div className="flex flex-col gap-3">
          <div
            className="relative rounded-2xl border bg-muted/40 flex items-center justify-center min-h-[360px] cursor-zoom-in group overflow-hidden"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={activeImage}
              alt={product.partType}
              className="max-h-80 object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <div className="absolute bottom-3 right-3 bg-background/70 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <ZoomIn className="h-4 w-4 text-foreground" />
            </div>
          </div>

          {galleryImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {galleryImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`shrink-0 rounded-lg border-2 bg-muted/40 p-1 w-16 h-16 flex items-center justify-center transition-colors ${
                    idx === activeIndex
                      ? 'border-primary'
                      : 'border-transparent hover:border-muted-foreground/40'
                  }`}
                >
                  <img src={url} alt={`${product.partType} view ${idx + 1}`} className="max-h-12 object-contain" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex flex-wrap gap-2 mb-3">
            {product.bestSeller && <Badge className="bg-accent text-accent-foreground">Best Seller</Badge>}
            {product.newArrival && <Badge className="bg-success text-success-foreground">New Arrival</Badge>}
            {product.discountPercent > 0 && <Badge className="bg-destructive text-destructive-foreground">-{product.discountPercent}% OFF</Badge>}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <p className="text-muted-foreground mt-2">{brand?.name} • {model?.name} • {product.partType}</p>

          <div className="flex items-center gap-2 mt-4">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <p className="text-3xl font-bold text-primary">₹{product.discountPrice.toLocaleString()}</p>
            {product.discountPercent > 0 && <p className="text-lg text-muted-foreground line-through">₹{product.price.toLocaleString()}</p>}
          </div>

          <p className="mt-5 text-muted-foreground">{product.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">SKU: {product.sku}</p>
          <p className="mt-1 text-sm text-muted-foreground">Warranty: {product.warranty}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button size="lg" className="flex-1" disabled={!product.inStock} onClick={() => addToCart(product)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              {product.inStock ? 'Add to Cart' : 'Out of Stock'}
            </Button>
            <Button size="lg" variant="outline" onClick={() => toggleWishlist(product.id)}>
              <Heart className={`h-4 w-4 mr-2 ${isInWishlist(product.id) ? 'fill-destructive text-destructive' : ''}`} />
              {isInWishlist(product.id) ? 'Saved' : 'Save'}
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mt-8 text-sm">
            <div className="rounded-xl border p-3 flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> Fast dispatch in 24 hours</div>
            <div className="rounded-xl border p-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Genuine quality guarantee</div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-3xl p-2 bg-background/95 backdrop-blur">
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-3 right-3 z-10 bg-background rounded-full p-1.5 shadow"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center min-h-[400px]">
              <img src={activeImage} alt={product.partType} className="max-h-[70vh] max-w-full object-contain" />
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 justify-center overflow-x-auto pb-1">
                {galleryImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIndex(idx)}
                    className={`shrink-0 rounded-lg border-2 bg-muted/40 p-1 w-14 h-14 flex items-center justify-center transition-colors ${
                      idx === activeIndex ? 'border-primary' : 'border-transparent hover:border-muted-foreground/40'
                    }`}
                  >
                    <img src={url} alt={`view ${idx + 1}`} className="max-h-10 object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <section className="mt-14">
        <h2 className="text-2xl font-bold mb-6">You may also like</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {relatedProducts.map((item) => (
            <ProductCard key={item.id} product={item} onQuickView={onQuickView} onViewDetails={() => navigate(`/products/${item.id}`)} />
          ))}
        </div>
      </section>
    </div>
  );
}
