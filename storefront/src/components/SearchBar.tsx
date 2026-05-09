import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { products, brands, models } from '@/data/seedData';
import { Product } from '@/types';

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  onProductSelect: (product: Product) => void;
  onNavigateToCatalog: (query: string) => void;
}

export function SearchBar({ isOpen, onClose, onProductSelect, onNavigateToCatalog }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) { setTimeout(() => inputRef.current?.focus(), 100); }
    else { setQuery(''); }
  }, [isOpen]);

  const results = query.length >= 2 ? products.filter(p => {
    const q = query.toLowerCase();
    const brand = brands.find(b => b.id === p.brandId);
    const model = models.find(m => m.id === p.modelId);
    return p.name.toLowerCase().includes(q) || p.partType.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) || brand?.name.toLowerCase().includes(q) ||
      model?.name.toLowerCase().includes(q);
  }).slice(0, 8) : [];

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
            {results.map(p => {
              const brand = brands.find(b => b.id === p.brandId);
              const model = models.find(m => m.id === p.modelId);
              return (
                <button key={p.id} className="w-full px-4 py-3 text-left hover:bg-muted/50 flex items-center gap-3 border-b last:border-0 transition-colors" onClick={() => { onProductSelect(p); onClose(); }}>
                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {p.partType.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{brand?.name} · {model?.name} · {p.partType}</p>
                  </div>
                  <span className="text-sm font-semibold text-primary">₹{p.discountPrice.toLocaleString()}</span>
                </button>
              );
            })}
            {query.length >= 2 && (
              <button className="w-full px-4 py-3 text-center text-sm text-primary font-medium hover:bg-muted/50" onClick={() => { onNavigateToCatalog(query); onClose(); }}>
                View all results for "{query}" →
              </button>
            )}
          </div>
        )}

        {query.length >= 2 && results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">No results found for "{query}"</p>
            <p className="text-sm mt-1">Try a different search term</p>
          </div>
        )}
      </div>
    </div>
  );
}
