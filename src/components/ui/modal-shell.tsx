"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type ModalShellProps = {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  panelClassName?: string;
  children: React.ReactNode;
};

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ModalShell({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  panelClassName,
  children,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const panelElement = panelRef.current;
    const previouslyFocusedElement = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusableElements = panelElement
      ? Array.from(panelElement.querySelectorAll<HTMLElement>(focusableSelector))
      : [];

    if (focusableElements[0]) {
      focusableElements[0].focus();
    } else {
      panelElement?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      if (!panelElement) {
        return;
      }

      const nextFocusableElements = Array.from(
        panelElement.querySelectorAll<HTMLElement>(focusableSelector),
      );

      if (nextFocusableElements.length === 0) {
        event.preventDefault();
        panelElement.focus();
        return;
      }

      const firstElement = nextFocusableElements[0];
      const lastElement = nextFocusableElements[nextFocusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gravy-charcoal/35 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <button
        aria-hidden="true"
        className="absolute inset-0 cursor-default"
        tabIndex={-1}
        type="button"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        aria-describedby={describedBy}
        aria-labelledby={labelledBy}
        aria-modal="true"
        className={cn(
          "relative flex w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-border bg-gravy-paper shadow-soft focus:outline-none sm:rounded-2xl",
          panelClassName,
        )}
        role="dialog"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
