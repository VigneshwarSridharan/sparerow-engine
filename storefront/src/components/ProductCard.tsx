import { Product } from '@/types';
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { cn } from '@/lib/utils';
import { getPartImage } from '@/lib/partImages';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';

interface ProductCardProps {
  product: Product;
  onQuickView: (product: Product) => void;
  onViewDetails?: (product: Product) => void;
}

export function ProductCard({ product, onQuickView, onViewDetails }: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { brands, models } = useStorefrontData();
  const brand = brands.find(b => b.id === product.brandId);
  const model = models.find(m => m.id === product.modelId);
  const inWishlist = isInWishlist(product.id);
  const partImage = product.image ? product.image : getPartImage(product.partType);

  return (
    <div
      className="group bg-card rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => onViewDetails?.(product)}
      role={onViewDetails ? 'button' : undefined}
    >
      <div className="relative aspect-square bg-muted p-4 flex items-center justify-center">
        {partImage ? (
          <img src={partImage} alt={product.partType} className="h-3/4 w-3/4 object-contain" loading="lazy" />
        ) : (
          <div className="text-center">
            <span className="text-3xl font-bold text-muted-foreground/30">{product.partType.slice(0, 2).toUpperCase()}</span>
            <p className="text-xs text-muted-foreground/50 mt-1">{product.partType}</p>
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.discountPercent > 0 && (
            <Badge className="bg-destructive text-destructive-foreground text-[10px] px-1.5">-{product.discountPercent}%</Badge>
          )}
          {product.bestSeller && <Badge className="bg-accent text-accent-foreground text-[10px] px-1.5">Best Seller</Badge>}
          {product.newArrival && <Badge className="bg-success text-success-foreground text-[10px] px-1.5">New</Badge>}
          {!product.inStock && <Badge variant="secondary" className="text-[10px] px-1.5">Out of Stock</Badge>}
          {product.inStock && product.stockQty <= 15 && <Badge className="bg-warning text-warning-foreground text-[10px] px-1.5">Low Stock</Badge>}
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); toggleWishlist(product.id); }}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 hover:bg-background transition-colors"
        >
          <Heart className={cn("h-4 w-4", inWishlist ? "fill-destructive text-destructive" : "text-muted-foreground")} />
        </button>

        <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button size="sm" variant="secondary" className="shadow-lg" onClick={() => onQuickView(product)}>
            <Eye className="h-4 w-4 mr-1" /> Quick View
          </Button>
        </div>
      </div>

      <div className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{brand?.name} · {model?.name}</p>
        <h3 className="font-medium text-sm mt-1 leading-tight line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">{product.partType}</p>

        <div className="flex items-center gap-1 mt-1.5">
          <Star className="h-3 w-3 fill-accent text-accent" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="font-bold text-primary">₹{product.discountPrice.toLocaleString()}</span>
          {product.discountPercent > 0 && (
            <span className="text-xs text-muted-foreground line-through">₹{product.price.toLocaleString()}</span>
          )}
        </div>

        <Button
          size="sm"
          className="w-full mt-3"
          disabled={!product.inStock}
          onClick={(e) => { e.stopPropagation(); addToCart(product); }}
        >
          <ShoppingCart className="h-4 w-4 mr-1" />
          {product.inStock ? 'Add to Cart' : 'Out of Stock'}
        </Button>
      </div>
    </div>
  );
}
