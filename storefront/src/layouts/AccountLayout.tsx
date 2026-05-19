import { NavLink, Outlet } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import { Package, MapPin, LogOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'
  );

export function AccountLayout() {
  const { logout, customer } = useCustomerAuth();

  return (
    <div className="container py-8 md:py-10">
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        <aside className="md:w-56 shrink-0 space-y-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">My account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {customer?.email || customer?.phone || 'Signed in'}
            </p>
          </div>
          <nav className="flex flex-col gap-1">
            <NavLink to="/account/orders" className={linkClass}>
              <Package className="h-4 w-4" />
              Orders
            </NavLink>
            <NavLink to="/account/addresses" className={linkClass}>
              <MapPin className="h-4 w-4" />
              Addresses
            </NavLink>
            <NavLink to="/account/returns" className={linkClass}>
              <RotateCcw className="h-4 w-4" />
              Returns
            </NavLink>
            <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </nav>
        </aside>
        <div className="flex-1 min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
