import Link from "next/link";
import { BookOpen, CalendarDays, ChefHat, Home, ListChecks, ShoppingBasket } from "lucide-react";

import { LogoutButton } from "@/components/layout/logout-button";
import { getUserInitials } from "@/utils/user";

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string;
  userName: string | null;
  activeItem?: "dashboard" | "recipes" | "planner" | "list";
};

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: Home },
  { id: "recipes", label: "Recipes", href: "/recipes", icon: BookOpen },
  { id: "planner", label: "Planner", href: "/dashboard", icon: CalendarDays },
  { id: "list", label: "List", href: "/dashboard", icon: ShoppingBasket },
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
    <div className="min-h-screen bg-plate-cream text-plate-charcoal">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r bg-plate-paper px-5 py-6 lg:flex lg:flex-col">
        <Link className="flex items-center gap-3" href="/dashboard">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-subtle">
            <ChefHat className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-lg font-semibold">Clan Companion</p>
            <p className="text-sm text-muted-foreground">Recipe planning</p>
          </div>
        </Link>

        <nav className="mt-10 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                item.id === activeItem
                  ? "bg-primary text-primary-foreground shadow-subtle"
                  : "text-muted-foreground hover:bg-secondary hover:text-plate-charcoal"
              }`}
              href={item.href}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-auto rounded-lg border bg-plate-cream p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-plate-terracotta/15 text-sm font-semibold text-plate-terracotta">
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
        <header className="sticky top-0 z-20 border-b bg-plate-cream/90 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <ChefHat className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-semibold">Clan Companion</p>
                <p className="text-xs text-muted-foreground">{activeLabel}</p>
              </div>
            </div>
            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium">{userEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-md border bg-plate-paper px-3 py-2 text-sm text-muted-foreground sm:flex">
                <ListChecks className="h-4 w-4 text-primary" aria-hidden="true" />
                Phase 2
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-plate-terracotta/15 text-sm font-semibold text-plate-terracotta lg:hidden">
                {initials}
              </div>
              <LogoutButton className="h-9 w-9 px-0 lg:hidden" compact />
            </div>
          </div>
        </header>

        <main className="pb-24 lg:pb-0">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-plate-paper/95 px-2 py-2 shadow-soft backdrop-blur lg:hidden"
        aria-label="Mobile navigation"
      >
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={`flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs font-medium ${
                item.id === activeItem ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
              href={item.href}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
