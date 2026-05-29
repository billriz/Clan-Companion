"use client";

import { Download, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

type PromptChoiceOutcome = "accepted" | "dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: PromptChoiceOutcome;
    platform: string;
  }>;
};

const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const NATIVE_DISMISSED_KEY = "gravytime_install_prompt_dismissed_at";
const IOS_DISMISSED_KEY = "gravytime_ios_install_prompt_dismissed_at";

function hasRecentDismissal(storageKey: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return false;
  }

  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) {
    return false;
  }

  return Date.now() - dismissedAt < DISMISS_DURATION_MS;
}

function setDismissal(storageKey: string) {
  localStorage.setItem(storageKey, String(Date.now()));
}

function isStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isIosSafari() {
  if (typeof window === "undefined") {
    return false;
  }

  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isWebKit = /WebKit/.test(ua);
  const isCriOS = /CriOS/.test(ua);
  const isFxiOS = /FxiOS/.test(ua);
  const isEdgiOS = /EdgiOS/.test(ua);

  return isIos && isWebKit && !isCriOS && !isFxiOS && !isEdgiOS;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showNativePrompt, setShowNativePrompt] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(() => {
    return !isStandalone() && isIosSafari() && !hasRecentDismissal(IOS_DISMISSED_KEY);
  });

  const hideAllPrompts = () => {
    setShowNativePrompt(false);
    setShowIosPrompt(false);
  };

  useEffect(() => {
    if (isStandalone()) {
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();

      if (isStandalone() || hasRecentDismissal(NATIVE_DISMISSED_KEY)) {
        return;
      }

      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setShowNativePrompt(true);
      setShowIosPrompt(false);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      hideAllPrompts();
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const mode = useMemo(() => {
    if (showNativePrompt && deferredPrompt) {
      return "native";
    }

    if (showIosPrompt) {
      return "ios";
    }

    return "hidden";
  }, [deferredPrompt, showIosPrompt, showNativePrompt]);

  if (mode === "hidden") {
    return null;
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === "dismissed") {
      setDismissal(NATIVE_DISMISSED_KEY);
    }

    setDeferredPrompt(null);
    hideAllPrompts();
  }

  function dismissPrompt() {
    if (mode === "native") {
      setDismissal(NATIVE_DISMISSED_KEY);
    }

    if (mode === "ios") {
      setDismissal(IOS_DISMISSED_KEY);
    }

    hideAllPrompts();
  }

  return (
    <section className="rounded-2xl border border-gravy-gold/25 bg-gravy-paper p-4 shadow-subtle">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <div className="w-9 shrink-0">
              <BrandMark variant="icon" className="rounded-lg" />
            </div>
            <p className="text-base font-semibold text-gravy-charcoal">Install {BRAND.name}</p>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Add {BRAND.name} to your home screen for quick access to recipes, meal plans, and
            shopping lists.
          </p>
          {mode === "ios" ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-card/80 px-3 py-1 text-xs font-medium text-gravy-brown">
              <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
              On iPhone or iPad, tap Share, then Add to Home Screen.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {mode === "native" ? (
            <Button className="gap-1.5" onClick={handleInstall} type="button">
              <Download className="h-4 w-4" aria-hidden="true" />
              Install
            </Button>
          ) : null}
          <Button onClick={dismissPrompt} type="button" variant="secondary">
            Not now
          </Button>
        </div>
      </div>
    </section>
  );
}
