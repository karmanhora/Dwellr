# dwellr — Architecture

Milestone 0 establishes the foundation: a pnpm monorepo, a shared business-logic
package, a Supabase-backed auth loop, and a public profile surface.

## Product constraints that shape the architecture

1. **dwellr is not a listing site.** Users contribute property content. Every
   property field will carry a provenance tag — `verified` or `user-submitted` —
   and the UI must never present unverified data as fact. No scraping.
2. **Location is generalized by default** (neighborhood, not street address).
   That is a data-model decision for Milestone 1, but the rule is recorded now.
3. **RLS on every table.** The browser only ever holds the anon key; the
   database enforces access.
4. **A native app is coming.** Anything reusable by Expo lives in
   `packages/core`, never in `apps/web`.

## Repository layout

```
dwellr/
├── apps/
│   └── web/                  Next.js 16 App Router app (the product surface)
│       ├── public/brand/     Logo mark, wordmark, lockup, PNG exports
│       ├── e2e/              Playwright smoke test + fixture image
│       └── src/
│           ├── app/          Routes, layouts, Server Actions
│           │   ├── (auth)/   sign-up / sign-in route group
│           │   ├── explore/  discovery feed
│           │   ├── create/   new property post
│           │   ├── p/[id]/   detail, edit, delete
│           │   ├── u/[username]/ public profile
│           │   ├── settings/ profile settings
│           │   └── me/       protected account page
│           ├── components/   Brand, auth, property and UI components
│           │   └── ui/       Design-system primitives
│           ├── lib/          Supabase clients, env, auth, property queries
│           └── proxy.ts      Next 16 request boundary (session refresh)
├── packages/
│   └── core/                 Shared domain layer (no React, no Next, no DOM)
│       └── src/
│           ├── constants/    Brand + validation limits
│           ├── schemas/      Zod contracts and their tests
│           ├── services/     Pure domain helpers
│           └── types/        Domain types
├── supabase/
│   ├── migrations/           Versioned SQL — every schema change is a migration
│   └── config.toml           Local CLI configuration
├── scripts/                  Reproducible asset generation (PowerShell)
└── docs/                     Architecture and brand documentation
```

## Decisions

### Monorepo with pnpm workspaces

One repository, one lockfile, and explicit package boundaries. `apps/web`
consumes `@dwellr/core` through `workspace:*`. When the Expo app arrives it
becomes `apps/mobile` and imports the same package.

### `packages/core` ships TypeScript source

`@dwellr/core` has no build step: Next.js compiles it via
`transpilePackages`, and Metro (Expo) can consume TypeScript directly. This
keeps the inner loop fast and removes a stale-`dist` failure mode. If core ever
needs to be published, add a build then.

Core depends only on `zod` and standard JavaScript (`URL`, `Intl`). No React,
no `next/*`, no browser globals — that is what makes it portable.

### Types flow one way

The database is the source of truth for shape. `packages/core` declares
`ProfileRow` (snake_case, exactly what Postgres returns) and `Profile`
(camelCase, what UI code uses); `toProfile` maps between them. The Supabase
client is typed with a hand-written `Database` type for Milestone 0. Once more
tables exist, replace it with `supabase gen types typescript`.

### Server Actions + `useActionState` instead of a REST layer

Authentication forms post to Server Actions. Validation happens **on the
server** with the same Zod schema the client sees, so rules cannot drift and
cannot be bypassed. The client only mirrors limits in input attributes for
immediate feedback; the server remains authoritative.

### Supabase SSR with cookie sessions

- `lib/supabase/client.ts` — browser client (cookie-based, for future
  interactive features).
- `lib/supabase/server.ts` — per-request server client; reads/writes cookies
  through `next/headers`.
- `lib/supabase/proxy.ts` — refreshes the session on every page route
  (static assets excluded by the matcher in `src/proxy.ts`) and gates `/me`,
  the only route that redirects unauthenticated visitors.
- `lib/auth.ts` — `getCurrentUser()` wrapped in React `cache()` so the layout
  and page share one `auth.getUser()` call.

`getUser()` (JWT verified with Supabase) is used everywhere identity matters.
`getSession()` is never trusted on the server.

