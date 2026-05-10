import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { fetchStorefrontOrders, formatInrFromMinor } from '@/lib/graphql/storefront';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck } from 'lucide-react';

function orderStatusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AccountOrdersPage() {
  const { token } = useCustomerAuth();
  const ordersQuery = useQuery({
    queryKey: ['storefront-orders', token],
    queryFn: () => fetchStorefrontOrders(token!),
    enabled: !!token,
  });

  if (ordersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading orders…</p>;
  }
  if (ordersQuery.isError) {
    return (
      <p className="text-sm text-destructive">
        {ordersQuery.error instanceof Error ? ordersQuery.error.message : 'Could not load orders'}
      </p>
    );
  }

  const orders = ordersQuery.data || [];
  if (orders.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Order history</h2>
        <p className="text-sm text-muted-foreground">You have not placed any orders yet while signed in.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Order history</h2>
        <p className="text-sm text-muted-foreground">Track shipments and view details for each order.</p>
      </div>
      <ul className="space-y-4">
        {orders.map((order) => {
          const primaryShipment = order.shipments?.[0];
          return (
            <li key={order.id}>
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-medium">Order #{order.id}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })
                          : ''}
                      </p>
                    </div>
                    <Badge variant="secondary">{orderStatusLabel(order.status)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-medium tabular-nums">{formatInrFromMinor(order.totalInMinor)}</span>
                  </div>
                  {primaryShipment && (primaryShipment.trackingNumber || primaryShipment.carrierStatusLabel) && (
                    <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                      <Truck className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        {primaryShipment.trackingNumber && (
                          <p>
                            <span className="text-muted-foreground">Tracking: </span>
                            <span className="font-mono">{primaryShipment.trackingNumber}</span>
                          </p>
                        )}
                        {primaryShipment.carrierStatusLabel && (
                          <p className="text-muted-foreground">{primaryShipment.carrierStatusLabel}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <Link
                    to={`/account/orders/${order.id}`}
                    className="inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    View order details
                  </Link>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
