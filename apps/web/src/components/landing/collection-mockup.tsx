"use client";

import Image from "next/image";
import { useState } from "react";

import { summarizeCollectionComparison } from "@hauscrawl/core";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StarIcon } from "@/components/ui/icons";

import { MOCKUP_HOMES, MOCKUP_MEMBERS, type MockupHome } from "./mockup-fixtures";

const initialYourRatings = Object.fromEntries(
  MOCKUP_HOMES.map((home) => [
    home.property.id,
    home.evaluations.find((evaluation) => evaluation.userId === "you")?.rating ?? 0,
  ]),
);
const memberIds = MOCKUP_MEMBERS.map((member) => member.id);

function RatingStars({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange?: (rating: number) => void;
}) {
  return (
    <span
      className="flex items-center gap-0.5"
      role={onChange ? "group" : "img"}
      aria-label={`${label}: ${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((star) =>
        onChange ? (
          <button
            key={star}
            type="button"
            aria-label={`${label} ${star} out of 5`}
            aria-pressed={star <= value}
            onClick={() => onChange(star)}
            className="rounded-sm p-0.5 transition hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
          >
            <StarIcon
              size={15}
              filled={star <= value}
              className={star <= value ? "text-brass" : "text-line-strong"}
            />
          </button>
        ) : (
          <StarIcon
            key={star}
            size={14}
            filled={star <= value}
            className={star <= value ? "text-brass" : "text-line-strong"}
          />
        ),
      )}
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

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.35rem] border border-line/80 bg-paper">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={home.photo}
          alt={home.photoAlt}
          fill
          sizes="(min-width: 640px) 24rem, 90vw"
          className="object-cover"
        />
        <span className="absolute top-3 left-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
          {home.property.neighborhood}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-serif text-[1.45rem] leading-tight tracking-[-0.03em] text-ink">
          {home.property.title}
        </h3>
        <p className="mt-1 text-caption text-stone">Community-added</p>

        <div className="mt-3 flex min-h-6 flex-wrap items-center gap-1.5">
          {everyoneLikes ? (
            <Badge tone="positive">Everyone likes</Badge>
          ) : disagreement ? (
            <Badge tone="quiet">Split opinion</Badge>
          ) : (
            <Badge tone="neutral">Still deciding</Badge>
          )}
        </div>

        <div className="mt-4 space-y-2.5 border-t border-line pt-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-caption text-stone">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-moss text-[9px] font-semibold text-cream">
                Y
              </span>
              You
            </span>
            <RatingStars
              label={`Your rating for ${home.property.title}`}
              value={yourRating}
              onChange={onRate}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-caption text-stone">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brass text-[9px] font-semibold text-ink">
                P
              </span>
              Partner
            </span>
            <RatingStars
              label={`Partner rating for ${home.property.title}`}
              value={partnerRating}
            />
          </div>
        </div>

        {note ? (
          <p className="mt-4 border-t border-line pt-3 font-serif text-sm leading-relaxed text-ink/75 italic">
            “{note}”
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function CollectionMockup() {
  const [yourRatings, setYourRatings] = useState<Record<string, number>>(initialYourRatings);

  const homes = MOCKUP_HOMES.map((home) => ({
    ...home,
    evaluations: home.evaluations.map((evaluation) =>
      evaluation.userId === "you"
        ? { ...evaluation, rating: yourRatings[home.property.id] ?? 0 }
        : evaluation,
    ),
  }));
  const comparison = summarizeCollectionComparison(homes, memberIds);
  const hasChanged = MOCKUP_HOMES.some(
    (home) =>
      home.evaluations.find((evaluation) => evaluation.userId === "you")?.rating !==
      yourRatings[home.property.id],
  );

  function resetRatings() {
    setYourRatings({ ...initialYourRatings });
  }

  return (
    <div className="w-full max-w-[54rem] animate-rise" style={{ animationDelay: "160ms" }}>
      <div
        role="group"
        aria-label="Example shortlist showing two partners' ratings for two homes"
        className="rounded-[1.9rem] border border-line/80 bg-cream p-4 shadow-lift sm:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-stone uppercase">
              Example shortlist
            </p>
            <p className="mt-2 font-serif text-2xl leading-tight tracking-[-0.03em] text-ink sm:text-[1.75rem]">
              Two homes, two perspectives.
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-caption text-stone" aria-live="polite">
            You both like{" "}
            <span className="font-semibold text-ink">
              {comparison.everyoneLikesCount} of {comparison.homes.length}
            </span>{" "}
            homes
          </p>

          <div className="flex items-center gap-3">
            {MOCKUP_MEMBERS.map((member) => (
              <div key={member.id} className="flex items-center gap-1.5">
                <Avatar name={member.name} size="xs" />
                <span className="text-caption text-stone">{member.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {MOCKUP_HOMES.map((home) => {
            const compared = comparison.homes.find(
              (candidate) => candidate.property.id === home.property.id,
            );
            const partnerRating =
              home.evaluations.find((evaluation) => evaluation.userId === "partner")?.rating ?? 0;

            return (
              <MockupHomeCard
                key={home.property.id}
                home={home}
                yourRating={yourRatings[home.property.id] ?? 0}
                partnerRating={partnerRating}
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

        <p className="mt-4 text-caption leading-relaxed text-stone">
          Tap a star to rate the homes. Early access screens may change.
          {hasChanged ? (
            <>
              {" "}
              <button
                type="button"
                onClick={resetRatings}
                className="underline decoration-line-strong underline-offset-2 transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
              >
                Reset ratings
              </button>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
