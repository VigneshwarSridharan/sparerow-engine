import { Navigate, useLocation } from 'react-router-dom';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';

export function RequireCustomerAuth({ children }: { children: React.ReactNode }) {
  const { token, ready } = useCustomerAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="container py-16 text-center text-sm text-muted-foreground">Loading your account...</div>
    );
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
