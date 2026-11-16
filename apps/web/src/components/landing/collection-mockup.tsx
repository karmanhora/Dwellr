"use client";

import { useState } from "react";

import { formatCount, summarizeCollectionComparison } from "@dwellr/core";

import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarIcon } from "@/components/ui/icons";

import {
  MOCKUP_HOMES,
  MOCKUP_MEMBERS,
  type MockupHome,
  type MockupIllustration,
} from "./mockup-fixtures";

const initialYourRatings = Object.fromEntries(
  MOCKUP_HOMES.map((home) => [
    home.property.id,
    home.evaluations.find((evaluation) => evaluation.userId === "you")?.rating ?? 0,
  ]),
);

function HouseIllustration({ variant }: { variant: MockupIllustration }) {
  return (
    <svg viewBox="0 0 120 80" className="h-full w-full" aria-hidden="true" focusable="false">
      <rect width="120" height="80" className="fill-mist" />

      {variant === "gable" ? <circle cx="96" cy="21" r="11" className="fill-sand" /> : null}
      {variant === "courtyard" ? (
        <rect x="11" y="24" width="23" height="28" rx="2" className="fill-sand" />
      ) : null}
      {variant === "tower" ? (
        <rect x="88" y="14" width="13" height="40" rx="2" className="fill-sand" />
      ) : null}

      <svg x="37" y="13" width="46" height="43" viewBox="0 0 120 80" className="text-ink">
        <path d="M60 10 104 45v29H73V55H47v19H16V45z" fill="currentColor" />
      </svg>

      <rect x="13" y="64" width="94" height="1.5" className="fill-line-strong" />
    </svg>
  );
}

function RatingChip({ name, rating }: { name: string; rating: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper px-2 py-0.5 text-caption leading-none text-ink">
      <StarIcon size={9} filled />
      <span className="text-stone">{name}</span>
      <span className="font-semibold">{rating}</span>
    </span>
  );
}

function MockupHomeCard({
  home,
  yourRating,
  partnerRating,
  everyoneLikes,
  disagreement,
  onRate,
}: {
  home: MockupHome;
  yourRating: number;
  partnerRating: number;
  everyoneLikes: boolean;
  disagreement: boolean;
  onRate: (rating: number) => void;
}) {
  const note = home.evaluations.find((evaluation) => evaluation.note)?.note;
  const facts = [
    home.property.bedrooms !== null ? `${formatCount(home.property.bedrooms)} bd` : null,
    home.property.bathrooms !== null ? `${formatCount(home.property.bathrooms)} ba` : null,
    home.property.squareFeet !== null ? `${formatCount(home.property.squareFeet)} sq ft` : null,
  ].filter(Boolean);

  return (
    <article className="rounded-control border border-line p-2.5">
      <div className="flex gap-2.5">
        <div className="h-14 w-16 shrink-0 overflow-hidden rounded-control">
          <HouseIllustration variant={home.illustration} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-body-sm font-medium text-ink">{home.property.neighborhood}</p>

          <p className="mt-0.5 text-caption text-stone">{facts.join(" · ")}</p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ProvenanceBadge provenance={home.property.verification} />
            <RatingChip name="Partner" rating={partnerRating} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {everyoneLikes ? (
              <Badge tone="positive">Everyone likes</Badge>
            ) : disagreement ? (
              <Badge tone="quiet">Split opinion</Badge>
            ) : null}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
            <span className="text-caption text-stone">Your rating</span>
            <span
              className="flex items-center gap-0.5"
              role="group"
              aria-label={`Your rating for ${home.property.neighborhood}`}
            >
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${home.property.neighborhood} ${star} out of 5`}
                  aria-pressed={star <= yourRating}
                  onClick={() => onRate(star)}
                  className="rounded-sm p-0.5 transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
                >
                  <StarIcon
                    size={14}
                    filled={star <= yourRating}
                    className={star <= yourRating ? "text-ink" : "text-line-strong"}
                  />
                </button>
              ))}
            </span>
          </div>

          {note && disagreement ? (
            <p className="mt-1.5 text-caption leading-snug text-stone">
              Partner: &ldquo;{note}&rdquo;
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function CollectionMockup() {
  const [yourRatings, setYourRatings] =
    useState<Record<string, number>>(initialYourRatings);

  const homes = MOCKUP_HOMES.map((home) => ({
    ...home,
    evaluations: home.evaluations.map((evaluation) =>
      evaluation.userId === "you"
        ? { ...evaluation, rating: yourRatings[home.property.id] ?? 0 }
        : evaluation,
    ),
  }));
  const comparison = summarizeCollectionComparison(
    homes,
    MOCKUP_MEMBERS.map((member) => member.id),
  );
  const hasChanged = MOCKUP_HOMES.some(
    (home) =>
      home.evaluations.find((evaluation) => evaluation.userId === "you")?.rating !==
      yourRatings[home.property.id],
  );

  function resetRatings() {
    setYourRatings({ ...initialYourRatings });
  }

  return (
    <div className="w-full max-w-80 animate-rise" style={{ animationDelay: "160ms" }}>
      <div
        role="group"
        aria-label="Interactive example collection. Tap a star to change your ratings."
        className="mx-auto min-h-phone-frame w-full rounded-sheet border border-ink/15 bg-ink p-1.5"
      >
        <div className="overflow-hidden rounded-panel bg-paper">
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-eyebrow text-stone">Shared collection</p>
                <p className="mt-1 text-lg leading-none font-medium tracking-[-0.025em] text-ink">
                  Our first home
                </p>
              </div>

              <div className="flex shrink-0 items-start gap-2">
                {MOCKUP_MEMBERS.map((member) => (
                  <div key={member.id} className="flex flex-col items-center gap-0.5">
                    <Avatar name={member.name} size="xs" />
                    <span className="text-caption text-stone">{member.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <p className="mt-3 text-caption text-stone" aria-live="polite">
              You both like{" "}
              <span className="font-semibold text-ink">
                {comparison.everyoneLikesCount} of {comparison.homes.length}
              </span>{" "}
              homes
            </p>
            <p className="mt-1 text-caption text-stone/70">Tap a star to rate the homes.</p>
          </div>

          <div className="space-y-2 border-t border-line px-3 py-3">
            {MOCKUP_HOMES.map((home) => {
              const compared = comparison.homes.find(
                (candidate) => candidate.property.id === home.property.id,
              );

              return (
                <MockupHomeCard
                  key={home.property.id}
                  home={home}
                  yourRating={yourRatings[home.property.id] ?? 0}
                  partnerRating={home.evaluations[1]?.rating ?? 0}
                  everyoneLikes={compared?.everyoneLikes ?? false}
                  disagreement={compared?.disagreement ?? false}
                  onRate={(rating) =>
                    setYourRatings((current) => ({
                      ...current,
                      [home.property.id]: rating,
                    }))
                  }
                />
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-caption font-medium text-ink">
            <span>Compare all {MOCKUP_HOMES.length} homes</span>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-caption leading-relaxed text-stone">
        Illustrative example. Early access screens may change.{" "}
        {hasChanged ? (
          <button
            type="button"
            onClick={resetRatings}
            className="underline decoration-line-strong underline-offset-2 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
          >
            Reset ratings
          </button>
        ) : null}
      </p>
    </div>
  );
}
