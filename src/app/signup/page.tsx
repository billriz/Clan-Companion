import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Start fresh"
      title="Create your PlatePlan workspace."
      description="Set up a secure account for your recipe planning dashboard."
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:text-plate-olive" href="/login">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
