import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND } from "@/lib/brand";

type BrandLoadingStateProps = {
  label?: string;
  message?: string;
  className?: string;
};

export function BrandLoadingState({
  label = BRAND.name,
  message = BRAND.tagline,
  className,
}: BrandLoadingStateProps) {
  return (
    <div className={className}>
      <div className="inline-flex items-center gap-3 rounded-2xl border bg-gravy-paper px-3 py-2 shadow-subtle">
        <div className="w-10 shrink-0 animate-pulse">
          <BrandMark variant="icon" className="rounded-xl" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gravy-charcoal">{label}</p>
          <p className="text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
