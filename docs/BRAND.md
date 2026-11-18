# HausCrawl — Brand

## Name

Always write **HausCrawl** with a capital H and C, in the wordmark, in running
text, and in the browser title. Never "hauscrawl" mid-sentence and never
"HausCrawl, Inc." in product copy. The legal entity name can differ.

Tagline (product-facing): **Find a home. Together.**

## Logo

The supplied logo is the dark house mark and HausCrawl wordmark on a white
field. The trimmed lockup is the canonical artwork. On the warm waitlist
surfaces, a transparent variant removes only the white background path so the
mark and wordmark sit directly on mist and cream; the artwork itself is not
redrawn. The social image uses the supplied artwork, and the app icons use a
square white-background crop of the same house mark.

### Files

| File | Use |
| --- | --- |
| `apps/web/public/brand/hauscrawl-logo.svg` | Supplied white-background artwork, stored verbatim. |
| `apps/web/public/brand/hauscrawl-lockup.svg` | The supplied artwork trimmed to its content; default lockup. |
| `apps/web/public/brand/hauscrawl-lockup-transparent.svg` | The same lockup with the white background path removed, for mist and cream waitlist surfaces. |
| `apps/web/public/brand/hauscrawl-mark.png` | Square house-mark crop for decorative surfaces and icons. |
| `apps/web/src/app/icon.png` | 512 px app icon (Next.js metadata). |
| `apps/web/src/app/apple-icon.png` | 180 px app icon (iOS masks it). |
| `apps/web/src/app/favicon.ico` | 48 px favicon. |

The in-app logo (`src/components/brand/logo.tsx`) points at the trimmed lockup
by default and the transparent variant where the background is not white;
`HouseMark` uses the cropped PNG on quieter surfaces.

### Provenance

The supplied `HausCrawl Minimal House Logo 2.svg` is stored verbatim at
`apps/web/public/brand/hauscrawl-logo.svg`. The transparent waitlist lockup is
derived mechanically from the trimmed lockup by removing its first, white
background path; the house mark and wordmark are unchanged. The square mark and
app icons are crops of the supplied artwork.

### Usage rules

- **Clear space:** at least half the house-mark height on every side.
- **Minimum sizes:** mark 16 px; full lockup 90 px wide.
- **Colour:** use the supplied ink artwork as provided. The transparent variant
  removes only the white background field. Do not recolour, invert, stretch,
  rotate, add effects, or separate the wordmark from the house mark.
- **Do:** prefer the full lockup in headers and the cropped mark where space is
  tight or a square icon is required.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#1F2422` | Primary text, logo, primary buttons, dark sections |
| `paper` | `#FFFFFF` | Product page background, text on ink |
| `cream` | `#FBFAF7` | Warm waitlist cards and quiet raised surfaces |
| `mist` | `#F5F4EF` | Waitlist page background, avatars, informational panels |
| `sand` | `#ECE8DF` | Warm editorial section background |
| `line` | `#E5E2DA` | Hairline dividers and input borders only |
| `stone` | `#6E736D` | Secondary text, captions, metadata |
| `moss` | `#2F4F43` | Primary waitlist CTA, privacy surfaces, the italic “together.” |
| `brass` | `#B8862F` | Ratings, step numbers and small editorial accents |

Ink on paper is roughly 15:1, stone on paper roughly 4.9:1. Body copy uses ink;
stone is for secondary text at 14 px and above.

Rules: warm neutral surfaces, near-black ink for most type, moss for decisive
moments and brass for small marks; hairlines instead of heavy boxes, and no
decorative gradients. Glassmorphism, coloured shadows and multi-colour accents
are out.

## Typeface

**Fraunces** (SIL Open Font License) for editorial headlines and **Outfit**
(SIL Open Font License) for UI and body, both loaded with `next/font/google`.
Fraunces is a warm variable serif with optical-size detail; Outfit remains the
geometric sans close to the wordmark's construction.

- Display: Fraunces, 400 weight, tracking `-0.045em` to `-0.055em`, tight
  leading (`0.92` on the hero, `1.02` on section headings).
- Body: Outfit, 400 weight, 15–18 px, leading `1.6`.
- UI labels: Outfit, 500 weight, 14 px. Eyebrows: Outfit, 11 px, uppercase,
  tracking `0.2em`–`0.22em`.

