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
│       └── src/
│           ├── app/          Routes, layouts, Server Actions
│           │   ├── (auth)/   sign-up / sign-in route group
│           │   └── me/       protected profile page
│           ├── components/   Brand, auth and UI components
│           ├── lib/          Supabase clients, env, auth helpers
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
network or database. UI behaviour is exercised manually for now; component and
end-to-end tests are a later milestone decision.

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

## Milestone 1 direction

Design system and property card: provenance-safe property types and Zod
contracts in core, property/collection tables with RLS, and a card component
whose verified/user-submitted tags are structural rather than decorative.
