import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchStorefrontBootstrap, StorefrontBootstrapData } from '@/lib/graphql/storefront';

type StorefrontDataContextValue = StorefrontBootstrapData & {
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

const defaultData: StorefrontBootstrapData = {
  brands: [],
  models: [],
  products: [],
  categories: [],
  partTypes: [],
  promoCodes: [],
};

const StorefrontDataContext = createContext<StorefrontDataContextValue>({
  ...defaultData,
  isLoading: true,
  isError: false,
  refetch: () => undefined,
});

export function StorefrontDataProvider({ children }: { children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ['storefront-bootstrap'],
    queryFn: () => fetchStorefrontBootstrap(),
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