Fallback stacks: serif `ui-serif, Georgia, Cambria, "Times New Roman", serif`;
sans `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.

## Design tokens

Declared once in `apps/web/src/app/globals.css` under Tailwind v4's `@theme`.
Product components use the generated utilities (`bg-mist`, `rounded-card`,
`text-body-sm`). The editorial waitlist uses responsive arbitrary display sizes
where the standard scale would fight the composition; colours and surfaces
still come from the tokens above, not raw hex values in app code.

### Colour

| Token | Utility | Value | Contrast on paper | Use |
| --- | --- | --- | --- | --- |
| `ink` | `text-ink` / `bg-ink` | `#1F2422` | 15.2:1 | Primary text, buttons, dark panels |
| `ink-soft` | `bg-ink-soft` | `#333936` | 12.1:1 | Hover state for ink surfaces |
| `paper` | `bg-paper` | `#FFFFFF` | — | Product page and card background |
| `cream` | `bg-cream` | `#FBFAF7` | — | Warm waitlist cards and raised surfaces |
| `mist` | `bg-mist` | `#F5F4EF` | — | Waitlist background, quiet surfaces, skeleton base |
| `sand` | `bg-sand` | `#ECE8DF` | — | Warmer neutral, used sparingly |
| `line` | `border-line` | `#E5E2DA` | — | Hairline dividers and input borders |
| `line-strong` | `border-line-strong` | `#D3CFC4` | — | Secondary button border, dashed empty states |
| `stone` | `text-stone` | `#6E736D` | 4.9:1 | Secondary text, metadata |
| `stone-soft` | `text-stone-soft` | `#737871` | 4.5:1 | Placeholders and micro-labels only |
| `moss` | `text-moss` | `#2F4F43` | 9.1:1 | Primary waitlist CTA, privacy surfaces, italic hero word |
| `brass` | `text-brass` | `#B8862F` | — | Ratings, step numbers and small editorial accents |
| `moss-soft` | `bg-moss-soft` | `#EAF0EA` | — | Verified badge and success surface |
| `danger` | `text-danger` | `#A4291F` | 6.4:1 | Errors, destructive actions |
| `danger-soft` | `bg-danger-soft` | `#FDF1F0` | — | Error surface |

Ink on paper is 15.2:1, stone on paper 4.9:1, stone-soft 4.5:1 — every text
colour clears WCAG AA at its intended size. On warm waitlist surfaces use ink
for body copy and reserve moss/brass for decisive or small editorial marks, not
for long text.

### Type scale

| Token | Utility | Size / line-height | Use |
| --- | --- | --- | --- |
| `hero` | `text-hero` | 68 / 0.98 | Landing hero on large screens |
| `display` | `text-display` | 44 / 1.02 | Page titles, property price |
| `headline` | `text-headline` | 32 / 1.1 | Section and screen titles |
| `title` | `text-title` | 24 / 1.2 | Card-group and panel titles |
| `lead` | `text-lead` | 17 / 1.6 | Card price, intro copy |
| `body` | `text-body` | 15 / 1.6 | Default body text |
| `body-sm` | `text-body-sm` | 14 / 1.45 | UI labels, secondary copy |
| `caption` | `text-caption` | 12 / 1.1 | Metadata, helper text |
| `eyebrow` | `text-eyebrow` | 11 / 0.22em tracking, uppercase | Section kickers |

Display sizes use 500 weight with `-0.03em` to `-0.045em` tracking. Body copy
is 400. Labels are 500.

### Shape, spacing, motion

| Token | Value | Utility |
| --- | --- | --- |
| `radius-control` | 0.75rem | `rounded-control` — inputs, small controls |
| `radius-card` | 1.25rem | `rounded-card` — property cards, menus |
| `radius-panel` | 1.75rem | `rounded-panel` — galleries, panels |
| `radius-sheet` | 2rem | `rounded-sheet` — modals |
| `shadow-soft` | 1 px + 32 px ambient | `shadow-soft` — menus, floating controls |
| `shadow-lift` | 6 px + 48 px ambient | `shadow-lift` — modals, account menu |
| `spacing-gutter` | 1.25rem | `p-gutter` etc. |
| `spacing-section` | 5rem | `py-section` etc. |
| `ease-soft` | `cubic-bezier(0.22, 1, 0.36, 1)` | `--ease-soft` in custom animations |
| `duration-fast` / `base` / `slow` | 150 / 240 / 700 ms | Hover / fade / entrance |

