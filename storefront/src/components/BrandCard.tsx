import { Brand } from '@/types';
import { cn } from '@/lib/utils';

interface BrandCardProps {
  brand: Brand;
  onClick: (brand: Brand) => void;
  isSelected?: boolean;
}

export function BrandCard({ brand, onClick, isSelected }: BrandCardProps) {
  return (
    <button
      onClick={() => onClick(brand)}
      className={cn(
        "group flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-glow hover:border-primary/50 hover:-translate-y-1",
        isSelected ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"
      )}
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary group-hover:bg-primary/20 transition-colors">
        {brand.name.charAt(0)}
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-sm">{brand.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{brand.productCount} parts</p>
      </div>
    </button>
  );
}
