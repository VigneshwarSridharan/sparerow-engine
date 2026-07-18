import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStorefrontCatalogMeta, StorefrontCatalogMetaData } from '@/lib/graphql/storefront';

type StorefrontDataContextValue = StorefrontCatalogMetaData & {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const defaultData: StorefrontCatalogMetaData = {
  brands: [],
  categories: [],
  partTypes: [],
  promoCodes: [],
  defaultTaxRatePercent: 0,
  originStateCode: '',
  maxPrice: 0,
};

const StorefrontDataContext = createContext<StorefrontDataContextValue>({
  ...defaultData,
  isLoading: true,
  isError: false,
  refetch: () => undefined,
});

export function StorefrontDataProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['storefront-catalog-meta'],
    queryFn: () => fetchStorefrontCatalogMeta(),
  });

  const value: StorefrontDataContextValue = {
    ...(query.data || defaultData),
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };

  return <StorefrontDataContext.Provider value={value}>{children}</StorefrontDataContext.Provider>;
}

export function useStorefrontData() {
  return useContext(StorefrontDataContext);
}
