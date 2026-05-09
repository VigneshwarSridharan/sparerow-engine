import { X, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { brands, models, partTypes } from '@/data/seedData';
import { FilterState } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterDrawerProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  isOpen: boolean;
  onClose: () => void;
  maxPrice: number;
}

export function FilterDrawer({ filters, onFiltersChange, isOpen, onClose, maxPrice }: FilterDrawerProps) {
  const filteredModels = filters.brandId ? models.filter(m => m.brandId === filters.brandId) : models;

  const content = (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-sm mb-3">Brand</h4>
        <div className="space-y-2">
          {brands.map(brand => (
            <label key={brand.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.brandId === brand.id}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, brandId: checked ? brand.id : undefined, modelId: undefined })}
              />
              <span className="text-sm">{brand.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">({brand.productCount})</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {filters.brandId && (
        <>
          <div>
            <h4 className="font-semibold text-sm mb-3">Model</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredModels.map(model => (
                <label key={model.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={filters.modelId === model.id}
                    onCheckedChange={(checked) => onFiltersChange({ ...filters, modelId: checked ? model.id : undefined })}
                  />
                  <span className="text-sm">{model.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">({model.productCount})</span>
                </label>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      <div>
        <h4 className="font-semibold text-sm mb-3">Part Type</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {partTypes.map(pt => (
            <label key={pt} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={filters.partTypes.includes(pt)}
                onCheckedChange={(checked) => {
                  const updated = checked ? [...filters.partTypes, pt] : filters.partTypes.filter(p => p !== pt);
                  onFiltersChange({ ...filters, partTypes: updated });
                }}
              />
              <span className="text-sm">{pt}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold text-sm mb-3">Price Range</h4>
        <Slider
          min={0}
          max={maxPrice}
          step={50}
          value={[filters.priceRange[0], filters.priceRange[1]]}
          onValueChange={(v) => onFiltersChange({ ...filters, priceRange: [v[0], v[1]] })}
          className="mb-2"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>₹{filters.priceRange[0].toLocaleString()}</span>
          <span>₹{filters.priceRange[1].toLocaleString()}</span>
        </div>
      </div>

      <Separator />

      <label className="flex items-center gap-2 cursor-pointer">
        <Checkbox
          checked={filters.inStockOnly}
          onCheckedChange={(checked) => onFiltersChange({ ...filters, inStockOnly: !!checked })}
        />
        <span className="text-sm">In Stock Only</span>
      </label>

      <Button variant="outline" className="w-full" onClick={() => onFiltersChange({ brandId: undefined, modelId: undefined, partTypes: [], priceRange: [0, maxPrice], inStockOnly: false, searchQuery: '', sort: 'featured' })}>
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile filter drawer */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{content}</div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar - always visible */}
      <div className="hidden lg:block w-64 shrink-0">
        <div className="sticky top-20 bg-card rounded-xl border p-4 overflow-y-auto max-h-[calc(100vh-6rem)]">
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </h3>
          {content}
        </div>
      </div>
    </>
  );
}
