import { useMemo } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ChevronRight, Heart, ShieldCheck, ShoppingCart, Star, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { products, brands, models } from '@/data/seedData';
import { getPartImage } from '@/lib/partImages';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/ProductCard';

export default function ProductDetailsPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const product = useMemo(() => products.find((item) => item.id === productId), [productId]);

  if (!product) {
    return (
      <div className="container py-20 text-center">
        <p className="text-lg text-muted-foreground">Product not found.</p>
        <Button className="mt-4" onClick={() => navigate('/products')}>Back to Products</Button>
      </div>
    );
  }

  const relatedProducts = products
    .filter((item) => item.id !== product.id && (item.brandId === product.brandId || item.partType === product.partType))
    .slice(0, 4);

  const brand = brands.find((item) => item.id === product.brandId);
  const model = models.find((item) => item.id === product.modelId);
  const partImage = getPartImage(product.partType);

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
        <div className="rounded-2xl border bg-muted/40 p-8 flex items-center justify-center min-h-[360px]">
          <img src={partImage} alt={product.partType} className="max-h-80 object-contain" />
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
