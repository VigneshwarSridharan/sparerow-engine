import { useState } from 'react';
import { ShoppingCart, Heart, Search, Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { Badge } from '@/components/ui/badge';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onSearchOpen: () => void;
  onCartOpen: () => void;
  onNavigate: (path: string) => void;
}

export function Header({ onSearchOpen, onCartOpen, onNavigate }: HeaderProps) {
  const { getCartCount } = useCart();
  const { wishlistIds } = useWishlist();
  const { token, logout } = useCustomerAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cartCount = getCartCount();

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/products' },
    { label: 'About & Contact', path: '/about' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <button onClick={() => onNavigate('/')} className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center">
              SH
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold leading-none">Sparerow</p>
              <p className="text-xs text-muted-foreground">Mobile Parts Store</p>
            </div>
          </button>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(item => (
            <Button key={item.path} variant="ghost" size="sm" onClick={() => onNavigate(item.path)}>
              {item.label}
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {token ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onNavigate('/account')}>Account</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate('/account/orders')}>My orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate('/account/addresses')}>Addresses</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => onNavigate('/login')}>
              Sign in
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onSearchOpen}>
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="relative" onClick={() => onNavigate('/wishlist')}>
            <Heart className="h-5 w-5" />
            {wishlistIds.length > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                {wishlistIds.length}
              </Badge>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="relative" onClick={onCartOpen}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary">
                {cartCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map(item => (
              <Button key={item.path} variant="ghost" className="justify-start" onClick={() => { onNavigate(item.path); setMobileMenuOpen(false); }}>
                {item.label}
              </Button>
            ))}
            {!token && (
              <Button variant="ghost" className="justify-start sm:hidden" onClick={() => { onNavigate('/login'); setMobileMenuOpen(false); }}>
                Sign in
              </Button>
            )}
            {token && (
              <>
                <Button variant="ghost" className="justify-start" onClick={() => { onNavigate('/account'); setMobileMenuOpen(false); }}>
                  Account
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => { onNavigate('/account/orders'); setMobileMenuOpen(false); }}>
                  My orders
                </Button>
                <Button variant="ghost" className="justify-start" onClick={() => { onNavigate('/account/addresses'); setMobileMenuOpen(false); }}>
                  Addresses
                </Button>
                <Button variant="ghost" className="justify-start text-muted-foreground" onClick={() => { logout(); setMobileMenuOpen(false); }}>
                  Sign out
                </Button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
