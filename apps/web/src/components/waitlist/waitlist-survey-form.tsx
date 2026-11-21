"use client";

import {
  WAITLIST_ROLE_LABELS,
  WAITLIST_ROLES,
  WAITLIST_SEARCHING_WITH,
  WAITLIST_SEARCHING_WITH_LABELS,
  WAITLIST_SURVEY_CONTACT_METHODS,
  WAITLIST_SURVEY_CONTACT_METHOD_LABELS,
  WAITLIST_SURVEY_CREATOR_FOCUS,
  WAITLIST_SURVEY_CREATOR_FOCUS_LABELS,
  WAITLIST_SURVEY_INTERESTS,
  WAITLIST_SURVEY_INTEREST_LABELS,
  WAITLIST_SURVEY_TIMELINES,
  WAITLIST_SURVEY_TIMELINE_LABELS,
  WAITLIST_SURVEY_USE_CASES,
  WAITLIST_SURVEY_USE_CASE_LABELS,
  waitlistSurveyBranch,
} from "@hauscrawl/core";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CheckIcon } from "@/components/ui/icons";
import { SelectField } from "@/components/ui/select";
import { TextareaField } from "@/components/ui/textarea";
import { trackWaitlistEvent } from "@/lib/waitlist-analytics";

type SurveyMode = "stage" | "verify";

type Answers = {
  role: string;
  searchingWith: string;
  region: string;
  timeline: string;
  useCase: string;
  displayName: string;
  brokerage: string;
  workRegion: string;
  contactMethod: string;
  phone: string;
  promoInterest: string;
  creatorFocus: string;
  creatorChannel: string;
  notes: string;
};

const EMPTY_ANSWERS: Answers = {
  role: "",
  searchingWith: "",
  region: "",
  timeline: "",
  useCase: "",
  displayName: "",
  brokerage: "",
  workRegion: "",
  contactMethod: "",
  phone: "",
  promoInterest: "",
  creatorFocus: "",
  creatorChannel: "",
  notes: "",
};