**Next 16 note:** `middleware.ts` was renamed to `proxy.ts` and the exported
function to `proxy`; `src/proxy.ts` is the new convention. The proxy is a fast
first gate only — `/me` re-checks the user server-side, and every future
mutation must re-check too.

### RLS model for `profiles`

| Operation | Policy |
| --- | --- |
| `select` | `using (true)` — public profile |
| `insert` | `to authenticated`, `with check (auth.uid() = id)` |
| `update` | `to authenticated`, `using/with check (auth.uid() = id)` |
| `delete` | no client policy; `on delete cascade` from `auth.users` |

A `security definer` trigger (`handle_new_user`) creates the profile on
sign-up, using `raw_user_meta_data`. It sanitizes the username, enforces the
same regex as the app, and appends `_1`, `_2`… on collision so sign-up never
fails because of a taken handle. The migration lives in
`supabase/migrations/`.

### Styling

Tailwind CSS v4 with design tokens declared in `globals.css` under `@theme`
(`ink`, `paper`, `mist`, `line`, `stone`, `moss`). No component library: the
brand is typography, spacing and photography, so bespoke components stay small
and intentional. Animations respect `prefers-reduced-motion`.

### Testing

Vitest covers `packages/core` — the validation contracts and pure services,
where a regression is silent and expensive. The suite runs without a browser,
network or database. Milestone 1 adds a Playwright smoke test for the
cross-system flows (auth, Storage, RLS, Server Actions); see the Milestone 1
section for what it covers and why the dependency is justified.

## Auth flow (Milestone 0)

```
sign-up form ──▶ signUpAction (server)
                  ├─ signUpSchema (core)         → field errors
                  ├─ supabase.auth.signUp()      → auth.users row
                  │    └─ trigger handle_new_user → public.profiles row
                  └─ redirect /me

request ──▶ src/proxy.ts ──▶ refresh session
                              └─ no user on /me? → /sign-in?next=/me
/me page ──▶ getUser() ──▶ select own profile (RLS: public read)
```

Sign-out runs as a Server Action and redirects home.

## How the future Expo app reuses `packages/core`

`apps/mobile` imports the same package:

```ts
import { signUpSchema, getFieldErrors, toProfile } from "@dwellr/core";
```

- **Validation and types**: identical rules on both platforms, one place to
  change them.
- **Services**: `toProfile`, `getDisplayName`, `formatMemberSince`,
  `getInitials` are platform-neutral.
- **Brand constants**: `BRAND.colors`, `BRAND.typeface` feed React Native
  styles and the native splash screen.
- **Not shared**: Supabase client construction. Web uses `@supabase/ssr`
  cookie handling; React Native needs `@supabase/supabase-js` with
  `AsyncStorage`, deep-link auth and a keychain-backed session. That adapter
  lives in the mobile app.
- **Not shared**: any React/Next component or Tailwind class.

## Milestone 1: property posts

Milestone 1 adds the design system, the property data model, and the full
create → discover → detail → edit/delete loop.

### Schema

`supabase/migrations/20261114190000_create_properties.sql` creates:

- **`properties`** — `created_by → profiles(id) on delete cascade`, title,
  description, `listing_status` enum (`for_sale`, `off_market`, `sold`,
  `unknown`), `price_cents bigint` + `currency`, bedrooms, bathrooms,
  `square_feet`, `property_type` enum, neighborhood, city, state, postal code,
  optional `latitude`/`longitude`, timestamps. Database `check` constraints
  mirror the Zod ranges: title 3–120, description ≤ 4000, price 0–100,000,000,000
  cents, beds/baths 0–50, square feet 1–100,000, state 2–80, postal code 2–12,
  currency `^[A-Z]{3}$`.
- **`property_photos`** — `property_id → properties on delete cascade`,
  `storage_path unique`, `position`, `alt_text`, `width`, `height`. A trigger
  rejects the ninth photo and `unique (property_id, position)` keeps ordering
  deterministic. Width and height must be provided together.
- **`property_field_provenance`** — one row per property field, PK
  `(property_id, field)`, `field` allowlist check, `provenance` enum and a check
  that `verified_at` is present exactly when provenance is `verified`.

