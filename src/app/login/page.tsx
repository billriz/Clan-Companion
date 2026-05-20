import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Log in | Clan Companion",
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
      title="Plan the week with less friction."
      description="Log in to return to your Clan Companion dashboard."
      footer={
        <>
          New to Clan Companion?{" "}
          <Link className="font-medium text-primary hover:text-plate-olive" href="/signup">
            Create an account
          </Link>
        </>
      }
    >
      <AuthForm mode="login" redirectedFrom={redirectedFrom} />
    </AuthShell>
  );
}
