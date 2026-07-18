import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product } from '@/types';
import { fetchStorefrontProducts } from '@/lib/graphql/storefront';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  onNavigateToCatalog: (query: string) => void;
}

export function SearchBar({ isOpen, onClose, onProductSelect, onNavigateToCatalog }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(''); setDebouncedQuery(''); }
  }, [isOpen]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results = [] } = useQuery({
    queryKey: ['search-products', debouncedQuery],
    queryFn: () => fetchStorefrontProducts({ search: debouncedQuery, limit: 8 }),
    enabled: debouncedQuery.length >= 2,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-background/95 backdrop-blur animate-fade-in">
      <div className="container max-w-2xl pt-20">
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search by brand, model, part name, SKU..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && query) { onNavigateToCatalog(query); onClose(); } }}
              className="pl-10 h-12 text-lg"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        {results.length > 0 && (
          <div className="bg-card rounded-lg border shadow-lg overflow-hidden">
            {results.map(p => (
              <button key={p.id} className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b last:border-0 transition-colors" onClick={() => { onProductSelect(p); onClose(); }}>
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                  {p.partType.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.brandName} · {p.modelName} · {p.partType}</p>
                </div>
                <span className="text-sm font-semibold text-primary">₹{p.discountPrice.toLocaleString()}</span>
              </button>
            ))}
            {query.length >= 2 && (
              <button className="w-full px-4 py-3 text-center text-sm text-primary font-medium hover:bg-muted/50" onClick={() => { onNavigateToCatalog(query); onClose(); }}>
                View all results for "{query}" →
              </button>
            )}
          </div>
        )}

        {debouncedQuery.length >= 2 && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No results found for "{query}"</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
