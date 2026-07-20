import { X, Minus, Plus, Trash2, Tag, ArrowRight } from 'lucide-react';
import posthog from 'posthog-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';

interface CartDrawerProps {
  onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, removeFromCart, updateQuantity, getCartTotal, getCartCount, couponCode, couponDiscount, applyCoupon, isCartOpen, setIsCartOpen } = useCart();
  const { defaultTaxRatePercent } = useStorefrontData();
  const [couponInput, setCouponInput] = useState('');

  const subtotal = items.reduce((sum, i) => sum + i.product.discountPrice * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 99;
  const discount = subtotal * couponDiscount / 100;
  const estimatedTax = defaultTaxRatePercent > 0 ? Math.round((subtotal - discount) * defaultTaxRatePercent / 100) : 0;
  const total = subtotal - discount + shipping + estimatedTax;

  return (
    <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="flex items-center justify-between">
            Shopping Cart ({getCartCount()})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <Tag className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button onClick={() => setIsCartOpen(false)}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {items.map(item => {
                const variant = item.variantSku ? item.product.variants.find((v) => v.sku === item.variantSku) : undefined;
                const unitPrice = variant ? variant.price : item.product.discountPrice;
                const itemKey = `${item.product.id}::${item.variantSku ?? ''}`;
                return (
                <div key={itemKey} className="flex gap-3 p-3 rounded-lg bg-muted/30">
                  <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {item.product.partType.slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{item.product.name}</h4>
                    <p className="text-xs text-muted-foreground">{item.product.partType}{variant ? ` · ${Object.values(variant.attributes).join(' / ')}` : ''}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1 border rounded">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variantSku)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-xs">{item.quantity}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variantSku)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">₹{(unitPrice * item.quantity).toLocaleString()}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.product.id, item.variantSku)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="border-t p-6 space-y-4">
              {!couponCode && (
                <div className="flex gap-2">
                  <Input placeholder="Coupon code" value={couponInput} onChange={e => setCouponInput(e.target.value)} className="h-9" />
                  <Button size="sm" variant="outline" onClick={async () => { await applyCoupon(couponInput); setCouponInput(''); }}>Apply</Button>
                </div>
              )}
              {couponCode && (
                <div className="flex items-center justify-between text-sm bg-success/10 p-2 rounded">
                  <span className="text-success font-medium">🎉 {couponCode} ({couponDiscount}% off)</span>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                {discount > 0 && <div className="flex justify-between text-success"><span>Coupon Discount</span><span>-₹{discount.toLocaleString()}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                {estimatedTax > 0 && (
                  <div className="flex justify-between"><span className="text-muted-foreground">GST ({defaultTaxRatePercent}%)</span><span>₹{estimatedTax.toLocaleString()}</span></div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base"><span>Total</span><span className="text-primary">₹{total.toLocaleString()}</span></div>
              </div>

              {subtotal < 2000 && (
                <p className="text-xs text-muted-foreground text-center">Add ₹{(2000 - subtotal).toLocaleString()} more for free shipping!</p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={() => {
                  posthog.capture('checkout_opened', { cartItemCount: getCartCount(), cartTotal: total });
                  setIsCartOpen(false);
                  onCheckout();
                }}
              >
                Proceed to Checkout <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
