import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { fetchReturnRequests, formatInrFromMinor, type StorefrontReturnRequest } from '@/lib/graphql/storefront';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REFUNDED: 'Refunded',
};

const REASON_LABELS: Record<string, string> = {
  DEFECTIVE: 'Defective item',
  WRONG_ITEM: 'Wrong item received',
  NOT_AS_DESCRIBED: 'Not as described',
  CHANGED_MIND: 'Changed my mind',
  OTHER: 'Other',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  REFUNDED: 'outline',
};

function ReturnRequestCard({ request }: { request: StorefrontReturnRequest }) {
  const date = new Date(request.createdAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <CardTitle className="text-base">Return #{request.id}</CardTitle>
          <Badge variant={STATUS_VARIANTS[request.status] ?? 'secondary'}>
            {STATUS_LABELS[request.status] ?? request.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Order #{request.orderId} · Submitted {date} · {REASON_LABELS[request.reason] ?? request.reason}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="divide-y text-sm">
          {request.lineItems.map((item, i) => (
            <li key={i} className="py-2 first:pt-0 flex justify-between gap-2">
              <div>
                <p className="font-medium">{item.nameSnapshot}</p>
                <p className="text-xs text-muted-foreground font-mono">{item.skuSnapshot}</p>
                <p className="text-xs text-muted-foreground">Qty {item.quantity}</p>
              </div>
              <p className="text-sm tabular-nums shrink-0">
                {formatInrFromMinor(item.unitPriceInMinor)} each
              </p>
            </li>
          ))}
        </ul>

        {request.refundAmountInMinor && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm flex justify-between">
            <span className="text-muted-foreground">Refund amount</span>
            <span className="font-semibold">{formatInrFromMinor(request.refundAmountInMinor)}</span>
          </div>
        )}

        {request.notes && (
          <p className="text-sm text-muted-foreground italic">"{request.notes}"</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AccountReturnsPage() {
  const { token } = useCustomerAuth();

  const { data: requests, isLoading, isError } = useQuery({
    queryKey: ['storefront-return-requests', token],
    queryFn: () => fetchReturnRequests(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading return requests…</p>;
  }

  if (isError) {
    return <p className="text-sm text-destructive">Failed to load return requests.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Returns</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Return requests you have submitted. Approved returns are processed within 5–7 business days.
        </p>
      </div>

      {!requests || requests.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center space-y-3">
          <Package className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground text-sm">No return requests yet.</p>
          <p className="text-xs text-muted-foreground">
            You can request a return from a{' '}
            <Link to="/account/orders" className="underline underline-offset-2">
              fulfilled order
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <ReturnRequestCard key={req.id} request={req} />
          ))}
        </div>
      )}
    </div>
  );
}
