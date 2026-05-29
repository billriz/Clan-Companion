import Image from "next/image";

import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  variant?: "full" | "icon";
  className?: string;
  priority?: boolean;
};

export function BrandMark({ variant = "full", className, priority = false }: BrandMarkProps) {
  if (variant === "icon") {
    return (
      <Image
        src={BRAND.assets.icon}
        alt="GravyTime app icon"
        width={1024}
        height={1024}
        priority={priority}
        className={cn("h-auto w-full object-contain", className)}
        sizes="(max-width: 768px) 48px, 64px"
      />
    );
  }

  return (
    <Image
      src={BRAND.assets.logo}
      alt="GravyTime"
      width={1536}
      height={1024}
      priority={priority}
      className={cn("h-auto w-full object-contain", className)}
      sizes="(max-width: 768px) 220px, 260px"
    />
  );
}
