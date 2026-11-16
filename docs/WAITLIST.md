# Waitlist

The public waitlist for HausCrawl's Seattle / King County early access. It is a
single landing page with an email form, optional context fields, email
confirmation, a private status page, and a referral link.

## How a signup works

1. The browser posts to `POST /api/waitlist` with the email, optional fields,
   UTM/referrer data, a referral code from `?ref=`, and a hidden honeypot field.
2. The route validates with `waitlistSignupSchema` from `@dwellr/core`, rejects
   obvious bots, hashes the request IP with `WAITLIST_IP_SALT`, and calls
   `join_waitlist_admin` with the **server-only** service role.
3. `join_waitlist_admin` serializes same-email requests and calls the internal
   insert function. It enforces **5 new signups per IP hash per hour** and
   **60 new signups globally per minute**. The public `join_waitlist` wrapper
   returns only `{ ok: true }`; it never returns a referral code, status code,
   position, or any duplicate-email signal.
4. A new signup gets a signed, 24-hour confirmation token by email. The token
   contains the signup id and is signed with `WAITLIST_CONFIRMATION_SECRET`.
   `/waitlist/confirm?token=...` verifies it and calls
   `confirm_waitlist_signup`, which sets `email_confirmed_at` and is idempotent.
5. A duplicate email gets a status-link email to that address instead. The API
   response is identical for new and duplicate signups: `{ ok: true, emailConfigured }`.
   `emailConfigured` is a server capability flag, not a delivery result, and is
   never a statement about whether the address already existed.
6. If `SUPABASE_SERVICE_ROLE_KEY`, `WAITLIST_CONFIRMATION_SECRET`, or Resend is
   missing, the form still writes through the public wrapper, but position and
   referral UI stay hidden. There is no synthetic position or share link.

If the service-role key is missing, the route falls back to the anon
`join_waitlist` wrapper and logs that double opt-in is disabled. Do not use that
fallback for a real launch.

## Position rules

Only confirmed signups (`email_confirmed_at is not null`) are in the queue.

- `queue_order` is the order of `email_confirmed_at`, then `id`.
- A confirmed referral moves the referrer up **5 spots**.
- At most **10 referrals** count, so the maximum lift is **50 spots**.
- `effective_rank = queue_order - 5 * min(confirmed_referrals, 10)`.
- `position` is the rank of `effective_rank`, with ties broken by lower
  `queue_order` (the person who confirmed earlier stays ahead).

Positions are computed by `public.waitlist_position(uuid)` and are never stored
or offset. They change as more people confirm. The status page says so.

The status page shows `You're #N`. It adds `of N` only when at least 25 people
are confirmed, matching `WAITLIST_COUNT_VISIBILITY_THRESHOLD`.

## Referrals

- A referral counts only after the referred signup confirms its own email.
- Self-referral is blocked by the same email or the same `ip_hash` at signup.
  Confirmation re-checks both and removes the link if either matches.
- At most **3 confirmed referrals per referrer per `ip_hash` per day** are
  credited. Additional confirmations remain in the queue but do not count for
  the referrer.
- The referral link is `/?ref=CODE`, where `CODE` is the existing 10-character
  referral code. It is not the status code.
- The three tiers are: 1 confirmed referral (Founding Members list), 3
  (first-wave invite), and 10 (Founding Member badge and a say in the roadmap).
  Rewards are priority access and status only, with no purchase necessary and
  no cash value.

## Status links

`/waitlist/status/[code]` is a private, noindex page. Its 24-character
`status_code` is a bearer secret generated at signup. The page sets
`Referrer-Policy: no-referrer`, and the route sends `X-Robots-Tag: noindex` and
`Cache-Control: private, no-store`. Codes are never sent to analytics.

`get_waitlist_status(code)` is a security-definer function granted to `anon`. It
returns only that code's position, total (only when the total is at least 25),
confirmed referral count, and tier. Unknown, unconfirmed, invalid, and
rate-limited codes all return the same one-row shape with empty values. Attempts
are limited by a hash of the code, **20 per 60 seconds**.

`get_waitlist_referral_code(status_code)` is service-role only; it supplies the
share link on the private status page without exposing the referral code through
the public status RPC.

The share UI offers copy, the native Web Share sheet when the browser supports
it, and prefilled WhatsApp, SMS, X, and email text. It never sends automatically,
reads contacts, or pre-checks a box. The text makes no ranking or launch claim.

`/waitlist/how-it-works` is the plain-language rules page, linked from the form,
status page, and footer. It has no countdowns, scarcity claims, or other people's
positions.

## Database access

`waitlist_signups` has RLS enabled, no anon/authenticated policies, and all table
grants revoked from those roles. The public database surface is:

