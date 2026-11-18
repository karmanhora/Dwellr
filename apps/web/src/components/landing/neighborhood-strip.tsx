const neighborhoods = [
  "Ballard",
  "Fremont",
  "Capitol Hill",
  "West Seattle",
  "Queen Anne",
  "Beacon Hill",
  "Columbia City",
  "Green Lake",
  "Madrona",
  "Wallingford",
];

function NeighborhoodRow({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <div
      className="flex shrink-0 items-center"
      role={duplicate ? undefined : "list"}
      aria-label={duplicate ? undefined : "Seattle neighborhoods"}
      aria-hidden={duplicate || undefined}
    >
      {neighborhoods.map((neighborhood) => (
        <span key={neighborhood} role="listitem" className="flex items-center">
          <span className="px-5 text-[10px] font-medium tracking-[0.18em] text-cream/60 uppercase">
            {neighborhood}
          </span>
          <span aria-hidden="true" className="h-1 w-1 rounded-full bg-brass" />
        </span>
      ))}
    </div>
  );
}

export function NeighborhoodStrip() {
  return (
    <div className="overflow-hidden border-y border-ink bg-ink py-3.5">
      <div className="landing-marquee flex w-max items-center">
        <NeighborhoodRow />
        <NeighborhoodRow duplicate />
      </div>
    </div>
  );
}
