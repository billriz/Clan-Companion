import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Download,
  Home,
  Package,
  ShoppingBasket,
} from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AppHeader } from "@/components/layout/app-header";
import { type AppNavItem, MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { LogoutButton } from "@/components/layout/logout-button";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/utils/user";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  activeItem?: "dashboard" | "recipes" | "planner" | "pantry" | "list";
};

const navItems: readonly AppNavItem[] = [
  { id: "dashboard", label: "Dashboard", mobileLabel: "Home", href: "/dashboard", icon: Home },
  {
    id: "recipes",
    label: "Recipes",
    mobileLabel: "Recipes",
    href: "/recipes",
    icon: BookOpen,
  },
  {
    id: "planner",
    label: "Meal Planner",
    mobileLabel: "Meal Plan",
    href: "/meal-planner",
    icon: CalendarDays,
  },
  {
    id: "pantry",
    label: "Pantry",
    mobileLabel: "Pantry",
    href: "/pantry",
    icon: Package,
  },
  {
    id: "list",
    label: "Shopping List",
    mobileLabel: "List",
    href: "/shopping-list",
    icon: ShoppingBasket,
  },
] as const;

export function AppShell({
  children,
  userEmail,
  userName,
  activeItem = "dashboard",
}: AppShellProps) {
  const displayName = userName || userEmail;
  const initials = getUserInitials(displayName);
  const activeLabel = navItems.find((item) => item.id === activeItem)?.label ?? "Dashboard";

  return (
    <div className="min-h-dvh bg-gravy-cream text-gravy-charcoal">
      <a
        className="absolute left-3 top-3 z-[60] -translate-y-16 rounded-md border bg-gravy-paper px-3 py-2 text-sm font-semibold text-primary shadow-subtle transition focus:translate-y-0"
        href="#app-main-content"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border/80 bg-gravy-paper px-5 py-6 lg:flex lg:flex-col">
        <Link className="rounded-xl p-2 transition hover:bg-secondary/60" href="/dashboard">
          <BrandLogo className="max-w-[11.5rem]" priority />
          <p className="mt-2 text-sm text-muted-foreground">{BRAND.tagline}</p>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.id === activeItem;

            return (
              <Link
                key={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-gravy-paper",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-secondary hover:text-gravy-charcoal",
                )}
                href={item.href}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-gravy-gold/20 bg-gravy-gold/10 px-3 py-2.5 text-sm font-medium text-gravy-brown transition hover:bg-gravy-gold/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-gravy-paper"
          href="/recipes/import"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          Import Recipes
        </Link>

        <div className="mt-auto rounded-2xl border border-border/80 bg-gravy-cream p-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gravy-brown/15 text-sm font-semibold text-gravy-brown">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
          <LogoutButton className="mt-4 w-full" />
        </div>
      </aside>

      <div className="lg:pl-72">
        <AppHeader activeLabel={activeLabel} initials={initials} userEmail={userEmail} />

        <main id="app-main-content" className="pb-[calc(6.6rem+env(safe-area-inset-bottom))] lg:pb-10">
          {children}
        </main>
      </div>

      <MobileBottomNav items={navItems} activeItem={activeItem} />
    </div>
  );
}
