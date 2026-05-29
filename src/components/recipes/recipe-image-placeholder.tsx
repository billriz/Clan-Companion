import { ChefHat } from "lucide-react";

import { cn } from "@/lib/utils";

type RecipeImagePlaceholderProps = {
  className?: string;
  iconClassName?: string;
};

export function RecipeImagePlaceholder({
  className,
  iconClassName,
}: RecipeImagePlaceholderProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/12 via-gravy-paper to-gravy-brown/12 text-primary",
        className,
      )}
    >
      <ChefHat className={cn("h-10 w-10", iconClassName)} aria-hidden="true" />
    </div>
  );
}
