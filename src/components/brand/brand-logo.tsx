import { BrandMark } from "@/components/brand/brand-mark";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  iconOnly?: boolean;
  priority?: boolean;
  showTagline?: boolean;
};

export function BrandLogo({ className, iconOnly = false, priority = false, showTagline = false }: BrandLogoProps) {
  return (
    <div className={cn("space-y-1", className)}>
      <BrandMark
        variant={iconOnly ? "icon" : "full"}
        priority={priority}
        className={iconOnly ? "w-12 rounded-xl" : "max-w-[11rem]"}
      />
      {showTagline ? <p className="text-xs text-muted-foreground">{BRAND.tagline}</p> : null}
    </div>
  );
}
