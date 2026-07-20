import { useMemo, useState } from 'react';
import posthog from 'posthog-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CustomerInfo } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle } from 'lucide-react';
import {
  createStorefrontAddress,
  createStorefrontOrder,
  fetchStorefrontAddresses,
  fetchStorefrontProducts,
  prepareStorefrontRazorpayPayment,
  verifyStorefrontRazorpayPayment,
  type StorefrontAddress,
} from '@/lib/graphql/storefront';
import { loadRazorpayScript } from '@/lib/loadRazorpay';
import { lookupIndianPincode } from '@/lib/pincodeLookup';
import { toast } from '@/hooks/use-toast';
import { useStorefrontData } from '@/contexts/StorefrontDataContext';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

const emptyNewAddress: Omit<StorefrontAddress, 'id'> = {
  customerName: '',
  line1: '',
  line2: null,
  city: '',
  state: '',
  postalCode: '',
  countryCode: 'IN',
  phone: '',
};

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
}

type PaymentSession = {
  strapiOrderId: string;
  continuationSecret: string;
  displayOrderId: string;
};

export function Checkout({ isOpen, onClose }: CheckoutProps) {
  const { items, couponCode, couponDiscount, clearCart } = useCart();
  const { defaultTaxRatePercent, originStateCode } = useStorefrontData();
  const { token: customerToken } = useCustomerAuth();
  const queryClient = useQueryClient();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderIdDisplay, setOrderIdDisplay] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [razorpayOpen, setRazorpayOpen] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(null);
  const [form, setForm] = useState<CustomerInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [newAddressForm, setNewAddressForm] = useState<Omit<StorefrontAddress, 'id'>>(emptyNewAddress);

  const addressesQuery = useQuery({
    queryKey: ['storefront-addresses', customerToken],
    queryFn: () => fetchStorefrontAddresses(customerToken!),
    enabled: !!customerToken,
  });
  const savedAddresses = addressesQuery.data || [];
  const effectiveMode = selectedAddressId ?? (savedAddresses.length > 0 ? savedAddresses[0].id : 'new');

  const handleGuestPincodeChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setForm((prev) => ({ ...prev, pincode: cleaned }));
    if (cleaned.length === 6) {
      const result = await lookupIndianPincode(cleaned);
      if (result) {
        setForm((prev) => ({ ...prev, pincode: cleaned, city: result.city, state: result.state }));
      }
    }
  };

  const handleNewAddressPincodeChange = async (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setNewAddressForm((prev) => ({ ...prev, postalCode: cleaned }));
    if (cleaned.length === 6) {
      const result = await lookupIndianPincode(cleaned);
      if (result) {
        setNewAddressForm((prev) => ({ ...prev, postalCode: cleaned, city: result.city, state: result.state }));
      }
    }
  };

  const cartSkus = useMemo(() => Array.from(new Set(items.map((item) => item.product.sku))), [items]);
  const { data: validCartProducts } = useQuery({
    queryKey: ['checkout-sku-validation', cartSkus],
    queryFn: () => fetchStorefrontProducts({ skus: cartSkus }),
    enabled: cartSkus.length > 0,
  });
  // CartContext already prunes stale SKUs on its own scoped validation; while this checkout-local
  // check is still loading, treat cart items as valid rather than flashing an empty cart.
  const validSkuSet = validCartProducts
    ? new Set(validCartProducts.map((product) => product.sku))
    : new Set(items.map((item) => item.product.sku));
  const validItems = items.filter((item) => validSkuSet.has(item.product.sku));
  const subtotal = validItems.reduce((sum, i) => sum + i.product.discountPrice * i.quantity, 0);
  const shipping = subtotal > 2000 ? 0 : 99;
  const discount = (subtotal * couponDiscount) / 100;
  const estimatedTax = defaultTaxRatePercent > 0 ? Math.round((subtotal - discount) * defaultTaxRatePercent / 100) : 0;
  const total = subtotal - discount + shipping + estimatedTax;

  const shippingState = !customerToken
    ? form.state
    : effectiveMode === 'new'
      ? newAddressForm.state
      : savedAddresses.find((a) => a.id === effectiveMode)?.state ?? '';
  const isIntrastate = originStateCode && shippingState.trim().toUpperCase() === originStateCode.toUpperCase();
  const gstLabel = estimatedTax > 0
    ? isIntrastate
      ? `CGST (${defaultTaxRatePercent / 2}%) + SGST (${defaultTaxRatePercent / 2}%)`
      : `IGST (${defaultTaxRatePercent}%)`
    : null;

  const openRazorpayForSession = async (session: PaymentSession) => {
    await loadRazorpayScript();
    const Razorpay = window.Razorpay;
    if (!Razorpay) throw new Error('Razorpay Checkout did not load');

    const prep = await prepareStorefrontRazorpayPayment(session.strapiOrderId, session.continuationSecret);

    const contactName = `${form.firstName} ${form.lastName}`.trim();

    const instance = new Razorpay({
      key: prep.keyId,
      amount: prep.amount,
      currency: prep.currency,
      name: 'Sparerow',
      description: `Order ${session.displayOrderId}`,
      order_id: prep.razorpayOrderId,
      prefill: {
        name: contactName || undefined,
        email: form.email || undefined,
        contact: form.phone || undefined,
      },
      theme: { color: '#8b5cf6' },
      modal: {
        ondismiss: () => {
          setRazorpayOpen(false);
          toast({
            title: 'Payment incomplete',
            description: 'Your order is reserved. Retry payment when ready.',
          });
        },
      },
      handler: async (response) => {
        setRazorpayOpen(false);
        try {
          await verifyStorefrontRazorpayPayment({
            orderId: session.strapiOrderId,
            paymentContinuationSecret: session.continuationSecret,
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
          });
          posthog.capture('payment_completed', { orderId: session.strapiOrderId });
          posthog.capture('order_placed', { orderId: session.strapiOrderId, totalInMinor: total * 100 });
          setOrderPlaced(true);
          setOrderIdDisplay(session.displayOrderId);
          setPaymentSession(null);
          clearCart();
          toast({ title: 'Payment successful' });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unable to verify payment';
          toast({ title: 'Verification failed', description: message, variant: 'destructive' });
        }
      },
    });

    instance.on('payment.failed', () => {
      setRazorpayOpen(false);
      toast({
        title: 'Payment failed',
        description: 'Your bank declined the transaction or an error occurred. You can retry.',
        variant: 'destructive',
      });
    });

    setRazorpayOpen(true);
    instance.open();
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validItems.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      let shippingAddressId: string | undefined;
      let guestShipping: {
        customerName: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        countryCode?: string;
        phone: string;
      } | undefined;

      if (customerToken && effectiveMode === 'new') {
        const saved = await createStorefrontAddress(customerToken, newAddressForm);
        void queryClient.invalidateQueries({ queryKey: ['storefront-addresses'] });
        shippingAddressId = saved.id;
      } else if (customerToken) {
        shippingAddressId = effectiveMode;
      } else {
        guestShipping = {
          customerName: `${form.firstName} ${form.lastName}`.trim(),
          line1: form.address,
          city: form.city,
          state: form.state,
          postalCode: form.pincode,
          phone: form.phone,
          countryCode: 'IN',
        };
      }

      const created = await createStorefrontOrder(
        {
          lines: validItems.map((item) => ({ sku: item.product.sku, quantity: item.quantity, variantSku: item.variantSku })),
          contactPhone: form.phone,
          contactEmail: form.email,
          promoCode: couponCode || undefined,
          shippingAddressId,
          guestShipping,
        },
        customerToken ?? undefined
      );

      const session: PaymentSession = {
        strapiOrderId: created.order.id,
        continuationSecret: created.paymentContinuationSecret,
        displayOrderId: `ORD-${created.order.id}`,
      };
      setPaymentSession(session);

      await openRazorpayForSession(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start checkout';
      toast({ title: 'Checkout failed', description: message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const retryPayment = async () => {
    if (!paymentSession) return;
    setSubmitting(true);
    try {
      await openRazorpayForSession(paymentSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to open Razorpay';
      toast({ title: 'Payment start failed', description: message, variant: 'destructive' });
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOrderPlaced(false);
    setOrderIdDisplay('');
    setPaymentSession(null);
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
    });
    setSelectedAddressId(null);
    setNewAddressForm(emptyNewAddress);
    onClose();
  };

  return (
    <Dialog modal={!razorpayOpen} open={isOpen} onOpenChange={(open) => { if (!open && (submitting || razorpayOpen || orderPlaced)) return; if (!open) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {orderPlaced ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl">Order paid successfully!</DialogTitle>
              <DialogDescription>
                Your order ID is{' '}
                <span className="font-bold text-primary">{orderIdDisplay}</span>
              </DialogDescription>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Confirmation email sent to{' '}
              <span className="font-medium">{form.email}</span>
            </p>
            <Button onClick={handleClose}>Continue Shopping</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Checkout</DialogTitle>
              <DialogDescription>Complete your order and pay securely via Razorpay</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Customer Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="fn">First Name *</Label>
                    <Input
                      id="fn"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ln">Last Name *</Label>
                    <Input
                      id="ln"
                      required
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="em">Email *</Label>
                    <Input
                      id="em"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="ph">Phone *</Label>
                    <Input
                      id="ph"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Shipping Address</h3>
                {!customerToken ? (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="addr">Address *</Label>
                      <Input
                        id="addr"
                        required
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label htmlFor="pin">Pincode *</Label>
                        <Input
                          id="pin"
                          required
                          inputMode="numeric"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) => void handleGuestPincodeChange(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          required
                          value={form.city}
                          onChange={(e) => setForm({ ...form, city: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">State *</Label>
                        <Input
                          id="state"
                          required
                          value={form.state}
                          onChange={(e) => setForm({ ...form, state: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addressesQuery.isLoading && (
                      <p className="text-sm text-muted-foreground">Loading your saved addresses…</p>
                    )}
                    {savedAddresses.length > 0 && (
                      <RadioGroup value={effectiveMode} onValueChange={setSelectedAddressId}>
                        {savedAddresses.map((a) => (
                          <Label
                            key={a.id}
                            htmlFor={`addr-${a.id}`}
                            className="flex items-start gap-3 rounded-md border p-3 text-sm font-normal cursor-pointer"
                          >
                            <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                            <span>
                              <span className="block font-medium">{a.customerName}</span>
                              <span className="block text-muted-foreground">
                                {a.line1}
                                {a.line2 ? `, ${a.line2}` : ''}
                              </span>
                              <span className="block text-muted-foreground">
                                {a.postalCode}, {a.city}, {a.state}
                              </span>
                              <span className="block text-muted-foreground">{a.phone}</span>
                            </span>
                          </Label>
                        ))}
                        <Label
                          htmlFor="addr-new"
                          className="flex items-center gap-3 rounded-md border p-3 text-sm font-normal cursor-pointer"
                        >
                          <RadioGroupItem value="new" id="addr-new" />
                          Add a new address
                        </Label>
                      </RadioGroup>
                    )}

                    {effectiveMode === 'new' && (
                      <div className="space-y-3 rounded-md border p-3">
                        <div>
                          <Label htmlFor="na-name">Full name *</Label>
                          <Input
                            id="na-name"
                            required
                            value={newAddressForm.customerName}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, customerName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="na-line1">Address line 1 *</Label>
                          <Input
                            id="na-line1"
                            required
                            value={newAddressForm.line1}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, line1: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="na-line2">Address line 2 (optional)</Label>
                          <Input
                            id="na-line2"
                            value={newAddressForm.line2 ?? ''}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, line2: e.target.value || null })}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <Label htmlFor="na-pin">Pincode *</Label>
                            <Input
                              id="na-pin"
                              required
                              inputMode="numeric"
                              maxLength={6}
                              value={newAddressForm.postalCode}
                              onChange={(e) => void handleNewAddressPincodeChange(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="na-city">City *</Label>
                            <Input
                              id="na-city"
                              required
                              value={newAddressForm.city}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, city: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label htmlFor="na-state">State *</Label>
                            <Input
                              id="na-state"
                              required
                              value={newAddressForm.state}
                              onChange={(e) => setNewAddressForm({ ...newAddressForm, state: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="na-phone">Phone *</Label>
                          <Input
                            id="na-phone"
                            required
                            inputMode="numeric"
                            value={newAddressForm.phone}
                            onChange={(e) => setNewAddressForm({ ...newAddressForm, phone: e.target.value })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {validItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="truncate max-w-[250px]">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="font-medium">
                        ₹{(item.product.discountPrice * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toLocaleString()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount ({couponCode})</span>
                      <span>-₹{discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                  </div>
                  {gstLabel && (
                    <div className="flex justify-between text-sm">
                      <span>{gstLabel}</span>
                      <span>₹{estimatedTax.toLocaleString()}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-primary">₹{total.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  GST is estimated. The exact amount charged is confirmed on the Razorpay screen.
                </p>
              </div>

              {paymentSession && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-sm text-foreground">
                  <p className="font-medium">Order {paymentSession.displayOrderId} awaits payment.</p>
                  <Button type="button" variant="secondary" className="mt-2" onClick={retryPayment} disabled={submitting}>
                    Retry Razorpay payment
                  </Button>
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Opening Razorpay…' : `Pay securely — ₹${total.toLocaleString()}${estimatedTax > 0 ? ' (incl. GST)' : ''}`}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
