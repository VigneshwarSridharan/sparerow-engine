import { useNavigate, useOutletContext } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/ProductCard';
import { useWishlist } from '@/contexts/WishlistContext';
import { StorefrontOutletContext } from '@/layouts/StorefrontLayout';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';

export default function WishlistPage() {
  const navigate = useNavigate();
  const { products, isLoading } = useStorefrontData();
  const { wishlistIds } = useWishlist();
  const { onQuickView } = useOutletContext<StorefrontOutletContext>();
  const wishlistProducts = products.filter((product) => wishlistIds.includes(product.id));

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">My Wishlist</h1>
      {isLoading && <p className="text-sm text-muted-foreground mb-2">Syncing wishlist catalog…</p>}
      <p className="text-muted-foreground mb-8">{wishlistProducts.length} items saved</p>
      {wishlistProducts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">Your wishlist is empty</p>
          <Button className="mt-4" onClick={() => navigate('/products')}>Browse Products</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {wishlistProducts.map((product) => (
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
  );
}
