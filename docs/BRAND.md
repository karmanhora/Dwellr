# dwellr — Brand

## Name

Always lowercase: **dwellr**, in the wordmark, in running text, and in the
browser title. Never "Dwellr" mid-sentence and never "Dwellr, Inc." in
product copy. The legal entity name can differ.

Tagline (product-facing): **Find a home. Together.**

## Logo

Two elements, one lockup:

1. **House mark** — a solid near-black house silhouette with a rounded doorway
   cut out of the base. Geometric, no outline, no gradient.
2. **Wordmark** — "dwellr" in a lowercase geometric sans, optically spaced
   tight, with the crossbar of the `e` aligned to the x-height.

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

The in-app logo (`src/components/brand/logo.tsx`) draws the mark as inline SVG
and sets the wordmark in the live typeface, so it stays crisp and inherits
`currentColor`. Keep its path data identical to `dwellr-mark.svg`.

### Provenance

The source `assets/dwellr-logo.png` was **not present in the repository**, so
the mark and wordmark SVGs here are a faithful reconstruction from the brand
description (solid house mark with doorway cut-out, lowercase geometric
wordmark). Replace them with the original vector artwork when available; no
layout changes should be needed.

### Usage rules

- **Clear space:** at least the height of the doorway on every side.
- **Minimum sizes:** mark 16 px; wordmark 72 px wide; lockup 96 px wide.
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

## Layout and motion

- Generous spacing: section padding 80–112 px on desktop, 56–72 px on mobile.
- Max content width 72rem (`max-w-6xl`), 20–32 px side gutters.
- Corners: pills for buttons (full radius), `1.75rem`–`2rem` for large panels.
- Motion: 800 ms `cubic-bezier(0.22, 1, 0.36, 1)` fade-and-rise on entrance,
  small hover transitions only. Everything collapses to no motion under
  `prefers-reduced-motion`.

## Voice

Calm, direct, specific. Short sentences. No hype ("dream home", "once in a
lifetime"), no fake urgency, no exclamation marks. Say what dwellr does and
what it does not know.

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
