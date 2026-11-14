# dwellr

A social network for home hunting. Save homes, build shared collections, and
evaluate properties together — with every property detail marked as verified or
user-submitted.

Milestone 2 adds the collaborative and social layer: collection roles
(owner/editor/viewer), hashed invites, per-member ratings and comparisons,
likes, threaded comments, follows, blocking, private reports, notifications,
and a feed ranked only by explicit follows and preferences.

> Not a listing site. No scraped data, no invented addresses.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 — `apps/web`
- Zod schemas, types and services shared with future native clients — `packages/core`
- Supabase (Postgres, Auth, Storage, RLS) — `supabase/`
- pnpm workspaces

## Setup

```bash
pnpm install
```

Create `apps/web/.env.local` from the example and fill in your **dev** project's
public API values (Project Settings → API):

```bash
cp apps/web/.env.example apps/web/.env.local
```

Never put the service role key or the database password in that file.

Link the Supabase CLI to the dev project and apply migrations (dry run first):

```bash
pnpm supabase login
pnpm supabase link --project-ref <project-ref>
pnpm supabase db push --dry-run --remote
pnpm supabase db push --remote
```

## Commands

| Command          | What it does                               |
| ---------------- | ------------------------------------------ |
| `pnpm dev`       | Start the web app on http://localhost:3000 |
| `pnpm build`     | Production build                           |
| `pnpm lint`      | ESLint across workspaces                   |
| `pnpm typecheck` | `tsc --noEmit` across workspaces           |
| `pnpm test`     | Vitest suite for `packages/core`           |
| `pnpm test:security` | Anon-key RLS/storage suite (needs Supabase) |
| `pnpm --filter @dwellr/web test:e2e` | Playwright flows (needs `.env.local`) |
| `pnpm format`    | Prettier write                             |

## Structure

```
apps/web      Next.js app (routes, Server Actions, components)
packages/core Zod schemas, domain types, pure services, brand constants
supabase      Config and versioned migrations
docs          Architecture and brand documentation
scripts       Brand asset generation
```

## Milestone 2 surfaces

- `/c/[slug]` — shared collection with members, roles, evaluations, activity,
  comparison and invites.
- `/notifications` — invites, comments, likes and follows, with named-invite
  accept/decline.
- `/feed` — followed and preference-matched homes with an explicit reason on
  every card.
- `/settings/blocked` — unblock accounts hidden in both directions.

Property pages include likes and comments; profile pages include follows,
blocking and reporting. Social tables are target-polymorphic so Milestone 3
posts can reuse the same layer.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/BRAND.md](docs/BRAND.md).