Entrance motion is a single 700 ms fade-and-rise (`.animate-rise`); hover
motion is limited to colour, a 1.03 image scale and 0.5 px arrow drift. Every
animation and transition collapses to ~0 ms under `prefers-reduced-motion`.

## Layout

- Max content width 72rem (`Container` default), 88rem for the explore grid,
  48rem for forms and reading views.
- Gutters: 20 px mobile, 32 px from `sm`.
- Grid: 1 column mobile, 2 at `sm`, 3 at `lg`, with 24 px column and 40 px row
  gaps. Cards use a fixed 4:3 photo frame so images never cause layout shift.
- Section padding 40–56 px on mobile, 56–80 px on desktop.

## Components

`apps/web/src/components/ui` is the whole component layer — there is no
third-party component library.

| Component | Notes |
| --- | --- |
| `Container` | Page gutter and max-width; `narrow` for forms, `wide` for grids |
| `Button`, `ButtonLink` | `primary`, `secondary`, `ghost`, `danger`; `sm`, `md`, `lg`; loading state announced with `aria-busy` |
| `Input`, `Textarea`, `Select` | Ink focus ring, `aria-invalid`, danger border on error |
| `Field`, `TextareaField`, `SelectField` | Label + hint + error, `aria-describedby` wired automatically |
| `Avatar` | Initials fallback; only renders an image when a real URL exists |
| `Badge`, `ProvenanceBadge`, `ListingStatusBadge` | Uppercase 10 px labels; provenance is never omitted |
| `Modal` | Native `<dialog>`: focus trap, Escape and backdrop close come from the platform |
| `Toast`, `useToast` | `aria-live="polite"` region, auto-dismiss after 5 s |
| `Skeleton`, `PropertyCardSkeleton` | Matches real card geometry to avoid jumps |
| `EmptyState`, `ErrorState` | One calm message plus one action; error uses `role="alert"` |
| `Tabs` | WAI-ARIA tabs with arrow-key navigation and roving tabindex |
| `icons` | Inline monoline SVG set, `currentColor`, 1.6 px stroke |

Accessibility contract: every interactive element has a visible
`:focus-visible` outline (2 px ink, 3 px offset); colour is never the only
signal; icon-only controls carry an `sr-only` label; motion respects the OS
preference.

## Voice

Calm, direct, specific. Short sentences. No hype ("dream home", "once in a
lifetime"), no fake urgency, no exclamation marks. Say what HausCrawl does and
what it does not know.

## Landing collection mockup

The waitlist contains an editorial hero with two overlapping home cards and a
wider interactive shortlist, both in `apps/web/src/components/landing/`. Their
fictional homes live in `mockup-fixtures.ts`; the shortlist summary is computed
with the real collection comparison logic, never queried from the database, and
updates as the visitor changes their ratings.

- The components show only features that exist: per-member ratings, notes, the
  collection comparison labels (`Everyone likes`, `Split opinion`, `Still
  deciding`), and provenance labels.
- The cards are composition-only: no addresses, prices, bedroom counts, launch
  dates, testimonials or invented statistics are attached.
- Photos are licensed demo interior/exterior photography, not AI-generated and
  not claims about a real property. See `docs/IMAGE_CREDITS.md`.
- The hero cards are a static composition. The shortlist is exposed as a group
  with a concise label; its rating stars are real buttons with per-home labels
  and visible focus states. The reset control is real, visible text beneath it.
- Keep the single entrance animation and its reduced-motion fallback; the
  neighborhood strip pauses under `prefers-reduced-motion`.

## Imagery

Photography-first, but **only licensed or user-submitted photography**.
Never present stock imagery as a real listing, never use AI-generated property
photos, and never attach fabricated addresses. The waitlist uses licensed
Unsplash photos as demo imagery, without listing claims. Product surfaces keep
the stronger rule: a real property photo needs a real source and provenance
label.

## Provenance labels

Two label styles, used on every property detail:

- **Verified** — `bg-ink text-paper`, uppercase, tracked.
- **Community** — white with a hairline ink border.

They are informational, not decorative. A field always carries one of them.
On cards the badge sits beside the price; on a property page each fact row
repeats the label in micro-caps so provenance is readable without colour.
