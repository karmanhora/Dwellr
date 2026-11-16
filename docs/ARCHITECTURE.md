# HausCrawl — Architecture

Milestone 0 establishes the foundation: a pnpm monorepo, a shared business-logic
package, a Supabase-backed auth loop, and a public profile surface.

## Product constraints that shape the architecture

1. **HausCrawl is not a listing site.** Users contribute property content. Every
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
HausCrawl/
├── apps/
│   └── web/                  Next.js 16 App Router app (the product surface)
│       ├── public/brand/     Logo mark, wordmark, lockup, PNG exports
│       ├── e2e/              Playwright smoke test + fixture image
│       └── src/
│           ├── app/          Routes, layouts, Server Actions
│           │   ├── (auth)/   sign-up / sign-in route group
│           │   ├── explore/  discovery feed
│           │   ├── create/   new property post
│           │   ├── p/[id]/   detail, edit, delete, comments, likes
│           │   ├── u/[username]/ public profile, follows, block/report
│           │   ├── c/[slug]/ shared collection, compare, invites
│           │   ├── feed/     personalized, explainable ranking
│           │   ├── notifications/ activity and pending invites
│           │   ├── invite/[token]/ link invite acceptance
│           │   ├── settings/ profile and blocked accounts
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
consumes `@hauscrawl/core` through `workspace:*`. When the Expo app arrives it
becomes `apps/mobile` and imports the same package.

### `packages/core` ships TypeScript source

`@hauscrawl/core` has no build step: Next.js compiles it via
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
import { signUpSchema, getFieldErrors, toProfile } from "@hauscrawl/core";
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
  price formatting and parsing, cursor encoding, storage URLs, profile rules,
  collection collaboration and social contracts — 212 tests, no browser or
  network.
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

### Continuous integration and the access suite

`.github/workflows/ci.yml` runs two jobs on every push to `main` and every pull
request:

1. **quality** — frozen-lockfile install, `pnpm typecheck`, `pnpm lint`,
   `pnpm test`, then a production build with placeholder public env values
   (dynamic pages, so the build never contacts a project).
2. **security** — starts the local Supabase stack, resets the database so every
   migration is applied from scratch, and runs `pnpm test:security`.

The access suite (`tests/security/access.mjs`) is committed, repeatable and uses
only the public anon key — no service-role bypass. It signs up an owner and a
stranger, then checks anonymous, owner and stranger behaviour for every table
and Storage bucket: public profile reads and owner-only writes; property reads,
writes and deletes; provenance remaining read-only and `source_ref`
unreadable; observed price/status history being trigger-written and read-only;
owners confirming their own listings; photo rows and owner-prefixed objects,
including the cross-owner path trigger and public reads; private versus
published collections and their items; save privacy and the absence of
anonymous access; and cascade behaviour on delete. Test rows and Storage objects are removed in a `finally` block; the
local database is disposable, so accounts need no cleanup.

The suite runs against a local stack only (`pnpm supabase start`, then
`pnpm test:security`); pointing it at a hosted project requires explicitly
setting `SUPABASE_TEST_URL` and `SUPABASE_TEST_ANON_KEY` and will create real
accounts there.

