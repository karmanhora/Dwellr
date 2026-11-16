# dwellr — Brand

## Name

Always lowercase: **dwellr**, in the wordmark, in running text, and in the
browser title. Never "Dwellr" mid-sentence and never "Dwellr, Inc." in
product copy. The legal entity name can differ.

Tagline (product-facing): **Find a home. Together.**

## Logo

Two elements, one supplied lockup:

1. **House mark** — a thick, continuous house outline with a notched inner form.
   Geometric, no gradient, no effects.
2. **Wordmark** — "dwellr" in the supplied custom lowercase geometric vector,
   optically spaced tight.

### Files

| File | Use |
| --- | --- |
| `apps/web/public/brand/dwellr-mark.svg` | Mark only. Header, avatar-free surfaces, favicons, app icons. |
| `apps/web/public/brand/dwellr-wordmark.svg` | Wordmark only, for places with an existing mark. |
| `apps/web/public/brand/dwellr-lockup.svg` | Mark + wordmark, horizontal. Default when space allows. |
| `apps/web/public/brand/dwellr-mark-1024.png` | Transparent raster mark, 1024 px. |
| `apps/web/public/brand/dwellr-mark-512.png` | Transparent raster mark, 512 px. |
| `apps/web/src/app/icon.png` | 512 px app icon (Next.js metadata). |
| `apps/web/src/app/apple-icon.png` | 180 px, opaque white behind the mark (iOS masks it). |
| `apps/web/src/app/favicon.ico` | 48 px favicon. |

Regenerate the raster files with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/generate-brand-assets.ps1
```

The in-app logo (`src/components/brand/logo.tsx`) draws the supplied mark and
wordmark as one inline SVG lockup, so it stays crisp and inherits `currentColor`.
Its outline geometry lives in `logo-paths.ts` and must stay identical to the
outline in the brand SVGs.

### Provenance

The original vector artwork was supplied as `Minimalist Dwellr House Logo.svg`.
The brand SVGs and inline paths are derived from that artwork, replacing the
earlier reconstruction from the brand description.

### Usage rules

- **Clear space:** at least the height of the doorway on every side.
- **Minimum sizes:** mark 16 px; wordmark 72 px wide; lockup 90 px wide.
- **Colour:** ink on white/`mist`, or paper (white) on ink. No other colours,
  no gradients, no shadows, no outlines.
- **Don't:** stretch, rotate, outline, add effects, set the wordmark in another
  typeface, uppercase it, or place the mark inside a container that changes its
  silhouette.
- **Do:** prefer the lockup in headers and the mark alone where space is tight.

## Colour

| Token | Hex | Use |
| --- | --- | --- |
| `ink` | `#1F2422` | Primary text, logo, primary buttons, dark sections |
| `paper` | `#FFFFFF` | Page background, text on ink |
| `mist` | `#F5F4EF` | Quiet surfaces, avatars, informational panels |
| `line` | `#E5E2DA` | Hairline dividers and input borders only |
| `stone` | `#6E736D` | Secondary text, captions, metadata |
| `moss` | `#2F4F43` | Reserved accent — verified/positive states only, used sparingly |

Ink on paper is roughly 15:1, stone on paper roughly 4.9:1. Body copy uses ink;
stone is for secondary text at 14 px and above.

Rules: white-dominant layouts, near-black ink as the only "brand" colour,
hairlines instead of boxes, and no decorative gradients. Glassmorphism,
coloured shadows and multi-colour accents are out.

## Typeface

**Outfit** (SIL Open Font License), loaded with `next/font/google` as
`--font-outfit` and used for everything — display, UI and body. It is a
geometric sans with circular bowls, close to the wordmark's construction.

- Display: 500 weight, tracking `-0.03em` to `-0.045em`, tight leading
  (`0.98`–`1.1`) on large headlines.
- Body: 400 weight, 15–18 px, leading `1.6`.
- UI labels: 500 weight, 14 px. Eyebrows: 11 px, uppercase, tracking `0.22em`.

