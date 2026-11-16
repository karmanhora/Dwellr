import { formatCount } from "@dwellr/core";

import { Badge, ProvenanceBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StarIcon } from "@/components/ui/icons";

import {
  MOCKUP_COMPARISON,
  MOCKUP_HOMES,
  MOCKUP_MEMBERS,
  type MockupHome,
  type MockupIllustration,
} from "./mockup-fixtures";

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

function MockupHomeCard({ home }: { home: MockupHome }) {
  const comparison = MOCKUP_COMPARISON.homes.find(
    (candidate) => candidate.property.id === home.property.id,
  );
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
            <RatingChip name="You" rating={home.evaluations[0]?.rating ?? 0} />
            <RatingChip name="Partner" rating={home.evaluations[1]?.rating ?? 0} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {comparison?.everyoneLikes ? (
              <Badge tone="positive">Everyone likes</Badge>
            ) : comparison?.disagreement ? (
              <Badge tone="quiet">Split opinion</Badge>
            ) : null}
          </div>

          {note && comparison?.disagreement ? (
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
  return (
    <div className="w-full max-w-80 animate-rise" style={{ animationDelay: "160ms" }}>
      <div
        role="img"
        aria-label="Example collection showing two partners' ratings for three homes"
        className="mx-auto h-phone-frame w-full rounded-sheet border border-ink/15 bg-ink p-1.5"
      >
        <div className="overflow-hidden rounded-panel bg-paper" aria-hidden="true">
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

            <p className="mt-3 text-caption text-stone">
              You both like{" "}
              <span className="font-semibold text-ink">
                {MOCKUP_COMPARISON.everyoneLikesCount} of {MOCKUP_COMPARISON.homes.length}
              </span>{" "}
              homes
            </p>
          </div>

          <div className="space-y-2 border-t border-line px-3 py-3">
            {MOCKUP_HOMES.map((home) => (
              <MockupHomeCard key={home.property.id} home={home} />
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-caption font-medium text-ink">
            <span>Compare all {MOCKUP_HOMES.length} homes</span>
            <span aria-hidden="true">→</span>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-caption leading-relaxed text-stone">
        Illustrative example. Early access screens may change.
      </p>
    </div>
  );
}
