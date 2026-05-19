import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronRight, Heart, ShieldCheck, ShoppingCart, Star, Truck, X, ZoomIn } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { getPartImage } from '@/lib/partImages';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { ProductCard } from '@/components/ProductCard';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';
import { ProductVariant } from '@/types';
import {
  fetchProductReviews,
  createProductReview,
  type StorefrontReview,
} from '@/lib/graphql/storefront';

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? 'fill-accent text-accent' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  );
}

function ReviewCard({ review }: { review: StorefrontReview }) {
  const date = new Date(review.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return (
    <div className="border rounded-xl p-4 space-y-2">
      <div className="flex items-center justify-between">
        <StarRow rating={review.rating} />
        {review.verifiedPurchase && (
          <span className="text-xs text-success font-medium">Verified Purchase</span>
        )}
      </div>
      <p className="font-semibold text-sm">{review.title}</p>
      {review.body && <p className="text-sm text-muted-foreground">{review.body}</p>}
      <p className="text-xs text-muted-foreground">{date}</p>
    </div>
  );
}

function WriteReviewForm({ sku, onSuccess }: { sku: string; onSuccess: () => void }) {
  const { token } = useCustomerAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createProductReview({ sku, rating, title, body: body || undefined }, token),
    onSuccess: () => {
      setSubmitted(true);
      onSuccess();
    },
  });

  if (submitted) {
    return (
      <div className="rounded-xl border p-5 text-center text-sm text-muted-foreground">
        Thank you! Your review has been submitted and will appear after approval.
      </div>
    );
  }

  const displayRating = hoveredRating || rating;

  return (
    <form
      className="rounded-xl border p-5 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!rating || !title.trim()) return;
        mutation.mutate();
      }}
    >
      <h3 className="font-semibold">Write a Review</h3>

      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
            >
              <Star
                className={`h-6 w-6 cursor-pointer transition-colors ${
                  star <= displayRating ? 'fill-accent text-accent' : 'text-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-muted-foreground" htmlFor="review-title">
          Title <span className="text-destructive">*</span>
        </label>
        <input
          id="review-title"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          placeholder="Summarise your experience"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-muted-foreground" htmlFor="review-body">
          Details (optional)
        </label>
        <textarea
          id="review-body"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
          placeholder="Tell others what you think about this product"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
      </div>

      {mutation.isError && (
        <p className="text-sm text-destructive">
          {(mutation.error as Error)?.message || 'Failed to submit review. Please try again.'}
        </p>
      )}

      <Button
        type="submit"
        disabled={!rating || !title.trim() || mutation.isPending}
        className="w-full sm:w-auto"
      >
        {mutation.isPending ? 'Submitting…' : 'Submit Review'}
      </Button>
    </form>
  );
}

export default function ProductDetailsPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { products, brands, models, isLoading } = useStorefrontData();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const queryClient = useQueryClient();

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const product = useMemo(
    () => products.find((item) => item.id === productId),
    [products, productId]
  );

  const hasVariants = (product?.variants.length ?? 0) > 0;

  // These hooks must be before any early returns to satisfy Rules of Hooks
  const variantAttributeKeys = useMemo(() => {
    if (!product) return [];
    const keys = new Set<string>();
    product.variants.forEach((v) => Object.keys(v.attributes).forEach((k) => keys.add(k)));
    return Array.from(keys);
  }, [product]);

  const variantsByAttr = useMemo(() => {
    if (!product) return new Map<string, Set<string>>();
    const map = new Map<string, Set<string>>();
    for (const key of variantAttributeKeys) {
      const values = new Set<string>();
      product.variants.forEach((v) => { if (v.attributes[key]) values.add(v.attributes[key]); });
      map.set(key, values);
    }
    return map;
  }, [product, variantAttributeKeys]);

  const [reviewPage, setReviewPage] = useState(1);

  const { data: reviewsData } = useQuery({
    queryKey: ['product-reviews', product?.sku, reviewPage],
    queryFn: () => fetchProductReviews(product!.sku, reviewPage),
    enabled: !!product?.sku,
  });

  const handleReviewSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['product-reviews', product?.sku] });
  };

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
  const galleryImages: string[] = product.images.length > 0 ? product.images : [fallbackImage];
  const activeImage = (selectedVariant?.imageUrl) || galleryImages[activeIndex] || fallbackImage;

  const displayPrice = selectedVariant ? selectedVariant.price : product.discountPrice;
  const displayInStock = selectedVariant ? selectedVariant.inStock : product.inStock;

  function selectVariantByAttr(key: string, value: string) {
    const current = selectedVariant?.attributes ?? {};
    const next = { ...current, [key]: value };
    const match = product.variants.find((v) =>
      Object.entries(next).every(([k, val]) => v.attributes[k] === val)
    );
    setSelectedVariant(match ?? null);
  }

  function handleAddToCart() {
    if (hasVariants && !selectedVariant) return;
    addToCart(product, 1, selectedVariant?.sku);
  }

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
            <StarRow rating={Math.round(product.rating)} />
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground">({product.reviewCount} reviews)</span>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <p className="text-3xl font-bold text-primary">₹{displayPrice.toLocaleString()}</p>
            {!selectedVariant && product.discountPercent > 0 && (
              <p className="text-lg text-muted-foreground line-through">₹{product.price.toLocaleString()}</p>
            )}
          </div>

          {hasVariants && (
            <div className="mt-5 space-y-4">
              {variantAttributeKeys.map((key) => (
                <div key={key}>
                  <p className="text-sm font-medium capitalize mb-2">{key}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.from(variantsByAttr.get(key) ?? []).map((value) => {
                      const isSelected = selectedVariant?.attributes[key] === value;
                      const matchingVariant = product.variants.find(
                        (v) => v.attributes[key] === value
                      );
                      const isAvailable = matchingVariant?.inStock ?? false;
                      return (
                        <button
                          key={value}
                          onClick={() => selectVariantByAttr(key, value)}
                          disabled={!isAvailable}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground'
                              : isAvailable
                              ? 'border-border hover:border-primary'
                              : 'border-border text-muted-foreground line-through opacity-50 cursor-not-allowed'
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              {hasVariants && !selectedVariant && (
                <p className="text-sm text-muted-foreground">Please select a variant to add to cart.</p>
              )}
            </div>
          )}

          <p className="mt-5 text-muted-foreground">{product.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">SKU: {selectedVariant ? selectedVariant.sku : product.sku}</p>
          <p className="mt-1 text-sm text-muted-foreground">Warranty: {product.warranty}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <Button
              size="lg"
              className="flex-1"
              disabled={!displayInStock || (hasVariants && !selectedVariant)}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {!displayInStock ? 'Out of Stock' : hasVariants && !selectedVariant ? 'Select a variant' : 'Add to Cart'}
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
          <DialogTitle className="sr-only">{product.name}</DialogTitle>
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
        <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

        {product.reviewCount === 0 && !reviewsData?.reviews.length && (
          <p className="text-muted-foreground mb-6">No reviews yet. Be the first to review this product.</p>
        )}

        {reviewsData && reviewsData.reviews.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-4xl font-bold">{product.rating}</span>
              <div>
                <StarRow rating={Math.round(product.rating)} />
                <p className="text-sm text-muted-foreground mt-1">{product.reviewCount} reviews</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {reviewsData.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>

            {reviewsData.pageCount > 1 && (
              <div className="flex items-center gap-3 justify-center mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewPage <= 1}
                  onClick={() => setReviewPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {reviewPage} of {reviewsData.pageCount}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewPage >= reviewsData.pageCount}
                  onClick={() => setReviewPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}

        <WriteReviewForm sku={product.sku} onSuccess={handleReviewSuccess} />
      </section>

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
