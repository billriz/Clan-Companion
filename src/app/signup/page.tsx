import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignupPage() {
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your meal plan."
      description={BRAND.heroCopy}
      footer={
        <>
          Already have an account?{" "}
          <Link className="font-medium text-primary hover:text-gravy-brown" href="/login">
            Log in
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
