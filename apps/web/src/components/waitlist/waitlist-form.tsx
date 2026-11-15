"use client";

import {
  WAITLIST_ROLE_LABELS,
  WAITLIST_ROLES,
  WAITLIST_SEARCHING_WITH,
  WAITLIST_SEARCHING_WITH_LABELS,
} from "@dwellr/core/waitlist";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select";
import { trackWaitlistEvent } from "@/lib/waitlist-analytics";

type WaitlistFormProps = {
  idPrefix: string;
  eyebrow?: string;
  trackPageView?: boolean;
};

type SuccessState = {
  referralCode: string;
  shareUrl: string;
};

type SourceState = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  ref?: string;
};

const SHARE_TEXT = "I'm on the dwellr waitlist for early access in Seattle / King County. Find a home together.";

function readSource(): SourceState {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref")?.trim().toLowerCase();

  return {
    utmSource: params.get("utm_source") ?? undefined,
    utmMedium: params.get("utm_medium") ?? undefined,
    utmCampaign: params.get("utm_campaign") ?? undefined,
    referrer: document.referrer || undefined,
    ref: ref && /^[a-z0-9]{10}$/.test(ref) ? ref : undefined,
  };
}

export function WaitlistForm({ idPrefix, eyebrow, trackPageView = false }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [searchingWith, setSearchingWith] = useState("");
  const [region, setRegion] = useState("");
  const [source] = useState<SourceState>(() =>
    typeof window === "undefined" ? {} : readSource(),
  );
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [copied, setCopied] = useState(false);

  const started = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trackPageView) trackWaitlistEvent("waitlist_page_view");
  }, [trackPageView]);

  function markStarted() {
    if (started.current) return;
    started.current = true;
    trackWaitlistEvent("waitlist_form_start", { form: idPrefix });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    setError(null);
    const normalizedEmail = email.trim();
    if (
      normalizedEmail.length === 0 ||
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      setError("Enter a valid email address and try again.");
      return;
    }

    trackWaitlistEvent("waitlist_form_submit", { form: idPrefix });
    setStatus("submitting");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          role: role || undefined,
          searchingWith: searchingWith || undefined,
          region: region.trim() || undefined,
          ref: source.ref,
          utmSource: source.utmSource,
          utmMedium: source.utmMedium,
          utmCampaign: source.utmCampaign,
          referrer: source.referrer,
          website: honeypotRef.current?.value ?? "",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { ok?: boolean; referralCode?: string; shareUrl?: string; message?: string }
        | null;

      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many signups from this connection. Try again in a few minutes."
            : (payload?.message ?? "We couldn't add you just now. Try again."),
        );
        setStatus("idle");
        return;
      }

      if (!payload?.referralCode || !payload.shareUrl) {
        setError("We couldn't add you just now. Try again.");
        setStatus("idle");
        return;
      }

      setSuccess({ referralCode: payload.referralCode, shareUrl: payload.shareUrl });
      setStatus("success");
      trackWaitlistEvent("waitlist_success", { form: idPrefix });
    } catch {
      setError("We couldn't add you just now. Check your connection and try again.");
      setStatus("idle");
    }
  }

  async function copyShareLink() {
    if (!success) return;

    trackWaitlistEvent("waitlist_referral_share_click", { method: "copy", form: idPrefix });

    try {
      await navigator.clipboard.writeText(success.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_500);
    } catch {
      const input = document.getElementById(`${idPrefix}-share`) as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
        document.execCommand("copy");
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2_500);
      }
    }
  }

  if (success) {
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(success.shareUrl)}`;
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(success.shareUrl)}`;
    const emailUrl = `mailto:?subject=${encodeURIComponent("Join me on the dwellr waitlist")}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${success.shareUrl}`)}`;

    return (
      <div className="rounded-[1.6rem] border border-line bg-paper p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-soft text-ink">
            <CheckIcon size={18} />
          </span>
          <p className="text-lg font-medium tracking-[-0.02em] text-ink" role="status" aria-live="polite">
            You&apos;re on the list.
          </p>
        </div>

        <p className="mt-4 text-body-sm leading-relaxed text-stone">
          We&apos;ll email you when early access opens in Seattle / King County. No noise in the
          meantime.
        </p>

        <div className="mt-6 border-t border-line pt-5">
          <label htmlFor={`${idPrefix}-share`} className="text-body-sm font-medium text-ink">
            Your share link
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input
              id={`${idPrefix}-share`}
              readOnly
              value={success.shareUrl}
              onFocus={(event) => event.currentTarget.select()}
              className="text-body-sm"
            />
            <Button type="button" variant="secondary" onClick={copyShareLink} className="shrink-0">
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
          <p className="mt-2 text-caption text-stone">
            Know someone hunting too? Share your link. We count referrals when they sign up.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
            onClick={() =>
              trackWaitlistEvent("waitlist_referral_share_click", { method: "x", form: idPrefix })
            }
          >
            Share on X
          </a>
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "secondary", size: "sm" })}
            onClick={() =>
              trackWaitlistEvent("waitlist_referral_share_click", {
                method: "facebook",
                form: idPrefix,
              })
            }
          >
            Share on Facebook
          </a>
          <a
            href={emailUrl}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
            onClick={() =>
              trackWaitlistEvent("waitlist_referral_share_click", { method: "email", form: idPrefix })
            }
          >
            Email a friend
          </a>
        </div>

        <p className="mt-5 text-caption text-stone">
          We never share your email.{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy
          </a>
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={markStarted}
      className="relative rounded-[1.6rem] border border-line bg-paper p-6 sm:p-7"
      noValidate
    >
      {eyebrow ? (
        <p className="text-[11px] font-medium tracking-[0.18em] text-stone uppercase">{eyebrow}</p>
      ) : null}

      <div className={eyebrow ? "mt-4" : ""}>
        <Field
          label="Email address"
          name={`${idPrefix}-email`}
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          error={error ?? undefined}
        />
      </div>

      <details className="group mt-4 border-t border-line pt-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-body-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/15">
          Add a little more
          <span className="text-caption font-normal text-stone">Optional</span>
        </summary>

        <div className="mt-4 grid gap-4">
          <SelectField
            label="What best describes you?"
            name={`${idPrefix}-role`}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            hint="Optional"
          >
            <option value="">Prefer not to say</option>
            {WAITLIST_ROLES.map((value) => (
              <option key={value} value={value}>
                {WAITLIST_ROLE_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Who are you searching with?"
            name={`${idPrefix}-searching-with`}
            value={searchingWith}
            onChange={(event) => setSearchingWith(event.target.value)}
            hint="Optional"
          >
            <option value="">Prefer not to say</option>
            {WAITLIST_SEARCHING_WITH.map((value) => (
              <option key={value} value={value}>
                {WAITLIST_SEARCHING_WITH_LABELS[value]}
              </option>
            ))}
          </SelectField>

          <Field
            label="City or region"
            name={`${idPrefix}-region`}
            placeholder="Seattle, Bellevue, King County…"
            value={region}
            onChange={(event) => setRegion(event.target.value)}
            maxLength={80}
            hint="Optional · please keep it general"
          />
        </div>
      </details>

      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor={`${idPrefix}-website`}>Company website</label>
        <input
          ref={honeypotRef}
          id={`${idPrefix}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>

      <Button
        type="submit"
        size="lg"
        loading={status === "submitting"}
        className="mt-5 w-full"
      >
        {status === "submitting" ? "Joining…" : "Join the waitlist"}
      </Button>

      <p className="mt-3 text-center text-caption leading-relaxed text-stone">
        Only waitlist updates. No spam, no selling your email.{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy
        </a>
      </p>
    </form>
  );
}
