import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CustomerInfo } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import { createStorefrontOrder } from '@/lib/graphql/storefront';
import { toast } from '@/hooks/use-toast';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Checkout({ isOpen, onClose }: CheckoutProps) {
  const { items, getCartTotal, couponCode, couponDiscount, clearCart } = useCart();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CustomerInfo>({
    firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '',
  });

  const subtotal = items.reduce((sum, i) => sum + i.product.discountPrice * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 99;
  const discount = subtotal * couponDiscount / 100;
  const total = subtotal - discount + shipping;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const order = await createStorefrontOrder({
        lines: items.map((item) => ({ sku: item.product.sku, quantity: item.quantity })),
        contactPhone: form.phone,
        contactEmail: form.email,
        promoCode: couponCode || undefined,
        guestShipping: {
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          line1: form.address,
          city: form.city,
          state: form.state,
          postalCode: form.pincode,
          phone: form.phone,
          countryCode: 'IN',
        },
      });
      setOrderId(`ORD-${order.id}`);
      setOrderPlaced(true);
      clearCart();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to place order';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOrderPlaced(false);
    setOrderId('');
    setForm({ firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', pincode: '' });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {orderPlaced ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">Order Placed Successfully!</DialogTitle>
              <DialogDescription>Your order ID is <span className="font-bold text-primary">{orderId}</span></DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">We'll send you an email confirmation with tracking details shortly.</p>
            <Button onClick={handleClose}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>Complete your order</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Customer Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label htmlFor="fn">First Name *</Label><Input id="fn" required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} /></div>
                  <div><Label htmlFor="ln">Last Name *</Label><Input id="ln" required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} /></div>
                  <div><Label htmlFor="em">Email *</Label><Input id="em" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  <div><Label htmlFor="ph">Phone *</Label><Input id="ph" required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Shipping Address</h3>
                <div className="space-y-3">
                  <div><Label htmlFor="addr">Address *</Label><Input id="addr" required value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label htmlFor="city">City *</Label><Input id="city" required value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                    <div><Label htmlFor="state">State *</Label><Input id="state" required value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
                    <div><Label htmlFor="pin">Pincode *</Label><Input id="pin" required value={form.pincode} onChange={e => setForm({...form, pincode: e.target.value})} /></div>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="truncate max-w-[250px]">{item.product.name} × {item.quantity}</span>
                      <span className="font-medium">₹{(item.product.discountPrice * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm text-success"><span>Discount ({couponCode})</span><span>-₹{discount.toLocaleString()}</span></div>}
                  <div className="flex justify-between text-sm"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span></div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-primary">₹{total.toLocaleString()}</span></div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Placing order…' : `Place Order — ₹${total.toLocaleString()}`}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
