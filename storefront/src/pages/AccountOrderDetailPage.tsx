import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { fetchStorefrontOrder, formatInrFromMinor } from '@/lib/graphql/storefront';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, Truck } from 'lucide-react';

function orderStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AccountOrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { token } = useCustomerAuth();

  const orderQuery = useQuery({
    queryKey: ['storefront-order', token, orderId],
    queryFn: () => fetchStorefrontOrder(token!, orderId!),
    enabled: !!token && !!orderId,
  });

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
    </div>
  );
}