Indexes serve the discovery feed and profile pages: `(created_at desc, id desc)`,
`(listing_status, created_at desc)`, `lower(city)`, `lower(neighborhood)`,
`(created_by, created_at desc)`, `property_type`, and
`(property_id, position)`.

**Money is stored in cents.** A `bigint` of minor units is exact, survives
JSON, and compares safely in SQL; `numeric` would arrive in JS as a string and
float would round. The display currency is a separate ISO code.

**Coordinates are privacy-rounded.** `numeric(6,2)` plus a check that the value
equals `round(value, 2)` means the database itself refuses a precise pin
(~1.1 km granularity), not just the form.

### Provenance, enforced by the database

The separate table is the core security decision. Clients receive **SELECT
only** — no insert/update/delete policy and no write grant — so nothing a
browser sends can create a `verified` row. The column-level grant excludes
`source_ref`, which will name the verifying integration.

A `security definer` trigger (`sync_property_provenance`) writes the rows:

- on insert, every non-null tracked field becomes `user_submitted`;
- on update, a field whose value changed is reset to `user_submitted` with
  `verified_at` and `source_ref` cleared; a new non-null field is added;
- a field cleared to null loses its provenance row.

`verified` is therefore only reachable by a service-role integration running
server-side. The UI derives the post-level badge with
`getPropertyVerification`: a post is **Verified** only when every recorded fact
is verified, otherwise **Community**. The card badge, the detail row labels and
the legend all read from that map, so the distinction cannot drift from the
data.

Tradeoff: this costs one join and a trigger, but it makes provenance
impossible to forge from the client and lets individual facts be verified later
without touching the property row. The alternative — `*_verified` columns or a
`jsonb` map on `properties` — is either wider on every read or impossible to
constrain per field.

### Generalized location, and the plan for exact addresses

No street address column exists in this milestone. Location is neighborhood,
city, optional state/postal code, and optional lat/lng rounded to two decimals.
The create form says so explicitly, and the detail page labels a pin as
approximate.

Later, exact addresses should arrive as a separate
`property_addresses` table keyed by property, with:

1. a `precision` enum (`street`, `exact`, `parcel`) and an explicit owner opt-in
   per property;
2. server-only writes (service role) after an integration or a human verifies
   the address, never a client insert;
3. deduplication into a persistent building/property entity using provider ids
   (county parcel, geocoder place id) so the same home is one profile rather
   than many posts;
4. an audit trail of who changed an address and why, and a rule that the exact
   address is never exposed publicly until the owner opts in.

### RLS and storage policies

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `properties` | public (`using true`) | authenticated, `created_by = auth.uid()` | owner, `using` + `with check` | owner |
| `property_photos` | public | authenticated, property owner via `exists` | property owner, `using` + `with check` | property owner |
| `property_field_provenance` | public, column-limited (`source_ref` excluded) | none | none | none |

Supabase grants `ALL` on new public tables to `anon` and `authenticated` by
default, which silently defeats column-level grants. Migration
`20261114200000_harden_property_security.sql` revokes those table-level
privileges first and re-grants the minimum: `select` for both client roles,
DML for `authenticated` on properties/photos, and a column-level `select` on
provenance. `truncate`, `references` and `trigger` are revoked from both roles.

| Bucket | Public read | Size / types | Write policy |
| --- | --- | --- | --- |
| `property-photos` | yes | 5 MiB; `image/jpeg`, `image/png`, `image/webp` | insert/update/delete only when `(storage.foldername(name))[1] = auth.uid()` |
| `avatars` | yes | 2 MiB; same types | same owner-prefix rule |

Object keys are generated as `<user-id>/<uuid>.webp`. The client never supplies
a filename. Three independent checks keep a post from referencing another
account's objects: the upload policy's prefix rule, the server action's prefix
check, and a `before insert or update` trigger
(`enforce_property_photo_owner`) that compares `storage_path`'s first segment
with the property's `created_by`. Uploads are downscaled to a 2000 px long
edge, re-encoded as WebP and stripped of EXIF in the browser before they reach
the bucket; the bucket's MIME allowlist is the second line of defence.

### Writes and validation

