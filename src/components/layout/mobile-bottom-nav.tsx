import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type AppNavItem = {
  id: "dashboard" | "recipes" | "planner" | "pantry" | "list";
  label: string;
  mobileLabel: string;
  href: string;
  icon: LucideIcon;
};

type MobileBottomNavProps = {
  items: readonly AppNavItem[];
  activeItem: AppNavItem["id"];
};

export function MobileBottomNav({ items, activeItem }: MobileBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-gravy-paper/95 px-2 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-soft backdrop-blur lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1.5">
        {items.map((item) => {
          const isActive = item.id === activeItem;

          return (
            <Link
              key={item.id}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[4.4rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary text-primary-foreground shadow-subtle"
                  : "text-muted-foreground hover:bg-secondary hover:text-gravy-charcoal",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
