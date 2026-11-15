# Waitlist

The public waitlist for dwellr's Seattle / King County early access. It is a
single landing page with an email form, optional context fields, a referral
link, and the `/privacy`, `/terms`, and `/unsubscribe` support pages.

## How it works

1. The browser posts to `POST /api/waitlist` with the email, optional fields,
   UTM/referrer data, a referral code from `?ref=`, and a hidden honeypot field.
2. The route validates with `waitlistSignupSchema` from `@dwellr/core`, rejects
   obvious bots, hashes the request IP with `WAITLIST_IP_SALT`, and calls the
   `join_waitlist` RPC with the **anon** Supabase key.
3. `join_waitlist` validates again in Postgres, serializes same-email requests,
   returns the existing referral code for a duplicate, and writes the row. It
   enforces **5 new signups per IP hash per hour** and **60 new signups globally
   per minute**.
4. The response is identical for new and duplicate emails: `{ ok, referralCode,
   shareUrl }`. A filled honeypot gets the same response with a synthetic code,
   but no row is written.
5. If `WAITLIST_EMAIL_ENABLED=true` and Resend is configured, the route claims a
   one-time notification for that token and sends the welcome email. The form
   never fails because email is unavailable.
6. The referral link is `/?ref=CODE`. A later signup with that code stores the
   first row's `id` in `referred_by`.

### Database access

`waitlist_signups` has RLS enabled, no anon/authenticated policies, and all table
grants revoked from those roles. The only public database surface is:

- `join_waitlist(...)` — write path, anon execute only
- `waitlist_signup_count()` — aggregate count for the optional counter
- `unsubscribe_waitlist(token_hash)` — token-authenticated unsubscribe
- `claim_waitlist_notification(token_hash)` — one-time email claim

The browser never receives a service-role key. Do not add one to `apps/web`.

### Counter

The page reads `waitlist_signup_count()` and only renders the counter once it is
at least 25. It does not expose names, emails, or rows.

### Analytics

PostHog is the only new dependency. Vercel's custom events require a paid plan,
while PostHog's free tier covers the five events used here. Tracking is lazy,
cookieless (`cookieless_mode: "always"`), memory-only, and has autocapture,
pageleave, session recording, surveys, and feature flags disabled. Only these
events are sent:

- `waitlist_page_view`
- `waitlist_form_start`
- `waitlist_form_submit`
- `waitlist_success`
- `waitlist_referral_share_click`

No email, optional answers, form contents, or IP address is sent. Configure the
PostHog project to discard IP addresses as well. If
`NEXT_PUBLIC_POSTHOG_KEY` is unset, analytics is a no-op.

## Environment variables

Names only. Never commit values.

| Name | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon key, protected by RLS |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical origin for share links, metadata, sitemap |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Public | Contact address in legal pages and email footer |
| `WAITLIST_ONLY` | Server | `true` in production; `false` in local/preview |
| `WAITLIST_IP_SALT` | Server secret | Salt for the one-way IP hash used for rate limiting |
| `WAITLIST_UNSUBSCRIBE_SECRET` | Server secret | HMAC key for signed unsubscribe tokens |
| `WAITLIST_EMAIL_ENABLED` | Server | Enables the optional Resend welcome email |
| `RESEND_API_KEY` | Server secret | Resend API key; only needed when email is enabled |
| `WAITLIST_EMAIL_FROM` | Server | Verified Resend sender, including display name |
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | PostHog project key; blank disables analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | PostHog ingestion host |

Generate the two secrets separately, for example:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

### Vercel environments

- **Production:** `WAITLIST_ONLY=true`, production `NEXT_PUBLIC_SITE_URL`, real
  `NEXT_PUBLIC_CONTACT_EMAIL`, both server secrets, and (optionally) Resend and
  PostHog values.
- **Preview:** `WAITLIST_ONLY=false`, a preview-specific site URL if you use share
  links there, and test/placeholder values. Do not point preview at production
  email or analytics if you want clean production metrics.
- **Development:** `WAITLIST_ONLY=false`; `.env.local` with the public Supabase
  values and optional local secrets.

Set these in Vercel Project → Settings → Environment Variables, scoped per
environment. Do not put server secrets in any `NEXT_PUBLIC_*` variable.

## Migration

The migration is `supabase/migrations/20261116120000_waitlist.sql`.

Dry-run first, then apply only after review:

```bash
pnpm supabase db push --dry-run --remote
# after explicit approval:
# pnpm supabase db push --remote
```

`--remote` targets the linked Supabase project; the dry-run does not write. It
must list only `20261116120000_waitlist.sql` for this change. Review the SQL
before applying; it creates a new table and new functions and revokes public
table access.

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
  referral_code,
  referred_by is not null as was_referred,
  unsubscribed_at
from public.waitlist_signups
order by created_at desc;
```

Useful aggregates:

```sql
select count(*) as total,
       count(*) filter (where created_at > now() - interval '7 days') as last_7_days,
       count(*) filter (where referred_by is not null) as referred,
       count(*) filter (where unsubscribed_at is not null) as unsubscribed
from public.waitlist_signups;
```

### CSV export

In the dashboard, use the table's export menu. From `psql`:

```sql
\copy (
  select id, created_at, email, role, searching_with, region,
         utm_source, utm_medium, utm_campaign, referral_code, referred_by,
         unsubscribed_at
  from public.waitlist_signups
  order by created_at
) to 'waitlist-signups.csv' with (format csv, header true)
```

Treat the export as personal data: store it privately, do not commit it, and
delete it when it is no longer needed.

## Deploy checklist

1. Set the environment variables for the target Vercel environment.
2. Run the migration dry-run and review it; apply only with explicit approval.
3. Confirm `WAITLIST_ONLY=true` in production and `false` in preview.
4. Set `NEXT_PUBLIC_SITE_URL` to the real origin; verify canonical, OG image,
   sitemap, and robots URLs.
5. If enabling email, verify the sending domain in Resend, set
   `WAITLIST_EMAIL_FROM`, and send one test unsubscribe link.
6. Configure PostHog to discard IP addresses; verify only the five events arrive.
7. Run lint, typecheck, unit, security, and Playwright suites against a
   disposable database.
8. After deploy, submit one real test signup, check the row, the welcome email,
   the unsubscribe link, and a referral signup. Remove the test row through the
   dashboard if needed.
9. Keep a current export/backup process for the list before launch messaging.

## Metrics to watch weekly

- Total signups and signups in the last 7 days (target: 50 in 30 days).
- Referral signups (`referred_by is not null`) and top referral codes.
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
- Do not log emails, tokens, or request bodies.
- Do not expose the service-role key to the app or browser.

## Tests

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:security
pnpm --filter @dwellr/web test:e2e:waitlist
```

`pnpm test:security` and the Playwright waitlist suite need a disposable
Postgres/Supabase database with the migration applied. The security suite uses
the anon key only.

## Open follow-ups

- Consider email confirmation before treating a signup as confirmed; a
  pre-registered address currently blocks the real owner from receiving the
  optional welcome email.
- Add a small admin export view if the dashboard export becomes awkward.
- Decide whether to keep the optional welcome email on for launch or send only
  launch announcements.
