import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  fetchStorefrontOrder,
  createReturnRequest,
  formatInrFromMinor,
} from '@/lib/graphql/storefront';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, RotateCcw, Truck } from 'lucide-react';

const RETURN_REASONS = [
  { value: 'DEFECTIVE', label: 'Defective item' },
  { value: 'WRONG_ITEM', label: 'Wrong item received' },
  { value: 'NOT_AS_DESCRIBED', label: 'Not as described' },
  { value: 'CHANGED_MIND', label: 'Changed my mind' },
  { value: 'OTHER', label: 'Other' },
];

function orderStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AccountOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useCustomerAuth();
  const queryClient = useQueryClient();

  const [returnOpen, setReturnOpen] = useState(false);
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const [returnReason, setReturnReason] = useState('DEFECTIVE');
  const [returnNotes, setReturnNotes] = useState('');
  const [returnSubmitted, setReturnSubmitted] = useState(false);

  const orderQuery = useQuery({
    queryKey: ['storefront-order', token, orderId],
    queryFn: () => fetchStorefrontOrder(token!, orderId!),
    enabled: !!token && !!orderId,
  });

  const returnMutation = useMutation({
    mutationFn: () =>
      createReturnRequest(token!, {
        orderId: orderId!,
        reason: returnReason,
        lineItems: Array.from(selectedLineIds).map((id) => ({ lineItemId: id })),
        notes: returnNotes || undefined,
      }),
    onSuccess: () => {
      setReturnSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ['storefront-return-requests'] });
    },
  });

  const openReturnDialog = () => {
    setSelectedLineIds(new Set(order?.lineItems.map((l) => String(l.id)) ?? []));
    setReturnReason('DEFECTIVE');
    setReturnNotes('');
    setReturnSubmitted(false);
    setReturnOpen(true);
  };

  const toggleLine = (id: string) => {
    setSelectedLineIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (orderQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading order…</p>;
  }
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/account/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to orders
          </Link>
        </Button>
        <p className="text-sm text-destructive">
          {orderQuery.error instanceof Error ? orderQuery.error.message : 'Order not found or not accessible.'}
        </p>
      </div>
    );
  }

  const order = orderQuery.data;
  const isFulfilled = order.status === 'FULFILLED';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/account/orders">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Orders
          </Link>
        </Button>
        <Badge variant="secondary">{orderStatusLabel(order.status)}</Badge>
        {isFulfilled && (
          <Button variant="outline" size="sm" onClick={openReturnDialog}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Request Return
          </Button>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold">Order #{order.id}</h2>
        <p className="text-sm text-muted-foreground">
          {order.createdAt
            ? `Placed ${new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })}`
            : null}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Shipping & tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm">
            <p className="font-medium">{order.shippingRecipientName}</p>
            <p className="text-muted-foreground">
              {order.shippingLine1}
              {order.shippingLine2 ? `, ${order.shippingLine2}` : ''}
            </p>
            <p className="text-muted-foreground">
              {order.shippingCity}, {order.shippingState} {order.shippingPostalCode}
            </p>
            <p className="text-muted-foreground">Phone: {order.shippingPhone}</p>
          </div>
          <Separator />
          {order.shipments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No shipment records yet.</p>
          ) : (
            <ul className="space-y-3">
              {order.shipments.map((s) => (
                <li key={s.id} className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{s.carrier}</span>
                    <Badge variant="outline">{orderStatusLabel(s.status)}</Badge>
                  </div>
                  {s.trackingNumber && (
                    <p className="mt-2">
                      <span className="text-muted-foreground">Tracking number: </span>
                      <span className="font-mono">{s.trackingNumber}</span>
                    </p>
                  )}
                  {s.carrierStatusLabel && <p className="text-muted-foreground mt-1">{s.carrierStatusLabel}</p>}
                  {s.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Updated {new Date(s.lastSyncedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {order.lineItems.map((line) => (
              <li key={line.id} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 text-sm">
                <div>
                  <p className="font-medium">{line.nameSnapshot}</p>
                  <p className="text-muted-foreground font-mono text-xs">{line.skuSnapshot}</p>
                  <p className="text-muted-foreground">Qty {line.quantity}</p>
                </div>
                <div className="text-right tabular-nums">
                  <p>{formatInrFromMinor(line.lineTotalInMinor)}</p>
                </div>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{formatInrFromMinor(order.subtotalInMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{formatInrFromMinor(order.shippingInMinor)}</dd>
            </div>
            {order.promoCode && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <dt>Promo ({order.promoCode})</dt>
                <dd className="tabular-nums">− {formatInrFromMinor(order.promoDiscountInMinor || '0')}</dd>
              </div>
            )}
            <div className="flex justify-between font-semibold pt-2 border-t">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatInrFromMinor(order.totalInMinor)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a Return</DialogTitle>
            <DialogDescription>
              Select the items you want to return and tell us why.
            </DialogDescription>
          </DialogHeader>

          {returnSubmitted ? (
            <div className="py-6 text-center space-y-2">
              <p className="font-semibold">Return request submitted!</p>
              <p className="text-sm text-muted-foreground">
                We will review your request and respond within 2–3 business days. Check{' '}
                <Link
                  to="/account/returns"
                  className="underline underline-offset-2"
                  onClick={() => setReturnOpen(false)}
                >
                  My Returns
                </Link>{' '}
                for status updates.
              </p>
              <Button className="mt-4" onClick={() => setReturnOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Items to return</p>
                  <ul className="divide-y border rounded-lg overflow-hidden">
                    {order.lineItems.map((line) => {
                      const id = String(line.id);
                      const checked = selectedLineIds.has(id);
                      return (
                        <li
                          key={id}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => toggleLine(id)}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleLine(id)}
                            className="h-4 w-4 accent-primary"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{line.nameSnapshot}</p>
                            <p className="text-xs text-muted-foreground">Qty {line.quantity}</p>
                          </div>
                          <p className="text-sm tabular-nums shrink-0">
                            {formatInrFromMinor(line.lineTotalInMinor)}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="return-reason">
                    Reason for return
                  </label>
                  <select
                    id="return-reason"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="return-notes">
                    Additional notes (optional)
                  </label>
                  <textarea
                    id="return-notes"
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                    rows={3}
                    placeholder="Tell us more about the issue…"
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    maxLength={1000}
                  />
                </div>

                {returnMutation.isError && (
                  <p className="text-sm text-destructive">
                    {(returnMutation.error as Error)?.message || 'Failed to submit return request.'}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setReturnOpen(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={selectedLineIds.size === 0 || returnMutation.isPending}
                  onClick={() => returnMutation.mutate()}
                >
                  {returnMutation.isPending ? 'Submitting…' : 'Submit Return Request'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
