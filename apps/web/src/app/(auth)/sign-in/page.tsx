import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { safeRedirectPath } from "@hauscrawl/core";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to HausCrawl.",
};

type SignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  const params = await searchParams;
  const rawNext = params.next;
  const next = safeRedirectPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);

  return (
    <AuthShell
      title="Welcome back"
      description="Pick up where you left off with the homes you're considering."
      alternate={
        <>
          New to HausCrawl?{" "}
          <Link href="/sign-up" className="font-medium text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm next={next} />
    </AuthShell>
  );
}
