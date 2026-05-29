import { Bell } from "lucide-react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { LogoutButton } from "@/components/layout/logout-button";

type AppHeaderProps = {
  activeLabel: string;
  userEmail: string;
  initials: string;
};

export function AppHeader({ activeLabel, userEmail, initials }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-gravy-cream/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo className="lg:hidden" iconOnly />
          <div className="hidden lg:block">
            <BrandLogo className="max-w-[9.5rem]" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gravy-charcoal lg:hidden">GravyTime</p>
            <p className="truncate text-xs text-muted-foreground">{activeLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notifications"
            className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-gravy-paper text-muted-foreground sm:flex"
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="hidden max-w-[180px] truncate text-xs text-muted-foreground lg:block">{userEmail}</p>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gravy-brown/15 text-xs font-semibold text-gravy-brown lg:hidden">
            {initials}
          </div>
          <LogoutButton className="h-9 w-9 px-0 lg:hidden" compact />
        </div>
      </div>
    </header>
  );
}
