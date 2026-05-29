import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Log In",
};

type LoginPageProps = {
  searchParams: Promise<{
    redirectedFrom?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectedFrom } = await searchParams;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title={BRAND.tagline}
      description={BRAND.heroCopy}
      footer={
        <>
          New to {BRAND.name}?{" "}
          <Link className="font-medium text-primary hover:text-gravy-brown" href="/signup">
            Get started
          </Link>
        </>
      }
    >
      <AuthForm mode="login" redirectedFrom={redirectedFrom} />
    </AuthShell>
  );
}
