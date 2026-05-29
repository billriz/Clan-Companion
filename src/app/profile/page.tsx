import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CircleUserRound, CreditCard, Lock, SlidersHorizontal, User } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { getUserInitials } from "@/utils/user";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const displayName =
    typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim().length > 0
      ? user.user_metadata.full_name.trim()
      : "GravyTime User";
  const email = user?.email ?? "";

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Profile" description="Manage your account and preferences." />

      <section className="mt-4 rounded-3xl border bg-card p-5 shadow-subtle">
        <div className="mx-auto flex w-fit flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {getUserInitials(displayName)}
          </div>
          <p className="mt-3 text-lg font-semibold text-gravy-charcoal">{displayName}</p>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
      </section>

      <section className="mt-4 space-y-2 rounded-3xl border bg-card p-3 shadow-subtle">
        <ProfileRow icon={User} label="Account" href="/profile" />
        <ProfileRow icon={SlidersHorizontal} label="Preferences" href="/settings" />
        <ProfileRow icon={CreditCard} label="Subscription" href="/settings" suffix="Free" />
        <ProfileRow icon={Lock} label="Security" href="/settings" />
      </section>
    </div>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  href,
  suffix,
}: {
  icon: typeof CircleUserRound;
  label: string;
  href: string;
  suffix?: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-gravy-paper px-3 py-2 transition hover:bg-secondary"
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium text-gravy-charcoal">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        {suffix ? <span className="text-xs font-semibold">{suffix}</span> : null}
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </div>
    </Link>
  );
}
