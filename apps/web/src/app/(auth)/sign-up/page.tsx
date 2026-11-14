import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Join dwellr to save homes, build shared collections, and decide together.",
};

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/me");

  return (
    <AuthShell
      title="Create your account"
      description="Start a home record you and the people deciding with you can actually use."
      alternate={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-medium text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}
