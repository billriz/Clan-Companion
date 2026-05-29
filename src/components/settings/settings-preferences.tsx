"use client";

import { useEffect, useState } from "react";
import { Bell, Globe, Monitor, Ruler, UsersRound } from "lucide-react";

import { cn } from "@/lib/utils";

type PreferencesState = {
  appearance: "light" | "system";
  defaultServings: number;
  measurementSystem: "US Customary" | "Metric";
  pushNotifications: boolean;
  emailNotifications: boolean;
  language: "English";
};

const defaultState: PreferencesState = {
  appearance: "light",
  defaultServings: 4,
  measurementSystem: "US Customary",
  pushNotifications: true,
  emailNotifications: true,
  language: "English",
};

const storageKey = "gravytime-preferences";

export function SettingsPreferences() {
  const [preferences, setPreferences] = useState<PreferencesState>(() => {
    if (typeof window === "undefined") {
      return defaultState;
    }

    const stored = window.localStorage.getItem(storageKey);
    if (!stored) {
      return defaultState;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<PreferencesState>;
      return { ...defaultState, ...parsed };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences]);

  return (
    <section className="mt-4 space-y-2 rounded-3xl border bg-card p-3 shadow-subtle">
      <SettingRow
        icon={Monitor}
        label="Appearance"
        trailing={
          <select
            aria-label="Appearance"
            value={preferences.appearance}
            className="rounded-lg border bg-gravy-paper px-2 py-1 text-xs"
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                appearance: event.target.value as PreferencesState["appearance"],
              }))
            }
          >
            <option value="light">Light</option>
            <option value="system">System</option>
          </select>
        }
      />

      <SettingRow
        icon={UsersRound}
        label="Default Servings"
        trailing={
          <select
            aria-label="Default servings"
            value={preferences.defaultServings}
            className="rounded-lg border bg-gravy-paper px-2 py-1 text-xs"
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                defaultServings: Number.parseInt(event.target.value, 10) || 4,
              }))
            }
          >
            {[1, 2, 4, 6, 8, 10, 12].map((count) => (
              <option key={count} value={count}>
                {count} servings
              </option>
            ))}
          </select>
        }
      />

      <SettingRow
        icon={Ruler}
        label="Measurement System"
        trailing={
          <select
            aria-label="Measurement system"
            value={preferences.measurementSystem}
            className="rounded-lg border bg-gravy-paper px-2 py-1 text-xs"
            onChange={(event) =>
              setPreferences((current) => ({
                ...current,
                measurementSystem: event.target.value as PreferencesState["measurementSystem"],
              }))
            }
          >
            <option value="US Customary">US Customary</option>
            <option value="Metric">Metric</option>
          </select>
        }
      />

      <SettingRow
        icon={Bell}
        label="Push Notifications"
        trailing={
          <Toggle
            checked={preferences.pushNotifications}
            onChange={(checked) =>
              setPreferences((current) => ({ ...current, pushNotifications: checked }))
            }
          />
        }
      />

      <SettingRow
        icon={Bell}
        label="Email Notifications"
        trailing={
          <Toggle
            checked={preferences.emailNotifications}
            onChange={(checked) =>
              setPreferences((current) => ({ ...current, emailNotifications: checked }))
            }
          />
        }
      />

      <SettingRow
        icon={Globe}
        label="Language"
        trailing={
          <span className="rounded-lg border bg-gravy-paper px-2 py-1 text-xs text-muted-foreground">
            {preferences.language}
          </span>
        }
      />
    </section>
  );
}

function SettingRow({
  icon: Icon,
  label,
  trailing,
}: {
  icon: typeof Monitor;
  label: string;
  trailing: import("react").ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border bg-gravy-paper px-3 py-2">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium text-gravy-charcoal">{label}</p>
      </div>
      {trailing}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={cn(
        "relative h-6 w-11 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        checked ? "bg-primary" : "bg-muted",
      )}
      onClick={() => onChange(!checked)}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white transition",
          checked ? "left-[1.3rem]" : "left-0.5",
        )}
      />
    </button>
  );
}
