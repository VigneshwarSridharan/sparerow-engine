import { Brand } from '@/types';
import { cn } from '@/lib/utils';

interface BrandCardProps {
  brand: Brand;
  onClick: (brand: Brand) => void;
  isSelected?: boolean;
}

export function BrandCard({ brand, onClick, isSelected }: BrandCardProps) {
  const logo = brand.logo && brand.logo !== '/placeholder.svg' ? brand.logo : undefined;

  return (
    <button
      onClick={() => onClick(brand)}
      className={cn(
        "group flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-glow hover:border-primary/50 hover:-translate-y-1",
        isSelected ? "border-primary bg-primary/5 shadow-glow" : "border-border bg-card"
      )}
    >
      <div
        className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold overflow-hidden transition-colors",
          logo
            ? "bg-white p-3"
            : "bg-primary/10 text-primary group-hover:bg-primary/20"
        )}
      >
        {logo ? (
          <img src={logo} alt={`${brand.name} logo`} className="w-full h-full object-contain" />
        ) : (
          brand.name.charAt(0)
        )}
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-sm">{brand.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{brand.productCount} parts</p>
      </div>
    </button>
  );
}