- `join_waitlist(...)` — write path, anon execute only, returns `{ ok: true }`
- `get_waitlist_status(text)` — anon/authenticated, rate-limited, own row only
- `waitlist_signup_count()` — aggregate count for the optional counter
- `unsubscribe_waitlist(token_hash)` — token-authenticated unsubscribe
- `claim_waitlist_notification(token_hash)` — one-time email claim

Service-role-only functions are `join_waitlist_admin(...)`,
`confirm_waitlist_signup(uuid)`, `get_waitlist_referral_code(text)`, and
`waitlist_position(uuid)`. Every function sets `search_path = ''` and validates
its inputs. `join_waitlist_admin` returns the delivery context (signup id, status
code, referral code) only to the server route.

The browser never receives the service-role key. The key is read only in
`apps/web/src/lib/supabase/admin.ts`, which must not be imported by a client
component.

## Counter

The landing page reads `waitlist_signup_count()` and only renders the counter
once it is at least 25. The status total uses the confirmed-only count and has
the same threshold. Neither exposes rows, names, or emails.

## Analytics

PostHog is the only analytics dependency. Tracking is lazy, cookieless
(`cookieless_mode: "always"`), memory-only, and has autocapture, pageleave,
session recording, surveys, and feature flags disabled. Only these events are
sent:

- `waitlist_page_view`
- `waitlist_form_start`
- `waitlist_form_submit`
- `waitlist_success`
- `waitlist_referral_share_click`

No email, optional answers, form contents, status codes, referral codes, or IP
address is sent. Share events carry only the method. Configure PostHog to
discard IP addresses as well. If `NEXT_PUBLIC_POSTHOG_KEY` is unset, analytics is
a no-op.

## Environment variables

Names only. Never commit values.

| Name | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key, protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical origin for links, metadata, sitemap |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public | Contact address in legal pages and email footer |
| `WAITLIST_ONLY` | Server | `true` in production; `false` in local/preview |
| `WAITLIST_IP_SALT` | Server secret | Salt for the one-way IP hash used for rate limiting |
| `WAITLIST_UNSUBSCRIBE_SECRET` | Server secret | HMAC key for signed unsubscribe tokens |
| `WAITLIST_CONFIRMATION_SECRET` | Server secret | HMAC key for signed, expiring confirmation tokens |
| `SUPABASE_SERVICE_ROLE_KEY` | Server secret | Admin delivery/confirmation RPCs; server-only |
| `WAITLIST_EMAIL_ENABLED` | Server | Enables Resend confirmation and status email |
| `RESEND_API_KEY` | Server secret | Resend API key; only needed when email is enabled |
| `WAITLIST_EMAIL_FROM` | Server | Verified Resend sender, including display name |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | PostHog project key; blank disables analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | PostHog ingestion host |

Generate the three secrets separately, for example:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

### Email readiness

Email and position UI are enabled only when all of these are true:

- `WAITLIST_EMAIL_ENABLED=true`
- `RESEND_API_KEY` and `WAITLIST_EMAIL_FROM` are set
- `WAITLIST_CONFIRMATION_SECRET` is set
- the sender domain for `WAITLIST_EMAIL_FROM` is **verified** in Resend

The server checks the domain through the Resend domains API and caches the
result for five minutes. If any check fails, it logs a clear warning, keeps the
form working, and does not show a position or referral UI. It never fabricates
delivery or a place in line.

### Vercel environments

- **Production:** `WAITLIST_ONLY=true`, production `NEXT_PUBLIC_SITE_URL`, real
  `NEXT_PUBLIC_CONTACT_EMAIL`, all three server secrets,
  `SUPABASE_SERVICE_ROLE_KEY`, and verified Resend values.
- **Preview:** `WAITLIST_ONLY=false`, a preview-specific site URL, and
  test/placeholder values. Do not point preview at production email or
  analytics if you want clean production metrics. Do not share the production
  service-role key with preview if preview can reach production data.
- **Development:** `WAITLIST_ONLY=false`; `.env.local` with public Supabase
  values and, for delivery testing, the service key and confirmation secret.

Set these in Vercel Project → Settings → Environment Variables, scoped per
environment. Do not put server secrets in any `NEXT_PUBLIC_*` variable.

## Migration

The original waitlist schema is `supabase/migrations/20261116120000_waitlist.sql`.
Part B is `supabase/migrations/20261116140000_waitlist_positions.sql`. It adds
`status_code`, the queue/status functions, service-only delivery functions, the
rate-limit table, and the admin invite-order view.

Dry-run first, then apply only after review:

```bash
pnpm supabase db push --dry-run --remote
# after explicit approval:
# pnpm supabase db push --remote
```

`--remote` targets the linked Supabase project; the dry-run does not write. It
must list only the Part B migration if the original waitlist migration is
already applied. Review the SQL before applying. The migration backfills a
status code for every existing row, so it requires a brief exclusive lock on
`waitlist_signups`.