Server Actions own every mutation. They re-validate with the same Zod schemas
the client uses (`createPropertySchema`, `updatePropertySchema`,
`updateProfileSchema`), re-check the user with `getUser()`, and filter updates
by `created_by` so a write that affects no row is reported as a failure rather
than a success. Photo references arrive as JSON in a hidden field and are parsed
defensively. The database repeats the limits in `check` constraints.

`$`-prefixed price input is converted from dollars to integer cents before
validation; blank means "Price not listed", which is rendered as such — never
as `$0`.

### Discovery and pagination

`/explore` uses keyset pagination over `(created_at desc, id desc)`. The cursor
is the last row's timestamp and id; `decodeCursor` rejects anything that is not
a UUID pair, and the feed query uses a compound `or` filter so rows sharing a
timestamp are neither skipped nor repeated. "Load more" is a normal link: it is
shareable, works without JavaScript, preserves the back button, and needs no
client-side cache. The tradeoff is one full navigation per page instead of
seamless infinite scroll.

Search terms are stripped of PostgREST expression characters before being used
in an `or(ilike…)` filter. There is no full-text index yet, which is acceptable
at this size and is recorded as a known gap.

### Images in the UI

`next/image` renders every stored photo through the optimizer, with
`remotePatterns` limited to `**.supabase.co/storage/v1/object/public/**`. Cards
reserve a 4:3 frame, lazy-load below the fold and use `PropertyCardSkeleton`
while the feed loads. The gallery is a client component with arrow-key, Home/End
and touch-swipe navigation; the container is focusable so keyboard users can
change photos without tabbing through every thumbnail.

### Security review notes

Covered:

- RLS on all three tables, with owner-scoped writes and no client write path to
  provenance.
- Public buckets are read-only for the public; every write is prefix-scoped to
  the uploader.
- Validation in the browser, in the Server Action and in Postgres.
- No service-role key or database password in the app; only the anon key is
  shipped, and RLS is what protects data.
- Server identity always comes from `getUser()`. The proxy gates `/me`,
  `/create`, `/settings/*` and `/saved` as a fast first pass, and every
  page/action re-checks.
- Server Actions inherit Next's origin checks and `SameSite` cookies.
- `source_ref` is not readable by clients, and table-level default grants
  cannot re-open it (see the hardening migration above).
- Photo rows are database-checked against the property owner's id, not only
  by the application.

Known gaps (deliberately out of scope for this milestone):

- **Moderation and reporting** — no flag/report flow, no moderation queue, no
  way to remove someone else's abusive post.
- **Rate limiting** — nothing stops a signed-in account from creating posts or
  uploading images in a loop beyond Supabase's own limits.
- **Image content scanning** — no NSFW, malware or reverse-image checks; the
  bucket validates type and size only.
- **Orphaned uploads** — if a post fails after its photos upload, the objects
  remain until cleaned up; a scheduled sweep is needed.
- **No edit history** — provenance resets on edit, but the previous value is not
  retained (no audit trail yet).
- **No soft delete** — deleting a post is immediate and unrecoverable.
- **Search cost** — `ilike` scans; a trigram or full-text index is the next step.
- **Email confirmation is disabled in the dev project**; hosted auth settings
  still need the 8-character letters-and-digits policy applied in the dashboard.

### Testing

- Vitest covers `packages/core`: property schemas (ranges, defaults, photo
  limits, path format, paired coordinates/dimensions), provenance aggregation,
  price formatting and parsing, cursor encoding, storage URLs, profile rules
  and collection contracts — 169 tests, no browser or network.
- Playwright (Chromium) adds one smoke test for the cross-system flow that unit
  tests cannot see: sign-up → photo upload to Storage under RLS → post insert →
  card on `/explore` → detail page → owner edit → save → create a public
  collection with the home → sign-out → read the shared collection signed out
  → sign-in → `/saved` → delete the post and the collection. The dependency is
  justified by that coverage; it is Chromium-only and runs against a dev server
  on port 3100.
- Milestone 2A was also verified directly against the live project with an
  anon-key script (23 checks): save privacy between two accounts, anonymous
  denial on `property_saves`, private collections invisible to anon and to a
  second account, foreign writes on collections/items rejected, public
  collections and their items readable by anon after publishing, and property
  deletion cascading through collection items.

