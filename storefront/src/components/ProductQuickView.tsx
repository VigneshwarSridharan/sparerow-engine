import { Product } from '@/types';
import { ShoppingCart, Heart, Star, Shield, RotateCcw, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useRecentlyViewed } from '@/contexts/RecentlyViewedContext';
import { cn } from '@/lib/utils';
import { getPartImage } from '@/lib/partImages';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductQuickView({ product, isOpen, onClose }: ProductQuickViewProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToRecentlyViewed } = useRecentlyViewed();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (product) { addToRecentlyViewed(product.id); setQty(1); }
  }, [product]);

  if (!product) return null;

  const previewSrc = product.image || getPartImage(product.partType);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-left">Product Details</SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-6">
          <div className="aspect-square rounded-xl bg-muted flex items-center justify-center p-4">
            {previewSrc ? (
              <img src={previewSrc} alt={product.partType} className="max-h-full max-w-full object-contain" loading="lazy" />
            ) : (
              <div className="text-center">
                <span className="text-5xl font-bold text-muted-foreground/20">{product.partType.slice(0, 2).toUpperCase()}</span>
                <p className="text-sm text-muted-foreground/40 mt-2">{product.partType}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {product.discountPercent > 0 && <Badge className="bg-destructive text-destructive-foreground">-{product.discountPercent}% OFF</Badge>}
            {product.bestSeller && <Badge className="bg-accent text-accent-foreground">Best Seller</Badge>}
            {product.newArrival && <Badge className="bg-success text-success-foreground">New Arrival</Badge>}
            {product.inStock ? (
              product.stockQty <= 15 ? <Badge className="bg-warning text-warning-foreground">Only {product.stockQty} left</Badge> : <Badge className="bg-success text-success-foreground">In Stock</Badge>
            ) : <Badge variant="secondary">Out of Stock</Badge>}
          </div>

          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{product.brandName} · {product.modelName}</p>
            <h2 className="text-xl font-bold mt-1">{product.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{product.partType}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{product.rating}</span>
              <span className="text-sm text-muted-foreground">({product.reviewCount} reviews)</span>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">₹{product.discountPrice.toLocaleString()}</span>
            {product.discountPercent > 0 && (
              <span className="text-lg text-muted-foreground line-through">₹{product.price.toLocaleString()}</span>
            )}
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">SKU</span><span className="font-medium">{product.sku}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Brand</span><span className="font-medium">{product.brandName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Model</span><span className="font-medium">{product.modelName}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Part Type</span><span className="font-medium">{product.partType}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Warranty</span><span className="font-medium">{product.warranty}</span></div>
          </div>

          <Separator />

          <p className="text-sm text-muted-foreground">{product.description}</p>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 text-center">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium">Genuine Parts</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 text-center">
              <RotateCcw className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium">Easy Returns</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/50 text-center">
              <Truck className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-medium">Fast Shipping</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center border rounded-lg">
              <Button variant="ghost" size="sm" onClick={() => setQty(Math.max(1, qty - 1))}>-</Button>
              <span className="w-10 text-center text-sm font-medium">{qty}</span>
              <Button variant="ghost" size="sm" onClick={() => setQty(qty + 1)}>+</Button>
            </div>
            <Button className="flex-1" disabled={!product.inStock} onClick={() => { addToCart(product, qty); onClose(); }}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => toggleWishlist(product.id)}
          >
            <Heart className={cn("h-4 w-4 mr-2", isInWishlist(product.id) ? "fill-destructive text-destructive" : "")} />
            {isInWishlist(product.id) ? 'Remove from Wishlist' : 'Add to Wishlist'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
