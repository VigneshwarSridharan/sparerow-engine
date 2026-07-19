import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, X, Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { Brand, Product } from "@/types";
import { getPartImage } from "@/lib/partImages";
import {
  fetchModelsByBrand,
  fetchStorefrontProducts,
  HomeFilterCategory,
} from "@/lib/graphql/storefront";

interface SmartPartFinderProps {
  onQuickView: (product: Product) => void;
  brands: Brand[];
  categories: HomeFilterCategory[];
}

const steps = ["Select Brand", "Select Model", "Select Part", "View Results"];

/** scroll-mt-16 matches sticky header (h-16) so block:start lands below it */
function scrollStepIntoView(el: HTMLElement | null) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

export function SmartPartFinder({
  onQuickView,
  brands,
  categories,
}: SmartPartFinderProps) {
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [selectedPartType, setSelectedPartType] = useState<string | null>(null);

  const selectedBrandSlug =
    brands.find((b) => b.id === selectedBrandId)?.slug ?? null;

  const { data: models = [] } = useQuery({
    queryKey: ["models-by-brand", selectedBrandSlug],
    queryFn: () => fetchModelsByBrand(selectedBrandSlug as string),
    enabled: !!selectedBrandSlug,
  });

  const selectedModelSlug =
    models.find((m) => m.id === selectedModelId)?.slug ?? null;

  const { data: modelProducts = [] } = useQuery({
    queryKey: ["products-by-model", selectedModelSlug],
    queryFn: () =>
      fetchStorefrontProducts({ modelSlug: selectedModelSlug as string }),
    enabled: !!selectedModelSlug,
  });

  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef(0);

  const currentStep = selectedPartType
    ? 3
    : selectedModelId
      ? 2
      : selectedBrandId
        ? 1
        : 0;

  useEffect(() => {
    const prev = prevStepRef.current;
    if (currentStep === prev) return;
    if (currentStep > prev) {
      if (currentStep === 1) scrollStepIntoView(step2Ref.current);
      else if (currentStep === 2) scrollStepIntoView(step3Ref.current);
      else if (currentStep === 3) scrollStepIntoView(step4Ref.current);
    } else {
      if (currentStep === 0) scrollStepIntoView(step1Ref.current);
      else if (currentStep === 1) scrollStepIntoView(step2Ref.current);
      else if (currentStep === 2) scrollStepIntoView(step3Ref.current);
    }
    prevStepRef.current = currentStep;
  }, [currentStep]);

  const availablePartTypes = useMemo(() => {
    if (!selectedModelId) return [];
    const types = new Set(modelProducts.map((p) => p.partType));
    return categories.map((c) => c.name).filter((name) => types.has(name));
  }, [selectedModelId, modelProducts, categories]);

  const resultProducts = useMemo(() => {
    if (!selectedPartType) return [];
    return modelProducts.filter((p) => p.partType === selectedPartType);
  }, [selectedPartType, modelProducts]);

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);
  const selectedModel = models.find((m) => m.id === selectedModelId);

  const resetFrom = (step: number) => {
    if (step <= 0) {
      setSelectedBrandId(null);
      setSelectedModelId(null);
      setSelectedPartType(null);
    } else if (step <= 1) {
      setSelectedModelId(null);
      setSelectedPartType(null);
    } else if (step <= 2) {
      setSelectedPartType(null);
    }
  };

  return (
    <section className="py-16 min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <div className="container">
        {/* Header */}
        <div className="text-center mb-10">
          <Badge className="mb-3 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 text-xs tracking-wider uppercase font-semibold">
            Smart Part Finder
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Find Parts in <span className="text-primary">3 Easy Steps</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">
            Select your phone brand, then model, then the part you need — we'll
            show you everything available.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {steps.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className="flex items-center gap-1.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    i < currentStep
                      ? "bg-primary text-primary-foreground"
                      : i === currentStep
                        ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {i < currentStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span className="text-xs font-medium hidden sm:inline">
                  {label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 md:w-14 h-0.5 mx-2",
                    i < currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Brand Selection */}
        <div
          ref={step1Ref}
          className="scroll-mt-16 bg-card rounded-2xl border shadow-sm p-6 mb-4"
        >
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
            {brands.map((brand) => (
              <button
                key={brand.id}
                onClick={() => {
                  setSelectedBrandId(brand.id);
                  setSelectedModelId(null);
                  setSelectedPartType(null);
                }}
                className={cn(
                  "flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:shadow-glow",
                  selectedBrandId === brand.id
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-border hover:border-primary/30",
                )}
              >
                <div className="h-14 w-14 rounded-full bg-white flex items-center justify-center p-2.5">
                  <img
                    src={brand.logo}
                    alt={`${brand.name} logo`}
                    className="h-full w-full object-contain"
                    loading="lazy"
                  />
                </div>
                <span className="font-semibold text-sm">{brand.name}</span>
                <span className="text-xs text-muted-foreground">
                  {brand.productCount} parts
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Model Selection */}
        {selectedBrandId && (
          <div
            ref={step2Ref}
            className="scroll-mt-16 bg-card rounded-2xl border shadow-sm p-6 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Step 2
                </span>
                <span className="font-semibold text-sm">
                  Select {selectedBrand?.name} Model
                </span>
              </div>
              <button
                onClick={() => resetFrom(0)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    setSelectedModelId(model.id);
                    setSelectedPartType(null);
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                    selectedModelId === model.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Part Type Selection */}
        {selectedModelId && (
          <div
            ref={step3Ref}
            className="scroll-mt-16 bg-card rounded-2xl border shadow-sm p-6 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  Step 3
                </span>
                <span className="font-semibold text-sm">
                  Select Part Type for {selectedModel?.name}
                </span>
              </div>
              <button
                onClick={() => resetFrom(1)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {availablePartTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setSelectedPartType(pt)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                    selectedPartType === pt
                      ? "bg-accent text-accent-foreground border-accent"
                      : "border-border hover:border-accent/40 hover:bg-muted",
                  )}
                >
                  {getPartImage(pt) ? (
                    <img
                      src={getPartImage(pt)}
                      alt={pt}
                      className="h-8 w-8 object-contain shrink-0 rounded"
                      loading="lazy"
                    />
                  ) : (
                    <Settings2 className="h-4 w-4 shrink-0 text-accent-foreground/60" />
                  )}
                  {pt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {selectedPartType && (
          <div
            ref={step4Ref}
            className="scroll-mt-16 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <div className="bg-gradient-to-r from-primary/90 to-primary rounded-2xl text-primary-foreground text-center p-8 mb-6">
              <Badge className="mb-2 bg-white/20 text-white border-white/30 hover:bg-white/30 text-xs uppercase tracking-wider font-semibold">
                Ready!
              </Badge>
              <h3 className="text-xl font-bold mt-2">
                Showing {selectedPartType} for {selectedModel?.name}
              </h3>
              <p className="text-primary-foreground/70 text-sm mt-1">
                {resultProducts.length} option
                {resultProducts.length !== 1 ? "s" : ""} available — browse
                genuine and aftermarket parts with prices
              </p>
            </div>
            {resultProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {resultProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onQuickView={onQuickView}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No products found for this combination.</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => resetFrom(2)}
                >
                  Try a different part
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