```powershell
pnpm test          # Vitest
pnpm --filter @hauscrawl/web test:e2e   # Playwright (needs .env.local + a live dev project)
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
- **Collaboration** — implemented in Milestone 2B below with memberships,
  roles, invites and evaluations.
- **Discovery** — public collections are link-only; there is no directory or
  profile section listing them yet.
- **Counters** — save counts and collection counts are read live, not
  denormalised; fine at this size, revisit with likes in 2B.
- **Cover images** — collection cards show name, visibility and count, not a
  photo mosaic.
- **Rate limiting / moderation** — unchanged from Milestone 1; collections add
  another write surface that needs the same abuse controls before public
  launch.

## Milestone 2B: shared decisions and the social graph

Milestone 2B turns collections into a shared workspace and adds the social
layer around homes: likes, comments, follows, blocking, notifications,
reports and a personalized feed. Everything is enforced in Postgres RLS and
triggers; the browser remains an anon-key client.

### Migrations

- `20261115090000_collaborative_collections.sql`
- `20261115100000_social_graph.sql`
- `20261115110000_notifications_and_reports.sql`
- `20261115120000_feed_preferences.sql`
- `20261115130000_fix_collection_owner_select.sql` — keeps `owner_id` as a
  SELECT fallback during `INSERT ... RETURNING`; the membership row is written
  by an `AFTER INSERT` trigger and is not visible to that statement.
- `20261115140000_harden_notification_columns.sql` — replaces the table-level
  notification SELECT with an explicit column grant that excludes `actor_ids`.
- `20261115150000_pending_invite_rpc.sql` — returns the caller's active named
  invites without widening private-collection visibility.

### Collaborative collections

`collection_members` is the authority for access and roles:

| Role | Can read | Can add/remove homes | Can rate/note | Manage members/invites |
| --- | --- | --- | --- | --- |
| `owner` | yes | yes | yes | yes |
| `editor` | yes | yes | yes | no |
| `viewer` | yes | no | no | no |

The collection owner gets an `owner` membership from an `after insert`
trigger; pre-existing collections were backfilled in the migration. Owner
identity is immutable for now, the owner row cannot be removed or demoted, and
member `collection_id`/`user_id` cannot be changed. A public collection is
readable by anyone; a private one is visible only to its members. Checks that
need the membership table run through `security definer` helpers
(`is_collection_member`, `collection_role_for`) to avoid recursive RLS.

`collection_item_evaluations` stores one row per member/home with a 1–5
rating, optional note ≤ 500 characters, and up to six pros and six cons tags.
Writes are limited to the member themselves and require an owner/editor role;
a viewer can read but not write. The composite foreign keys guarantee that the
member and item exist, so an evaluation cannot point at a home outside the
collection.

`collection_activity` is an append-only, trigger-written trail: joins, leaves,
home add/remove, and evaluation saves. Clients have select only.

### Invites

Invite tokens are generated on the server with `randomBytes(32)`, sent in the
URL, and stored only as a SHA-256 hash. `token_hash` is excluded from the
client column grant. Named (username) invites store `invitee_id` and notify
the invitee; because the token is not exposed to them, they accept through
`accept_collection_invite_by_id`, which checks `invitee_id = auth.uid()`. Link
invites have no invitee and are accepted through
`accept_collection_invite(p_token_hash)`.

Both RPCs are `security definer` because the invitee is not yet a member and
cannot read the collection through RLS. They lock the invite row, reject
expired, declined, revoked, exhausted, and wrong-account invites, insert the
membership at the invite's role, and increment `use_count`. `max_uses > 1`
links therefore stop working when the count is reached. Owners can revoke;
invitees can decline. A trigger rejects changes to every field except the
status/use fields the RPCs own. Declines and revokes are soft state, so the
audit row survives.

The notifications page cannot read a private collection before accepting, so
`get_my_pending_invites()` returns only the caller's active named invites
(id, collection name/slug, role, expiry). It is a narrow `security definer`
RPC; it does not widen the collections policy. Link invites have no
`invitee_id` and are accepted only through their token.

### Polymorphic social targets

Likes and comments use `social_target_type` (`property` | `post`) plus
`target_id`. The database does not use a polymorphic foreign key; instead:

- `assert_social_target` verifies the target exists; Milestone 3 completes
  the `post` branch instead of introducing parallel like/comment tables.
- `social_target_owner` resolves the owner for block checks and notifications.
- cleanup triggers remove likes, comments, reports and notifications when a
  property is deleted, and reports when a comment is hard-deleted.

This keeps one social table per concept, ready for posts without a schema
rewrite, while still preventing dangling rows today. The tradeoff is explicit
cleanup code instead of a cascading FK.

### Likes, comments and follows

`content_likes` has PK `(user_id, target_type, target_id)`; clients can only
insert/delete their own row. Counts come from the security-invoker
`content_like_counts` view, so a browser can never post a count. Likes across a
block are rejected by a trigger.

Comments are one level deep. A trigger enforces:

- author identity is the session user;
- the target exists (and is a property today);
- replies match the parent's target and cannot reply to a reply;
- a block between the author and content owner rejects the comment;
- at most 10 comments per author per rolling minute, enforced in the database
  so direct PostgREST calls cannot bypass it.

Clients have insert and a column-limited update for soft deletion. The
`protect_comment_update` trigger clears the body, records `deleted_by`, and
refuses edits to identity or an undelete. The author and the content owner can
delete; tombstones remain so replies do not collapse. `comments` selects are
public except across a block.

`follows` is a simple `(follower_id, following_id)` edge with a self-follow
check, a block check, and public block-aware reads. `profile_follow_counts` is
a security-invoker view. `blocks` is readable only by its owner and is checked
in both directions by `is_blocked_between`; the profiles and properties select
policies hide blocked accounts' content from the blocker and vice versa.

### Notifications and reports

Notifications are trigger-written only: clients have select and a
column-level update of `read_at`, with no insert/delete grant or policy. Events:

- collection invite, collection join/leave, and collection item additions;
- comment on a property (owner) and replies (parent author);
- follow;
- likes, collapsed into one unread row per target via a partial unique index
  and `actor_ids`/`actor_count`.

`actor_ids` is internal and the client grant is column-limited to exclude it.
The bell polls the
unread count every 60 seconds and refetches on window focus; Realtime is
deliberately not used for this milestone because notifications are durable
rows and the polling surface is small. The tradeoff is up to a minute of delay
while a tab stays focused.

`reports` accepts one of the report reasons for a property, post, comment or
profile, validates that the target exists, and is readable only by its
reporter. There is no client update path; moderation status is a server-side
concern for a later milestone. Reporters cannot see each other's reports.

### Personalized feed

`feed_preferences` stores up to ten neighborhoods and ten property types per
user, readable and writable only by that user. `feed_properties` is a
security-invoker view over properties, follows and preferences:

| Relevance | Meaning |
| --- | --- |
| 3 | followed person **and** a neighborhood/style match |
| 2 | followed person |
| 1 | neighborhood/style match |

Ordering is relevance descending, then `created_at` descending, then `id`
descending. The cursor is the same opaque `relevance|createdAt|id` tuple used
by the UI, validated before use. No clicks, time on page or other hidden signals
are collected; the preferences are explicit and the ranking is explainable.

### Product surface

- `/c/[slug]` shows members and roles, per-home evaluations, "Everyone likes"
  (every current member rated ≥ 4) and "Split opinion" (at least a two-point
  spread), activity, owner controls, named invites and a one-time link display.
- `/c/[slug]/compare` puts up to four homes side by side with property facts,
  each member's rating and the collection read.
- `/invite/[token]` accepts or declines a link invite; `/notifications` shows
  named pending invites with accept/decline.
- Property pages add Like, threaded comments (with reply and soft delete), and
  a report action. Profile pages add Follow, follower/following lists, Block
  and Report. `/settings/blocked` is the unblock surface.
- `/feed` shows followed and preference-matched homes with the reason for each
  card, a preferences form, suggested people to follow, and an empty state.

### RLS and grants summary

| Table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| `collection_members` | public collection or member | owner | owner | owner, or self-leave |
| `collection_invites` | invitee or owner | owner | owner revoke / invitee decline | none |
| `collection_item_evaluations` | public collection or member | owner/editor, self | self, owner/editor | self, owner/editor |
| `collection_activity` | member | none | none | none |
| `content_likes` | public | self | none | self |
| `comments` | public block-aware | self | author/content owner, soft delete only | none |
| `follows` | public block-aware | self | none | self |
| `blocks` | owner | self | none | self |
| `notifications` | own | none | own `read_at` | none |
| `reports` | own | self | none | none |
| `feed_preferences` | own | self | self | none |

Every new table revokes Supabase's default `ALL` grant first. Count views are
security-invoker, so the caller's RLS on the base tables still applies.
`social_target_owner` is executable by authenticated users because comment
RLS calls it, while `assert_social_target` remains internal.

### Testing

- `packages/core` now has **212** tests: collection role/permission rules,
  invite schemas, evaluation validation, comment trees, notification labels and
  feed cursor/relevance helpers.
- `tests/security/access.mjs` now runs **166 checks** across five accounts and
  covers
  non-member reads, viewer/editor write boundaries, role-change denial, owner
  immutability, hashed-token secrecy, named/link invite acceptance, one-use,
  revocation and expiry, comment/reply/soft-delete rules, like count derivation,
  forged social rows, block visibility in both directions, notification
  ownership/collapse and hidden `actor_ids`, pending-invite RPC scoping,
  report privacy, feed preference privacy, and cleanup of polymorphic rows.
- `apps/web/e2e/collaboration.spec.ts` is a two-context Playwright flow:
  owner posts two homes, creates a private collection, invites an editor;
  the editor accepts from notifications, rates both homes, compares them,
  follows the owner, comments and reports; the owner sees the notifications
  and the shared evaluations, then cleans up.

Both database-backed suites require the migrations above to be applied to the
target project before they can run. The local machine has no Docker, so the
hosted dev project is the integration target after explicit approval.

The responsive review captures `/feed`, `/notifications`, the collection,
property comments, and blocked accounts at 390, 768, and 1440 px. It is a
review harness rather than a committed regression suite.

### Known gaps (2B)

- **Moderation queue** — reports are captured privately, but there is no
  moderator UI, assignment, or status transition yet.
- **Notifications** — polling, not push; no email delivery. Named invites rely
  on the in-app notification, not email.
- **Rate limiting** — comments are limited in the database; property posts,
  likes, follows, reports and invites still rely on Supabase platform limits.
- **Posts as targets** — completed in Milestone 3 below.
- **Edit history** — comments are immutable except for deletion; collection
  activity records the event, not before/after values.
- **Collection note editing** — item notes still have no authoring UI.
- **Search** — unchanged; `ilike` scans until a trigram/full-text index lands.

## Listing freshness

Listings decay: a home goes under contract, a price drops, or a poster simply
stops paying attention. Freshness is modelled as **observed history plus a
self-reported confirmation**, never as verification.

### Observed price and status history

`supabase/migrations/20261114220000_add_listing_freshness.sql` adds
`property_price_history`, `property_status_history` and
`property_confirmations`.

- A `security definer` trigger, `record_property_history`, runs after insert or
  after price/status updates on `properties`. It records the initial price and
  status, then every distinct change with the previous value. Clients cannot
  write either history table: only `select` is granted, and there is no insert,
  update or delete policy.
- A price-cut badge is derived only from the **latest observed change** when the
  new price is lower, the previous price exists, and the change is at most
  `PRICE_CUT_BADGE_MAX_AGE_DAYS` old (90). A later increase suppresses an older
  cut, and a property posted at a low price never claims a cut.
- History is public because it describes public listing facts. It is shown as
  "Price reduced … · observed <date>", never as a verified or estimated value.
- Deleting a property cascades its history.

### Reconfirmation

`property_confirmations` holds append-only, self-reported confirmations from
the poster. RLS allows any signed-in user to read them (freshness is public)
and only the property's creator to insert one for their own listing; there are
no update or delete policies or grants. `getListingFreshness` in
`packages/core` compares the latest confirmation with the post date and marks a
listing stale after `LISTING_STALE_AFTER_DAYS` (30).

The owner sees a prompt on their listing: a quiet "keep this listing current"
block while fresh, and a stronger "Is this listing still accurate?" prompt once
stale, with a one-click confirmation that appends a row and redirects back with
a notice. Public pages show "Poster confirmed 3 days ago" or "Posted 45 days
ago · not recently confirmed" — explicitly attributed to the poster, not to
HausCrawl.

### Provenance stays intact

The freshness trigger does **not** write `property_field_provenance`, and
confirmations are not verification. Editing a price or status still resets
that field's provenance to `user_submitted` through the existing trigger, so
the overall badge can only become **Verified** through a server-side
integration. Confirmation counts and freshness labels are never used as a
substitute for the Verified badge.

## Milestone 3: community posts and short video

Milestone 3 adds user-generated posts (`text`, `photo`, `video`), thirty-second
home videos, an explainable vertical `/watch` feed, a unified create hub, and
the trust-and-safety controls that short-form video needs. Posts are community
content. They never write `property_field_provenance` and never change a
property's Verified or Community label.

### Migration

`supabase/migrations/20261116090000_posts_and_videos.sql` creates:

- **`posts`** — author, `post_kind` (`text`, `photo`, `video`), caption ≤ 2200,
  up to three categories from a fixed enum, optional property, neighborhood,
  city, timestamps, and `deleted_at`/`deleted_by` for soft deletion. Text posts
  require a caption. `kind`, author and deletion fields are not in the client
  update grant.
- **`post_photos`** — one to eight re-encoded images per photo post, ordered
  `position`, alt text, dimensions and `size_bytes`. Paths must match
  `<author-uuid>/<uuid>.(jpg|jpeg|png|webp)`.
- **`videos`** — exactly one per video post: storage path, poster path,
  duration, dimensions, bytes, MIME type, optional captions text, status.
  Database checks repeat the 30-second, 25 MB, 4096 px and MP4/WebM limits.
- **`user_media_usage`** — trigger-maintained photo and video bytes per user.
  The client can read only its own row; no write grant exists.
- **`create_post(...)`** — a `security definer` RPC that checks the session
  identity, rate limits, media ownership and quotas, then inserts the post and
  every media row in one transaction.
- **`soft_delete_post(uuid)`** — author-only RPC. It deletes media rows (which
  releases quota) and leaves a soft-deleted post tombstone.
- **`watch_posts`** — a security-invoker ranking view. It returns relevance and
  an engagement score; it never returns a hidden score.
- Post photo and video buckets, block-aware post/media policies, and the
  completed `post` branch of `assert_social_target`, `social_target_owner` and
  `validate_report_target`.

A deferred constraint trigger verifies at commit that a text post has no media,
a photo post has 1–8 photos and no video, and a video post has exactly one
video and no photos. Even a future writer that bypasses `create_post` cannot
commit an orphaned video post.

### Why an RPC instead of direct inserts

A post and its media must be atomic. With three tables and a deferred media
invariant, a direct PostgREST client could otherwise create a video post with
no video row, or attach somebody else's storage path between two requests.
`create_post` makes the ownership, quota and rate checks part of the same
transaction as the insert. Clients have SELECT only on `posts`; no INSERT or
DELETE grant exists. The author update grant is column-limited to caption,
categories, property, neighborhood, city and `updated_at`.

Tradeoff: editing media is not supported. A new photo or video means delete and
repost. That keeps the media invariant simple and avoids an upload-replacement
state machine in this milestone.

### Video storage boundary

`packages/core/src/types/video-provider.ts` defines `VideoProvider`:
`upload`, `remove`, `playbackUrl`, `posterUrl`. The web implementation,
`SupabaseVideoProvider`, uses Supabase Storage and an XHR upload so the create
screen gets real progress and a working cancel button. A future Mux or
Cloudflare Stream implementation can replace it without changing the post
schema, Server Actions or player overlay.

There is deliberately **no server-side transcoding** and no paid video service
in this milestone. Browser support is checked by decoding the selected file in
a `<video>` element, then rejecting unsupported type, over 30 seconds, over
25 MB, or dimensions over 4096 px. The original bytes are uploaded unchanged.
The database trusts the client-declared duration and dimensions after range
checks; it cannot probe the file. That is a documented gap, not a verification
claim.

### Upload privacy

Photo posts reuse the browser pipeline from property photos: resize to a 2000 px
long edge, draw to canvas, and re-encode as WebP. The original file, including
EXIF and GPS, is never uploaded.

Videos are different. HausCrawl cannot yet strip video container metadata. The
upload screen therefore shows a prominent notice: do not show house numbers,
license plates, mail, or anything that identifies where someone lives, and the
original file keeps what the camera recorded. This is a known gap.

### Limits, quotas and abuse controls

| Control | Limit | Enforced by |
| --- | --- | --- |
| Photos per post | 8 | Zod, RPC, `post_photos` trigger |
| Photo size | 5 MB | Browser re-encode, bucket, table check |
| Video duration | 30 s | Browser decode, input check, table check, RPC |
| Video size | 25 MB | Browser, bucket, table check, RPC |
| Video type | MP4 (H.264) or WebM | Input check, bucket MIME allowlist, table check |
| Posts per user | 10 per rolling hour | `create_post` (database) |
| Videos per user | 3 per rolling day | `create_post` (database) |
| Photo storage | 200 MB per user | Quota table + trigger + RPC |
| Video storage | 500 MB per user | Quota table + trigger + RPC |

The PostgreSQL limits are authoritative. The UI repeats them with
`canPublishPost` so people get an explanation before uploading, but a direct
PostgREST call hits the same checks. Quotas are abuse ceilings, not capacity
planning: 1,000 users at the full video allowance would be 500 GB, far beyond
the current hosted plan.

### Storage policies

| Bucket | Public read | Size / types | Write policy |
| --- | --- | --- | --- |
| `post-photos` | yes | 5 MiB; JPEG, PNG, WebP | insert/update/delete only under `auth.uid()/…` |
| `post-videos` | yes | 25 MiB; `video/mp4`, `video/webm` | insert/update/delete only under `auth.uid()/…` |

Paths are server-generated as `<user-id>/<uuid>.<ext>`. The browser never
supplies a filename. Three checks agree: the Storage prefix policy, the Server
Action prefix check, and the database triggers/RPC. The public bucket means a
person who already has an object URL can still fetch that object; blocking
hides rows and app surfaces, not a previously copied CDN URL. Private buckets
with signed URLs are the next step if strict block-level media secrecy is
required.

### Explainable ranking

`watch_posts` is a security-invoker view over posts, follows and feed
preferences. Relevance is:

| Relevance | Meaning |
| --- | --- |
| 3 | followed author **and** chosen neighborhood/property style |
| 2 | followed author |
| 1 | chosen neighborhood or tagged-home style match |
| 0 | everything else |

Ordering is relevance descending, engagement descending
(`likes + 2 × live comments`), then `created_at` and `post_id` descending. The
cursor is the validated tuple `relevance|engagement|createdAt|postId`. It is
keyset pagination, not offset paging, so new posts do not shift a page.

No clicks, watch time, completion rate or inferred interests are collected.
The watch overlay prints the relevance reason under each video. The ranking is
SQL one can read and audit.

Signed-out viewers get a recency-only page read directly from `posts`. The
ranking view joins follow and preference tables that anonymous callers have no
privilege on; a public fallback avoids widening those table grants just to
render `/watch` without a session.

### `/watch` behavior

The player is a vertical scroll-snap feed on mobile and a centered player with
a details card on desktop. `IntersectionObserver` at 60% visibility decides
which video is active. Only the active video plays; videos are paused when
they leave view, and only the current/next items preload metadata.

- Autoplay is muted and is disabled under `prefers-reduced-motion` or when the
  browser exposes `saveData`.
- Tap the player to play/pause, use the Sound button to unmute, and the mute
  choice persists in `localStorage` under `HausCrawl:watch:muted`.
- Keyboard: Up/Down or PageUp/PageDown move between videos, Space/K toggles
  play, M toggles mute. The feed container has an accessible instruction label.
- The overlay includes author, caption, topics, like, comments, report, share,
  optional collection save when a home is tagged, and a prominent View property
  link.
- The optional captions field is stored as plain text and shown as a
  transcript. It is not a WebVTT track; timed captions are a future step.
- Skeleton, empty, error and end-of-feed states are implemented. Cursor
  pagination is used both for the first page and `/api/watch` "load more".

### Create flow

`/create` is a three-option hub: List a home (`/create/home`), Share a post
(`/create/post`), Share a video (`/create/video`). The property form moved to
`/create/home`; the hub is linked from the header, mobile navigation and account
menu. Property tagging searches existing HausCrawl properties through a
public-read route (`/api/properties/search`) and never requires a tag.

### Trust, safety and moderation workflow

- Likes, comments, reports and notifications use the Milestone 2 polymorphic
  target tables with the `post` branch completed. There is no duplicate social
  system.
- Reports add `personal_information` ("Shows personal or identifying
  information"). Reporters see only their own reports; status remains
  server-side.
- A block hides posts, their photos/videos and comments in both directions,
  removes them from `watch_posts`, and prevents new likes/comments. Existing
  direct public Storage URLs are the documented exception above.
- Deleting a post removes its Storage objects first, then calls
  `soft_delete_post`; media rows are deleted so quota is released. The post row
  remains as a tombstone and its comments, likes, reports and notifications are
  hidden/cleaned up.
- Moderation today is manual: reports land in `reports` with status `open`, and
  an operator reviews them through the Supabase dashboard/SQL using a
  service-role process. There is no moderator screen, assignment, audit log or
  status transition UI.

Known gaps:

- **No video scanning** — no NSFW, malware, CSAM or reverse-image detection.
- **No metadata stripping** — video container metadata (including location, if
  the camera wrote it) remains in the uploaded file.
- **No transcoding** — files are not normalized, resized or stripped; an MP4
  that claims H.264 but cannot decode will be rejected client-side, while a
  direct PostgREST caller can still register range-valid metadata for bytes the
  database cannot inspect.
- **No admin tooling** — no queue, no takedown workflow, no appeals.
- **Collections are property-only** — the watch overlay offers collection
  saving only when the video tags a property. Untagged videos can be liked,
  commented, shared and reported, but not added to a collection.
- **Public buckets** — direct media URLs are not block-aware.
- **No orphan sweep** — a failed publish removes the paths it knows about, but a
  crash between upload and submit can leave an unreferenced object. A scheduled
  storage reconciliation job is needed.
- **Edit media** — not supported; delete and repost.
- **Timed captions** — plain transcript only.

### Capacity at 1,000 active users

Assumptions: 1,000 monthly active people, 20% create a photo post per month
with four 350 KB WebP images, 10% publish one 10 MB video per month, and 100
people watch five videos on a given day. Real usage will vary; these are
planning numbers, not measurements.

Storage growth:

- Photo posts: 200 × 4 × 350 KB ≈ **280 MB/month**.
- Videos: 100 × 10 MB = **1 GB/month**.
- Posters: ~100 × 150 KB ≈ **15 MB/month**.
- Total: about **1.3 GB/month**, roughly **15.6 GB after a year** before
  deletions.

Bandwidth:

- Video: 100 daily viewers × 5 videos × 10 MB ≈ **5 GB/day**, or
  **150 GB/month** if every view fetches the full file. Mobile data-saver and
  reduced-motion suppress autoplay but do not reduce an explicit play.
- Photo feed: 500 daily sessions × 20 cards × 200 KB ≈ **2 GB/day**, though
  `next/image` and HTTP caching reduce repeat transfer.

The Supabase Free plan (checked November 2026) includes **1 GB file storage**
and **5 GB egress plus 5 GB cached egress** per organization, with free
projects paused after a week of inactivity. One month of the video estimate
exceeds both storage and bandwidth. The Pro plan starts at $25/month with
100 GB storage and 250 GB egress (250 GB cached egress), which fits this
modest estimate but leaves little headroom for a successful video feed.

The 200 MB/500 MB per-user quotas bound abuse, not total cost. The likely next
architecture is direct-to-object-storage upload plus a video platform (Mux or
Cloudflare Stream) for transcoding, adaptive bitrate, signed playback and
per-minute delivery; `VideoProvider` exists so that swap does not touch the
post model. That is a paid-service decision for a later milestone and has not
been added now.
