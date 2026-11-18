import type { Metadata } from "next";
import Link from "next/link";

import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Finish resetting your HausCrawl password.",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <AuthShell
        title="This reset link has expired"
        description="Request a new password reset link to continue."
        alternate={
          <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
            Back to sign in
          </Link>
        }
      >
        <Link
          href="/forgot-password"
          className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-paper transition hover:bg-ink-soft"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="Your email link is verified. Set a password you will use to sign in."
      alternate={
        <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