/** One question group per section, on the landing design system. */
export function WaitlistSurveyForm({
  surveyRef,
  mode,
}: {
  surveyRef: string;
  mode: SurveyMode;
}) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [status, setStatus] = useState<"idle" | "submitting" | "saved" | "skipped">("idle");
  const [error, setError] = useState<string | null>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackWaitlistEvent("waitlist_survey_view", { mode });
  }, [mode]);

  function update<Key extends keyof Answers>(key: Key, value: Answers[Key]) {
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  // The role is the routing question, so a change starts the branch over
  // instead of carrying answers from a branch the person is not on.
  function chooseRole(role: string) {
    setAnswers({ ...EMPTY_ANSWERS, role });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    if (!answers.role) {
      setError("Pick the option that describes you best to continue.");
      return;
    }

    setError(null);
    setStatus("submitting");
    trackWaitlistEvent("waitlist_survey_submit", { mode });

    try {
      const response = await fetch("/api/waitlist/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ref: surveyRef,
          // Empty controls are dropped and whitelisted by the route, so the
          // full answer set can go as-is.
          answers,
          website: honeypotRef.current?.value ?? "",
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
      } | null;

      if (!response.ok) {
        setError(
          response.status === 429
            ? "Too many submissions from this connection. Try again in a little while."
            : (payload?.message ?? "We couldn't save your answers just now. Try again."),
        );
        setStatus("idle");
        return;
      }

      setStatus("saved");
    } catch {
      setError("We couldn't save your answers. Check your connection and try again.");
      setStatus("idle");
    }
  }

  if (status === "saved" || status === "skipped") {
    const skipped = status === "skipped";
    return (
      <div className="mt-8 rounded-[1.75rem] border border-line bg-cream p-6 shadow-soft sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-moss-soft text-moss">
            <CheckIcon size={18} />
          </span>
          <h2
            className="font-serif text-2xl leading-tight font-medium tracking-[-0.03em] text-ink"
            role="status"
            aria-live="polite"
          >
            {skipped ? "That's alright." : "Thank you — that helps."}
          </h2>
        </div>

        <p className="mt-4 text-body-sm leading-relaxed text-stone">
          {skipped
            ? "Your email is saved, and that is what matters. You can answer these later from your private status page."
            : mode === "verify"
              ? "Your answers are updated. You can change them again from your status link whenever your search moves."
              : "We'll use these answers to shape early access. Confirm your email from the message we sent to join the queue, and you can update your answers from your status page."}
        </p>

        <p className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-caption leading-relaxed text-stone">
          <a href="/waitlist/how-it-works" className="underline underline-offset-2 hover:text-ink">
            How the waitlist works
          </a>
          <a href="/privacy" className="underline underline-offset-2 hover:text-ink">
            Privacy
          </a>
          <Link href="/" className="underline underline-offset-2 hover:text-ink">
            Back to HausCrawl
          </Link>
        </p>
      </div>
    );
  }

  const branch = answers.role
    ? waitlistSurveyBranch(answers.role as (typeof WAITLIST_ROLES)[number])
    : null;
  const submitting = status === "submitting";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
      <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
        <fieldset>
          <legend className="text-body-sm font-medium text-ink">
            What best describes you?
          </legend>
          <p className="mt-1 text-caption text-stone">This picks the next few questions.</p>

          <div className="mt-4 grid gap-2">
            {WAITLIST_ROLES.map((role) => {
              const selected = answers.role === role;
              return (
                <label
                  key={role}
                  className={`flex cursor-pointer items-center gap-3 rounded-[1.1rem] border px-4 py-3 text-body-sm transition ${
                    selected
                      ? "border-moss bg-moss-soft text-ink"
                      : "border-line bg-paper text-stone hover:border-line-strong hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="survey-role"
                    value={role}
                    checked={selected}
                    onChange={() => chooseRole(role)}
                    className="h-4 w-4 accent-moss"
                  />
                  {WAITLIST_ROLE_LABELS[role]}
                </label>
              );
            })}
          </div>
        </fieldset>
      </section>

      {branch === "hunter" ? (
        <>
          <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
            <h2 className="text-body-sm font-medium text-ink">Your search</h2>
            <div className="mt-4 grid gap-4">
              <SelectField
                label="Who are you searching with?"
                name="survey-searching-with"
                value={answers.searchingWith}
                onChange={(event) => update("searchingWith", event.target.value)}
                hint="Optional"
              >
                <option value="">Prefer not to say</option>
                {WAITLIST_SEARCHING_WITH.map((value) => (
                  <option key={value} value={value}>
                    {WAITLIST_SEARCHING_WITH_LABELS[value]}
                  </option>
                ))}
              </SelectField>

              <SelectField
                label="What's your timeline?"
                name="survey-timeline"
                value={answers.timeline}
                onChange={(event) => update("timeline", event.target.value)}
                hint="Optional"
              >
                <option value="">Prefer not to say</option>
                {WAITLIST_SURVEY_TIMELINES.map((value) => (
                  <option key={value} value={value}>
                    {WAITLIST_SURVEY_TIMELINE_LABELS[value]}
                  </option>
                ))}
              </SelectField>

              <Field
                label="City or region"
                name="survey-region"
                placeholder="Seattle, Bellevue, King County…"
                value={answers.region}
                onChange={(event) => update("region", event.target.value)}
                maxLength={80}
                hint="Optional · keep it general"
              />
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
            <h2 className="text-body-sm font-medium text-ink">How you&apos;d use HausCrawl</h2>
            <div className="mt-4">
              <SelectField
                label="What would you use it for?"
                name="survey-use-case"
                value={answers.useCase}
                onChange={(event) => update("useCase", event.target.value)}
                hint="Optional"
              >
                <option value="">Prefer not to say</option>
                {WAITLIST_SURVEY_USE_CASES.map((value) => (
                  <option key={value} value={value}>
                    {WAITLIST_SURVEY_USE_CASE_LABELS[value]}
                  </option>
                ))}
              </SelectField>
            </div>
          </section>
        </>
      ) : null}

      {branch === "agent" ? (
        <>
          <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
            <h2 className="text-body-sm font-medium text-ink">Your business</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label="Name"
                name="survey-name"
                autoComplete="name"
                value={answers.displayName}
                onChange={(event) => update("displayName", event.target.value)}
                maxLength={80}
                hint="Optional"
              />
              <Field
                label="Brokerage"
                name="survey-brokerage"
                autoComplete="organization"
                value={answers.brokerage}
                onChange={(event) => update("brokerage", event.target.value)}
                maxLength={120}
                hint="Optional"
              />
              <Field
                label="City or region you work"
                name="survey-work-region"
                placeholder="Seattle / King County"
                value={answers.workRegion}
                onChange={(event) => update("workRegion", event.target.value)}
                maxLength={80}
                className="sm:col-span-2"
                hint="Optional · keep it general"
              />
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
            <h2 className="text-body-sm font-medium text-ink">Reaching you</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <SelectField
                label="Best way to reach you"
                name="survey-contact-method"
                value={answers.contactMethod}
                onChange={(event) => update("contactMethod", event.target.value)}
                hint="Optional"
              >
                <option value="">Prefer not to say</option>
                {WAITLIST_SURVEY_CONTACT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {WAITLIST_SURVEY_CONTACT_METHOD_LABELS[value]}
                  </option>
                ))}
              </SelectField>

              <Field
                label="Phone"
                name="survey-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="(206) 555-0100"
                value={answers.phone}
                onChange={(event) => update("phone", event.target.value)}
                maxLength={32}
                hint="Optional"
              />

              <SelectField
                label="Open to talking about promoting one of your listing reels?"
                name="survey-promo-interest"
                value={answers.promoInterest}
                onChange={(event) => update("promoInterest", event.target.value)}
                className="sm:col-span-2"
                hint="Optional"
              >
                <option value="">Prefer not to say</option>
                {WAITLIST_SURVEY_INTERESTS.map((value) => (
                  <option key={value} value={value}>
                    {WAITLIST_SURVEY_INTEREST_LABELS[value]}
                  </option>
                ))}
              </SelectField>
            </div>
          </section>
        </>
      ) : null}

      {branch === "creator" ? (
        <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
          <h2 className="text-body-sm font-medium text-ink">Your work</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field
              label="Name"
              name="survey-creator-name"
              autoComplete="name"
              value={answers.displayName}
              onChange={(event) => update("displayName", event.target.value)}
              maxLength={80}
              hint="Optional"
            />

            <SelectField
              label="What do you create?"
              name="survey-creator-focus"
              value={answers.creatorFocus}
              onChange={(event) => update("creatorFocus", event.target.value)}
              hint="Optional"
            >
              <option value="">Prefer not to say</option>
              {WAITLIST_SURVEY_CREATOR_FOCUS.map((value) => (
                <option key={value} value={value}>
                  {WAITLIST_SURVEY_CREATOR_FOCUS_LABELS[value]}
                </option>
              ))}
            </SelectField>

            <Field
              label="Where can we see your work?"
              name="survey-creator-channel"
              placeholder="@yourhandle, TikTok, YouTube…"
              value={answers.creatorChannel}
              onChange={(event) => update("creatorChannel", event.target.value)}
              maxLength={200}
              className="sm:col-span-2"
              hint="Optional"
            />

            <SelectField
              label="Interested in a creator partnership?"
              name="survey-promo-interest"
              value={answers.promoInterest}
              onChange={(event) => update("promoInterest", event.target.value)}
              className="sm:col-span-2"
              hint="Optional"
            >
              <option value="">Prefer not to say</option>
              {WAITLIST_SURVEY_INTERESTS.map((value) => (
                <option key={value} value={value}>
                  {WAITLIST_SURVEY_INTEREST_LABELS[value]}
                </option>
              ))}
            </SelectField>
          </div>
        </section>
      ) : null}

      {branch ? (
        <section className="rounded-[1.75rem] border border-line bg-cream p-5 shadow-soft sm:p-7">
          <TextareaField
            label="Anything else?"
            name="survey-notes"
            value={answers.notes}
            onChange={(event) => update("notes", event.target.value)}
            maxLength={500}
            rows={3}
            hint="Optional"
          />
        </section>
      ) : null}

      <div className="rounded-[1.75rem] border border-line bg-paper p-5 sm:p-6">
        {error ? (
          <p role="alert" className="mb-3 text-caption text-danger">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          size="lg"
          variant="moss"
          loading={submitting}
          disabled={!answers.role}
          className="w-full"
        >
          {submitting
            ? "Saving…"
            : mode === "verify"
              ? "Update my answers"
              : "Save my answers"}
        </Button>

        <button
          type="button"
          onClick={() => {
            trackWaitlistEvent("waitlist_survey_skip", { mode });
            setStatus("skipped");
          }}
          className="mt-3 w-full rounded-full py-2 text-body-sm text-stone underline underline-offset-2 transition hover:text-ink"
        >
          Skip for now
        </button>

        <p className="mt-2 text-center text-caption leading-relaxed text-stone">
          Your email is already saved. Everything here is optional, and you can change it later.
        </p>
      </div>

      <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="survey-website">Company website</label>
        <input
          ref={honeypotRef}
          id="survey-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
    </form>
  );
}
