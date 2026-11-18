import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure link to reset your HausCrawl password.",
  robots: { index: false, follow: false },
};

type ForgotPasswordPageProps = {
  searchParams: Promise<{ email?: string | string[]; error?: string | string[] }>;
};

export default async function ForgotPasswordPage({ searchParams }: ForgotPasswordPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  const params = await searchParams;
  const rawEmail = params.email;
  const rawError = params.error;
  const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email you used for HausCrawl. We will send a secure link to set a new password."
      alternate={
        <>
          Remembered your password?{" "}
          <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm defaultEmail={email} linkError={error === "link"} />
    </AuthShell>
  );
}
