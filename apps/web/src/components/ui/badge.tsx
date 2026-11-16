import { LISTING_STATUS_LABELS, type ListingStatus, type Provenance } from "@hauscrawl/core";
import type { ReactNode } from "react";

type Tone = "verified" | "community" | "neutral" | "positive" | "quiet" | "danger";

const tones: Record<Tone, string> = {
  verified: "bg-ink text-paper",
  community: "border border-ink/25 bg-paper text-ink",
  neutral: "bg-mist text-ink",
  positive: "bg-moss-soft text-moss",
  quiet: "border border-line text-stone",
  danger: "bg-danger-soft text-danger",
};

export function Badge({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.14em] uppercase ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * The provenance label is structural: it is never omitted, and "Verified" is
 * only ever rendered from verified data (see getPropertyVerification).
 */
export function ProvenanceBadge({
  provenance,
  className = "",
}: {
  provenance: Provenance;
  className?: string;
}) {
  return (
    <Badge tone={provenance === "verified" ? "verified" : "community"} className={className}>
      {provenance === "verified" ? "Verified" : "Community"}
    </Badge>
  );
}

export function ListingStatusBadge({ status, className = "" }: { status: ListingStatus; className?: string }) {
  const tone: Tone =
    status === "for_sale"
      ? "positive"
      : status === "sold" || status === "off_market"
        ? "neutral"
        : "quiet";

  return (
    <Badge tone={tone} className={className}>
      {LISTING_STATUS_LABELS[status]}
    </Badge>
  );
}
