import Link from "next/link";
import { BookOpen, CalendarDays, Download, ChefHat, Home, ListChecks, ShoppingBasket } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/utils/user";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  activeItem?: "dashboard" | "recipes" | "planner" | "list";
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
    <div className="min-h-dvh bg-plate-cream text-plate-charcoal">
      <a
        className="absolute left-3 top-3 z-[60] -translate-y-16 rounded-md border bg-white px-3 py-2 text-sm font-semibold text-primary shadow-subtle transition focus:translate-y-0"
        href="#app-main-content"
      >
        Skip to main content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-border/80 bg-plate-paper px-5 py-6 lg:flex lg:flex-col">
        <Link className="flex items-center gap-3 rounded-xl p-2 hover:bg-secondary/60" href="/dashboard">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-subtle">
            <ChefHat className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">PlatePlan</p>
            <p className="text-sm text-muted-foreground">Plan meals. Shop smarter.</p>
          </div>
        </Link>

        <nav className="mt-8 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive = item.id === activeItem;

            return (
              <Link
                key={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-plate-paper",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-subtle"
                    : "text-muted-foreground hover:bg-secondary hover:text-plate-charcoal",
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
          className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-plate-blue/20 bg-plate-blue/10 px-3 py-2.5 text-sm font-medium text-plate-blue transition hover:bg-plate-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-plate-paper"
          href="/recipes/import"
        >
          <Download className="h-5 w-5" aria-hidden="true" />
          Import Recipes
        </Link>

        <div className="mt-auto rounded-2xl border border-border/80 bg-plate-cream p-4 shadow-subtle">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-plate-terracotta/15 text-sm font-semibold text-plate-terracotta">
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
        <header className="sticky top-0 z-20 border-b border-border/80 bg-plate-cream/95 pt-[env(safe-area-inset-top)] backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
                <ChefHat className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-plate-charcoal">{activeLabel}</p>
                <p className="truncate text-xs text-muted-foreground">PlatePlan workspace</p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-subtle sm:flex">
                <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                MVP ready
              </div>

              <p className="hidden max-w-[220px] truncate text-sm text-muted-foreground lg:block">
                {userEmail}
              </p>

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-plate-terracotta/15 text-sm font-semibold text-plate-terracotta lg:hidden">
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
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-plate-paper/95 px-2 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-soft backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5">
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
                    : "text-muted-foreground hover:bg-secondary hover:text-plate-charcoal",
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
