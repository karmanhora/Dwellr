import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WAITLIST_STATUS_CODE_PATTERN } from "@hauscrawl/core";

import { Container } from "@/components/ui/container";
import { createWaitlistAdminClient } from "@/lib/supabase/admin";
import { verifyWaitlistConfirmationLink } from "@/lib/waitlist-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

function ConfirmationError({ message }: { message: string }) {
  return (
    <Container size="narrow" className="py-14 sm:py-20">
      <p className="text-[11px] font-medium tracking-[0.2em] text-stone uppercase">
        Email confirmation
      </p>
      <h1 className="mt-4 text-4xl leading-tight font-medium tracking-[-0.04em] text-ink sm:text-5xl">
        We couldn&apos;t confirm that link.
      </h1>
      <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-stone">{message}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/#join"
          className="inline-flex h-11 items-center rounded-full bg-ink px-5 text-body-sm font-medium text-paper transition hover:bg-ink-soft"
        >
          Join the waitlist
        </Link>
        <Link
          href="/waitlist/how-it-works"
          className="inline-flex h-11 items-center rounded-full border border-line-strong bg-paper px-5 text-body-sm font-medium text-ink transition hover:border-ink hover:bg-mist"
        >
          How it works
        </Link>
      </div>
    </Container>
  );
}

export default async function WaitlistConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  const link = token ? verifyWaitlistConfirmationLink(token) : null;
  const signupId = link?.signupId ?? null;

  if (!signupId) {
    return (
      <ConfirmationError message="This confirmation link is invalid or has expired. Sign up again with the same email to request a fresh link." />
    );
  }

  const admin = createWaitlistAdminClient();
  if (!admin) {
    return (
      <ConfirmationError message="Confirmation is temporarily unavailable. Try the link again in a moment." />
    );
  }

  const { data, error } = await admin.rpc("confirm_waitlist_signup", {
    p_signup_id: signupId,
  });

  if (error) {
    console.error("[waitlist] confirmation failed:", error.code ?? "unknown");
    return (
      <ConfirmationError message="Confirmation is temporarily unavailable. Try the link again in a moment." />
    );
  }

  const result = data as { ok?: boolean; status_code?: string } | null;
  if (
    !result?.ok ||
    typeof result.status_code !== "string" ||
    !WAITLIST_STATUS_CODE_PATTERN.test(result.status_code)
  ) {
    return (
      <ConfirmationError message="This confirmation link is no longer active. Sign up again with the same email to request a fresh link." />
    );
  }

  // Staged survey answers become trusted here, and only when this confirmation
  // link was issued to the same survey session that staged them. Answers staged
  // by someone who merely typed the address use another session and are never
  // promoted; the owner can still replace them from the status page.
  if (link?.surveySessionId) {
    const { error: promoteError } = await admin.rpc("promote_waitlist_survey", {
      p_signup_id: signupId,
      p_session_id: link.surveySessionId,
    });
    if (promoteError) {
      console.error("[waitlist] survey promotion failed:", promoteError.code ?? "unknown");
    }
  }

  // Confirming the waitlist by email also proves ownership of the address, so
  // mark the linked Auth record confirmed. If the row predates the link or the
  // Auth update fails, keep the waitlist confirmation working; password
  // recovery can still establish and verify the account later.
  const { data: signup, error: linkError } = await admin
    .from("waitlist_signups")
    .select("auth_user_id")
    .eq("id", signupId)
    .maybeSingle();

  if (linkError) {
    console.error("[waitlist] auth link lookup failed:", linkError.code ?? "unknown");
  } else if (signup?.auth_user_id) {
    const { error: authError } = await admin.auth.admin.updateUserById(signup.auth_user_id, {
      email_confirm: true,
    });
    if (authError) {
      console.error("[waitlist] auth email confirmation failed:", authError.code ?? "unknown");
    }
  }

  redirect(`/waitlist/status/${result.status_code}`);
}
