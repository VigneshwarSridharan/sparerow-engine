import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchStorefrontSession,
  getStoredCustomerToken,
  loginStorefront,
  persistCustomerToken,
  registerStorefront,
  type StorefrontCustomer,
} from '@/lib/graphql/storefront';

type CustomerAuthState = {
  token: string | null;
  customer: StorefrontCustomer | null;
  ready: boolean;
  login: (input: { email?: string; phone?: string; password: string }) => Promise<void>;
  register: (input: { email?: string; phone?: string; password: string }) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
};

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredCustomerToken());
  const [customer, setCustomer] = useState<StorefrontCustomer | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    const t = getStoredCustomerToken();
    setToken(t);
    if (!t) {
      setCustomer(null);
      return;
    }
    try {
      const session = await fetchStorefrontSession(t);
      if (session.authenticated && session.customer) {
        setCustomer(session.customer);
      } else {
        persistCustomerToken(null);
        setToken(null);
        setCustomer(null);
      }
    } catch {
      persistCustomerToken(null);
      setToken(null);
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshSession();
      setReady(true);
    })();
  }, [refreshSession]);

  const login = useCallback(async (input: { email?: string; phone?: string; password: string }) => {
    const payload = await loginStorefront(input);
    persistCustomerToken(payload.token);
    setToken(payload.token);
    setCustomer(payload.customer);
  }, []);

  const register = useCallback(async (input: { email?: string; phone?: string; password: string }) => {
    const payload = await registerStorefront(input);
    persistCustomerToken(payload.token);
    setToken(payload.token);
    setCustomer(payload.customer);
  }, []);

  const logout = useCallback(() => {
    persistCustomerToken(null);
    setToken(null);
    setCustomer(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      customer,
      ready,
      login,
      register,
      logout,
      refreshSession,
    }),
    [token, customer, ready, login, register, logout, refreshSession]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthState {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