```powershell
pnpm test          # Vitest
pnpm --filter @dwellr/web test:e2e   # Playwright (needs .env.local + a live dev project)
```

## Milestone 2A: saves and collections

Milestone 2A adds two separate ideas:

- **Saves** (`property_saves`) are private bookmarks. A saved home is visible
  only to the person who saved it; saves never affect a property's facts,
  provenance or public listing.
- **Collections** (`collections` + `collection_items`) are named, ordered lists
  owned by one person. They are private by default and become readable by
  anyone with the link only when the owner publishes them.

`saves` is deliberately not a hidden default collection. Saving is a one-tap
bookmark that must work without choosing a list, while collections are curated
and can be shared. Keeping the tables separate avoids a "default collection"
that cannot be renamed or deleted safely, and keeps save/unsave a single
row write.

### Schema

`supabase/migrations/20261114210000_create_collections.sql` creates:

- **`collections`** — `owner_id → profiles(id) on delete cascade`, name 1–60,
  optional description ≤ 500, `is_public` (default false), unique
  `share_slug`, timestamps. `unique (owner_id, lower(btrim(name)))` prevents
  duplicate names per person. Share slugs are 12 lowercase alphanumerics,
  generated server-side; the database enforces the shape and uniqueness but the
  slug is a convenience, not the access control.
- **`collection_items`** — PK `(collection_id, property_id)`, both cascading;
  `added_by → profiles`, optional note ≤ 500, timestamp. A `security definer`
  trigger rejects the 101st item so the limit does not depend on RLS visibility.
- **`property_saves`** — PK `(property_id, user_id)`, both cascading, timestamp.

Indexes: `(owner_id, name)` unique, `(owner_id, created_at desc)`, partial
`(created_at desc) where is_public`, `(property_id)` on items, and
`(user_id, created_at desc)` on saves.

### RLS and grants

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `collections` | public rows, or own rows | authenticated, `owner_id = auth.uid()` | owner | owner |
| `collection_items` | items of public or own collections | collection owner, `added_by = auth.uid()` | collection owner | collection owner |
| `property_saves` | own rows only | own rows only | none | own rows only |

All three tables revoke Supabase's default `ALL` grant first, then grant the
minimum. `anon` can select public collections and their items; it has no access
to `property_saves` at all. Item policies re-check collection ownership through
an `exists` subquery rather than trusting `added_by`.

A private collection returns no row to a non-owner, so `/c/[slug]` renders the
same not-found page as a slug that never existed; it does not reveal that the
collection is private. The page sets `robots: noindex` while a collection is
private.

### Product surface

- The property page shows **Save** (toggle, private) and **Add to collection**
  when signed in. The picker lists the user's collections and can create a new
  one with the home already attached.
- `/saved` has two tabs: saved homes and the user's collections, plus the
  collection create form. It is gated by the proxy and by the page itself.
- `/c/[slug]` shows a collection, its owner, its homes, and per-item notes.
  Owners can publish/unpublish, delete the collection and remove items;
  visitors get a read-only page for public collections.
- Deleting a collection removes its items but not the homes or the owner's
  saves. Deleting a property removes it from every collection through the
  cascade.

Collection notes are owner annotations about a home, not property facts. They
are stored on the item and are never fed into `property_field_provenance`; the
UI labels and badge rules for provenance are unchanged.

### Known gaps for 2A

- **Note editing** — the `note` column and display exist, but there is no UI to
  write a note yet; it is reserved for the collection-detail editor.
- **Collaboration** — only the owner can add or remove items. Shared editing,
  invites and roles need a membership table and a policy rewrite.
- **Discovery** — public collections are link-only; there is no directory or
  profile section listing them yet.
- **Counters** — save counts and collection counts are read live, not
  denormalised; fine at this size, revisit with likes in 2B.
- **Cover images** — collection cards show name, visibility and count, not a
  photo mosaic.
- **Rate limiting / moderation** — unchanged from Milestone 1; collections add
  another write surface that needs the same abuse controls before public
  launch.
