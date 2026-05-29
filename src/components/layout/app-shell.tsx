import Link from "next/link";
import {
  BookOpen,
  CalendarDays,
  Download,
  Home,
  Package,
  ShoppingBasket,
} from "lucide-react";

import { BrandMark } from "@/components/brand/brand-mark";
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

const navItems = [
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
    mobileLabel: "Planner",
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
          <BrandMark className="max-w-[11.5rem]" priority />
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
        <header className="sticky top-0 z-20 border-b border-border/80 bg-gravy-cream/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-9 shrink-0 lg:hidden">
                <BrandMark variant="icon" className="rounded-xl" />
              </div>
              <div className="hidden lg:block">
                <BrandMark className="h-9 w-auto" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gravy-charcoal lg:hidden">{BRAND.name}</p>
                <p className="truncate text-xs text-muted-foreground">{activeLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden rounded-full border bg-gravy-paper px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-subtle sm:block">
                {BRAND.tagline}
              </div>

              <p className="hidden max-w-[220px] truncate text-sm text-muted-foreground lg:block">
                {userEmail}
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gravy-brown/15 text-sm font-semibold text-gravy-brown lg:hidden">
                {initials}
              </div>
              <LogoutButton className="h-9 w-9 px-0 lg:hidden" compact />
            </div>
          </div>
        </header>

        <main
          id="app-main-content"
          className="pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-10"
        >
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-gravy-paper/95 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-soft backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1.5">
          {navItems.map((item) => {
            const isActive = item.id === activeItem;

            return (
              <Link
                key={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-secondary hover:text-gravy-charcoal",
                )}
                href={item.href}
              >
                <item.icon className="h-5 w-5" aria-hidden="true" />
                <span>{item.mobileLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
