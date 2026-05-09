import { Model } from '@/types';
import { cn } from '@/lib/utils';

interface ModelCardProps {
  model: Model;
  onClick: (model: Model) => void;
  isSelected?: boolean;
}

export function ModelCard({ model, onClick, isSelected }: ModelCardProps) {
  return (
    <button
      onClick={() => onClick(model)}
      className={cn(
        "flex flex-col items-center gap-2 p-4 rounded-lg border transition-all duration-200 hover:shadow-md hover:border-primary/50",
        isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
      )}
    >
      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">{model.name.slice(0, 3)}</span>
      </div>
      <div className="text-center">
        <h3 className="font-medium text-xs leading-tight">{model.name}</h3>
        <p className="text-[10px] text-muted-foreground mt-0.5">{model.productCount} parts</p>
      </div>
    </button>
  );
}
