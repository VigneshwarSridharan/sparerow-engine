import { useEffect, useState } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { Box, Flex, Typography, Loader, Badge } from '@strapi/design-system';

interface Stats {
  pendingOrders: number;
  totalProducts: number;
  totalCustomers: number;
  recentShipments: Array<{
    id: number;
    documentId: string;
    trackingId?: string;
    status?: string;
    createdAt: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f5a623',
  shipped: '#4945ff',
  delivered: '#27b56b',
  cancelled: '#ee5e52',
};

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <Box
      padding={6}
      background="neutral0"
      hasRadius
      shadow="filterShadow"
      style={{ borderTop: `3px solid ${accent}`, flex: '1 1 180px', minWidth: 180 }}
    >
      <Typography variant="sigma" textColor="neutral500">
        {label}
      </Typography>
      <Box paddingTop={2}>
        <Typography
          as="p"
          style={{ fontSize: '2rem', fontWeight: 700, color: '#32324d', lineHeight: 1 }}
        >
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Dashboard() {
  const { get } = useFetchClient();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [ordersRes, productsRes, customersRes, shipmentsRes] = await Promise.all([
          get<any>('/content-manager/collection-types/api::order.order?page=1&pageSize=1&filters[$and][0][status][$eq]=pending'),
          get<any>('/content-manager/collection-types/api::product.product?page=1&pageSize=1'),
          get<any>('/content-manager/collection-types/api::customer-account.customer-account?page=1&pageSize=1'),
          get<any>('/content-manager/collection-types/api::shipment.shipment?page=1&pageSize=5&sort=createdAt:DESC'),
        ]);

        setStats({
          pendingOrders: ordersRes.data?.pagination?.total ?? 0,
          totalProducts: productsRes.data?.pagination?.total ?? 0,
          totalCustomers: customersRes.data?.pagination?.total ?? 0,
          recentShipments: shipmentsRes.data?.results ?? [],
        });
      } catch (err) {
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Box padding={10}>
        <Flex justifyContent="center">
          <Loader>Loading dashboard…</Loader>
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box padding={10}>
        <Typography textColor="danger600">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box padding={8} background="neutral100" style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box paddingBottom={6}>
        <Typography variant="alpha" as="h1">
          Dashboard
        </Typography>
        <Box paddingTop={1}>
          <Typography textColor="neutral500">
            Welcome back — here's a quick overview of your store.
          </Typography>
        </Box>
      </Box>

      {/* Stat cards */}
      <Flex gap={4} wrap="wrap" paddingBottom={8}>
        <StatCard label="Pending Orders" value={stats?.pendingOrders ?? 0} accent="#f5a623" />
        <StatCard label="Total Products" value={stats?.totalProducts ?? 0} accent="#4945ff" />
        <StatCard label="Total Customers" value={stats?.totalCustomers ?? 0} accent="#27b56b" />
      </Flex>

      {/* Recent shipments */}
      <Box>
        <Typography variant="beta" as="h2">
          Recent Shipments
        </Typography>
        <Box paddingTop={4} background="neutral0" hasRadius shadow="filterShadow" padding={0} style={{ overflow: 'hidden' }}>
          {!stats?.recentShipments.length ? (
            <Box padding={6}>
              <Typography textColor="neutral500">No shipments yet.</Typography>
            </Box>
          ) : (
            stats.recentShipments.map((shipment, idx) => {
              const status = shipment.status ?? 'pending';
              const accent = STATUS_COLORS[status] ?? '#8e8ea9';
              const isLast = idx === stats.recentShipments.length - 1;
              return (
                <Box
                  key={shipment.id}
                  padding={4}
                  style={{ borderBottom: isLast ? 'none' : '1px solid #eaeaef' }}
                >
                  <Flex justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography fontWeight="semiBold">
                        {shipment.trackingId ?? `Shipment #${shipment.id}`}
                      </Typography>
                      <Typography variant="pi" textColor="neutral500">
                        {new Date(shipment.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Typography>
                    </Box>
                    <Badge style={{ background: accent + '22', color: accent, border: `1px solid ${accent}55`, textTransform: 'capitalize' }}>
                      {status}
                    </Badge>
                  </Flex>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      {/* Quick links */}
      <Box paddingTop={8}>
        <Typography variant="beta" as="h2">
          Quick Actions
        </Typography>
        <Flex gap={4} paddingTop={4} wrap="wrap">
          {[
            { label: 'Manage Products', href: '/admin/content-manager/collection-types/api::product.product' },
            { label: 'View Orders', href: '/admin/content-manager/collection-types/api::order.order' },
            { label: 'Track Shipments', href: '/admin/content-manager/collection-types/api::shipment.shipment' },
            { label: 'Manage Brands', href: '/admin/content-manager/collection-types/api::brand.brand' },
            { label: 'Discount Codes', href: '/admin/content-manager/collection-types/api::promo-code.promo-code' },
            { label: 'FAQs', href: '/admin/content-manager/collection-types/api::faq.faq' },
          ].map(({ label, href }) => (
            <a
              key={href}
              href={href}
              style={{
                padding: '10px 18px',
                background: '#ffffff',
                border: '1px solid #dcdce4',
                borderRadius: '4px',
                color: '#32324d',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 1px 4px rgba(33,33,52,.1)',
              }}
            >
              {label}
            </a>
          ))}
        </Flex>
      </Box>
    </Box>
  );
}
