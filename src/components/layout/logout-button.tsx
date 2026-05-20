"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = {
  className?: string;
  compact?: boolean;
};

export function LogoutButton({ className, compact = false }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <Button
      className={className}
      type="button"
      variant="secondary"
      onClick={handleLogout}
      disabled={isLoading}
    >
      <LogOut className={compact ? "h-4 w-4" : "mr-2 h-4 w-4"} aria-hidden="true" />
      {compact ? (
        <span className="sr-only">{isLoading ? "Signing out" : "Log out"}</span>
      ) : isLoading ? (
        "Signing out..."
      ) : (
        "Log out"
      )}
    </Button>
  );
}
