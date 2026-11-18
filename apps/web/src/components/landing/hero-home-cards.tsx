import Image from "next/image";

import { StarIcon } from "@/components/ui/icons";

import { MOCKUP_HOMES, type MockupHome } from "./mockup-fixtures";

function RatingRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-caption text-stone">
        <span
          className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-semibold ${
            label === "You" ? "bg-moss text-cream" : "bg-brass text-ink"
          }`}
        >
          {label.slice(0, 1)}
        </span>
        {label}
      </span>
      <span
        className="flex items-center gap-0.5"
        role="img"
        aria-label={`${label}: ${value} out of 5`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <StarIcon
            key={star}
            size={15}
            filled={star <= value}
            className={star <= value ? "text-brass" : "text-line-strong"}
          />
        ))}
      </span>
    </div>
  );
}

function HomeCard({
  home,
  tag,
  tone,
  yourRating,
  partnerRating,
  note,
  className = "",
  priority = false,
}: {
  home: MockupHome;
  tag: string;
  tone: "moss" | "paper";
  yourRating: number;
  partnerRating: number;
  note: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <article
      className={`overflow-hidden rounded-[1.6rem] border border-line/80 bg-cream p-2.5 shadow-lift ${className}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.15rem]">
        <Image
          src={home.photo}
          alt={home.photoAlt}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 24rem, 90vw"
          className="object-cover"
        />
        <span className="absolute top-3 left-3 rounded-full bg-cream/95 px-3 py-1 text-[10px] font-semibold tracking-[0.14em] text-ink uppercase">
          {home.property.neighborhood}
        </span>
        <span
          className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase ${
            tone === "moss" ? "bg-moss text-cream" : "bg-cream/95 text-ink"
          }`}
        >
          {tag}
        </span>
      </div>

      <div className="px-2.5 pt-3 pb-1.5">
        <h3 className="font-serif text-[1.7rem] leading-none tracking-[-0.04em] text-ink">
          {home.property.title}
        </h3>
        <p className="mt-2 text-caption text-stone">Community-added</p>

        <div className="mt-4 space-y-2 border-t border-line pt-3">
          <RatingRow label="You" value={yourRating} />
          <RatingRow label="Partner" value={partnerRating} />
        </div>

        <p className="mt-3 border-t border-line pt-3 font-serif text-sm leading-relaxed text-ink/75 italic">
          “{note}”
        </p>
      </div>
    </article>
  );
}

export function HeroHomeCards() {
  const topHome = MOCKUP_HOMES[0];
  const bottomHome = MOCKUP_HOMES[1];

  if (!topHome || !bottomHome) return null;

  const topNote =
    topHome.evaluations.find((evaluation) => evaluation.note)?.note ??
    "The light was lovely.";
  const bottomNote =
    bottomHome.evaluations.find((evaluation) => evaluation.note)?.note ??
    "Loved the garden. The street felt busy.";

  return (
    <div className="relative flex w-full max-w-[34rem] flex-col gap-5 lg:block lg:h-[40rem]">
      <HomeCard
        home={topHome}
        tag="Everyone likes"
        tone="moss"
        yourRating={5}
        partnerRating={5}
        note={topNote}
        priority
        className="relative z-20 lg:absolute lg:top-0 lg:right-0 lg:w-[65%] lg:rotate-[1.5deg]"
      />
      <HomeCard
        home={bottomHome}
        tag="Split opinion"
        tone="paper"
        yourRating={4}
        partnerRating={2}
        note={bottomNote}
        className="relative z-10 lg:absolute lg:top-[10rem] lg:left-0 lg:w-[62%] lg:-rotate-[1.5deg]"
      />
    </div>
  );
}
