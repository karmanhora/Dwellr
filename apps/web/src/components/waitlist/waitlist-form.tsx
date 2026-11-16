"use client";

import {
  WAITLIST_ROLE_LABELS,
  WAITLIST_ROLES,
  WAITLIST_SEARCHING_WITH,
  WAITLIST_SEARCHING_WITH_LABELS,
} from "@dwellr/core/waitlist";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { SelectField } from "@/components/ui/select";
import { trackWaitlistEvent } from "@/lib/waitlist-analytics";

type WaitlistFormProps = {
  idPrefix: string;
  eyebrow?: string;
  trackPageView?: boolean;
};

type SuccessState = {
  emailConfigured: boolean;
};

type SourceState = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
  ref?: string;
};

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
  const [source] = useState<SourceState>(() => (typeof window === "undefined" ? {} : readSource()));
  const [status, setStatus] = useState<"idle" | "submitting" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

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

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        emailConfigured?: boolean;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many signups from this connection. Try again in a few minutes."
            : (payload?.message ?? "We couldn't add you just now. Try again."),
        );
        setStatus("idle");
        return;
      }

      setSuccess({ emailConfigured: payload?.emailConfigured === true });
      setStatus("success");
      trackWaitlistEvent("waitlist_success", { form: idPrefix });
    } catch {
      setError("We couldn't add you just now. Check your connection and try again.");
      setStatus("idle");
    }
  }

  if (success) {
    return (
      <div className="rounded-[1.6rem] border border-line bg-paper p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-soft text-ink">
            <CheckIcon size={18} />
          </span>
          <p
            className="text-lg font-medium tracking-[-0.02em] text-ink"
            role="status"
            aria-live="polite"
          >
            {success.emailConfigured ? "Check your email." : "You're on the list."}
          </p>
        </div>

        <p className="mt-4 text-body-sm leading-relaxed text-stone">
          {success.emailConfigured
            ? "Confirm your email to join the queue and get your private status page. Check your inbox for the link."
            : "We'll email you when early access opens in Seattle / King County. No noise in the meantime."}
        </p>

        <p className="mt-5 text-caption leading-relaxed text-stone">
          <a href="/waitlist/how-it-works" className="underline underline-offset-2 hover:text-ink">
            How the waitlist works
          </a>{" "}
          ·{" "}
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

      <div
        className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
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

      <Button type="submit" size="lg" loading={status === "submitting"} className="mt-5 w-full">
        {status === "submitting" ? "Joining…" : "Join the waitlist"}
      </Button>

      <p className="mt-3 text-center text-caption leading-relaxed text-stone">
        Only waitlist updates. No spam, no selling your email.{" "}
        <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
          Privacy
        </a>
        <br />
        <a href="/waitlist/how-it-works" className="underline underline-offset-2 hover:text-ink">
          How the waitlist works
        </a>
      </p>
    </form>
  );
}
