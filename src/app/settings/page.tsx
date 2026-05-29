import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { SettingsPreferences } from "@/components/settings/settings-preferences";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader title="Settings" description="Tune your GravyTime preferences." />
      <SettingsPreferences />
    </div>
  );
}