## Invite order (admin only)

The `waitlist_invite_order` view is revoked from `anon` and `authenticated`.
Read it with the Supabase SQL editor or the service role:

```sql
select
  position,
  email,
  email_confirmed_at,
  queue_order,
  confirmed_referrals,
  effective_rank
from public.waitlist_invite_order
order by position;
```

Send invites in exactly that order. `position` uses the same effective-rank and
tie-break rules as the status page. Do not expose this view or its results
through the public site.

## Viewing signups

Use the Supabase dashboard → Table Editor → `waitlist_signups`, or the SQL
editor. Both require dashboard/service access; the public site cannot read rows.

```sql
select
  created_at,
  email,
  role,
  searching_with,
  region,
  email_confirmed_at,
  referral_code,
  referred_by is not null as was_referred,
  unsubscribed_at
from public.waitlist_signups
order by created_at desc;
```

Useful aggregates:

```sql
select count(*) as total,
       count(*) filter (where email_confirmed_at is not null) as confirmed,
       count(*) filter (where created_at > now() - interval '7 days') as last_7_days,
       count(*) filter (where referred_by is not null and email_confirmed_at is not null) as credited_referrals,
       count(*) filter (where unsubscribed_at is not null) as unsubscribed
from public.waitlist_signups;
```

### CSV export

In the dashboard, use the table's export menu. From `psql`:

```sql
\copy (
  select id, created_at, email, role, searching_with, region,
         utm_source, utm_medium, utm_campaign, referral_code, referred_by,
         email_confirmed_at, unsubscribed_at
  from public.waitlist_signups
  order by created_at
) to 'waitlist-signups.csv' with (format csv, header true)
```

Do not export `status_code`: it is a bearer secret. Treat the export as personal
data: store it privately, do not commit it, and delete it when it is no longer
needed.

## Deploy checklist

1. Set the environment variables for the target Vercel environment, including
   the server-only service key and confirmation secret.
2. Run the migration dry-run and review it; apply only with explicit approval.
3. Confirm `WAITLIST_ONLY=true` in production and `false` in preview.
4. Set `NEXT_PUBLIC_SITE_URL` to the real origin; verify canonical, OG image,
   sitemap, and robots URLs.
5. Verify the Resend sender domain, set `WAITLIST_EMAIL_FROM`, and send one test
   confirmation, one duplicate status email, and one unsubscribe link.
6. Configure PostHog to discard IP addresses; verify no codes arrive in events.
7. Run lint, typecheck, unit, security, and Playwright suites against a
   disposable database.
8. After deploy, submit one real test signup, confirm it, check the position,
   share link, second signup, confirmation, and referral move. Remove test rows
   through the dashboard if needed.
9. Keep a current export/backup process for the list before launch messaging.

## Metrics to watch weekly

- Total signups, confirmed signups, and confirmation rate.
- Referral signups and how many referrals are credited after confirmation.
- Role and `searching_with` mix; couples/families are the core audience.
- Region distribution (general city/region only).
- UTM source/medium/campaign performance.
- Unsubscribes and any email delivery failures.
- The later product metric: couples who create a shared collection (target: 10).

## Privacy and legal notes

The `/privacy` and `/terms` pages are plain-language **drafts**, not legal advice.
Have a lawyer review them before relying on them publicly, especially the
retention period, deletion process, and any jurisdiction-specific language.

Operational rules:

- Do not sell or share emails for advertising.
- Do not add a street-address field to the waitlist.
- Keep the IP hash salted and use it only for abuse prevention.
- Keep unsubscribe links working without login.
- Do not log emails, confirmation tokens, status codes, or request bodies.
- Do not expose the service-role key to the browser or a client bundle.
- Do not expose `waitlist_invite_order`, `status_code`, or the referral code in
  analytics, public HTML, or public database responses.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:security
pnpm --filter @dwellr/web test:e2e:waitlist
```

`pnpm test:security` needs a disposable Postgres/Supabase database with the
migrations applied. It uses the anon key for public checks. To test valid status
codes and rate limiting, also set `SUPABASE_TEST_SERVICE_ROLE_KEY`; without it,
the suite still checks that anon cannot call the service-only functions.

The Playwright waitlist suite needs the same disposable database, the service
role key, and `WAITLIST_CONFIRMATION_SECRET` in the test process so it can create
and confirm dedicated test signups. Without those, the basic form tests run and
the position/referral tests are skipped.

## Known limitations

- Confirmation and status email are delivered only when the Resend domain is
  verified; local development without those values intentionally shows no
  position UI.
- The status page has no account login. The status code is a bearer secret and
  should be treated like a password.
- The daily referral cap uses the database's UTC day and the salted IP hash. It
  is abuse control, not identity verification.