Fallback stack: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`.

## Design tokens

Declared once in `apps/web/src/app/globals.css` under Tailwind v4's `@theme`.
Components use the generated utilities (`bg-mist`, `rounded-card`,
`text-body-sm`); raw hex values and arbitrary one-off sizes are not allowed in
app code.

### Colour

| Token | Utility | Value | Contrast on paper | Use |
| --- | --- | --- | --- | --- |
| `ink` | `text-ink` / `bg-ink` | `#1F2422` | 15.2:1 | Primary text, buttons, dark panels |
| `ink-soft` | `bg-ink-soft` | `#333936` | 12.1:1 | Hover state for ink surfaces |
| `paper` | `bg-paper` | `#FFFFFF` | — | Page and card background |
| `mist` | `bg-mist` | `#F5F4EF` | — | Quiet surfaces, inputs, skeleton base |
| `sand` | `bg-sand` | `#ECE8DF` | — | Warmer neutral, used sparingly |
| `line` | `border-line` | `#E5E2DA` | — | Hairline dividers and input borders |
| `line-strong` | `border-line-strong` | `#D3CFC4` | — | Secondary button border, dashed empty states |
| `stone` | `text-stone` | `#6E736D` | 4.9:1 | Secondary text, metadata |
| `stone-soft` | `text-stone-soft` | `#737871` | 4.5:1 | Placeholders and micro-labels only |
| `moss` | `text-moss` | `#2F4F43` | 9.1:1 | Verified / positive states only |
| `moss-soft` | `bg-moss-soft` | `#EAF0EA` | — | Verified badge and success surface |
| `danger` | `text-danger` | `#A4291F` | 6.4:1 | Errors, destructive actions |
| `danger-soft` | `bg-danger-soft` | `#FDF1F0` | — | Error surface |

Ink on paper is 15.2:1, stone on paper 4.9:1, stone-soft 4.5:1 — every text
colour clears WCAG AA at its intended size. Moss is a status colour, never a
decorative accent.

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
| `spacing-phone-frame` | 43.25rem | `h-phone-frame` — reserved landing mockup height |
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
lifetime"), no fake urgency, no exclamation marks. Say what dwellr does and
what it does not know.

## Landing collection mockup

The waitlist hero includes one presentational phone mockup, `CollectionMockup`
in `apps/web/src/components/landing/`. Its fictional homes and ratings live in
`mockup-fixtures.ts`; the summary is computed with the real collection comparison
logic, never queried from the database.

- The mockup shows only features that exist: per-member ratings, notes, the
  collection comparison labels (`Everyone likes`, `Split opinion`, `Still
  deciding`), and provenance labels.
- It uses inline, flat SVG house illustrations derived from the brand mark. No
  raster images, stock homes, invented addresses, or prices.
- The phone is a generic rounded frame. It is not an Apple or Android product
  likeness and has no notch or platform logo.
- The phone container is exposed as one image with a concise label; its inner
  UI is decorative and hidden from assistive technology. The illustrative
  caption is real, visible text beneath it.
- The frame uses the `spacing-phone-frame` token so its height is reserved before
  fonts load and cannot shift the hero. If fixture content changes, recheck that
  the frame still fits and update the explicit-height Playwright check.
- Keep the single entrance animation and its reduced-motion fallback.

## Imagery

Photography-first, but **only real, licensed or user-submitted photography**.
Never stock imagery of homes presented as listings, never AI-generated
property photos, never fabricated addresses. Until licensed photography is
available, prefer type-led layouts over placeholder photos.

## Provenance labels

Two label styles, used on every property detail:

- **Verified** — `bg-ink text-paper`, uppercase, tracked.
- **Community** — white with a hairline ink border.

They are informational, not decorative. A field always carries one of them.
On cards the badge sits beside the price; on a property page each fact row
repeats the label in micro-caps so provenance is readable without colour.
