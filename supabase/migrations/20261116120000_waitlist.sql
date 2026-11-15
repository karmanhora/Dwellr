-- Public waitlist.
--
-- The table is intentionally unreachable from anon/authenticated. The only
-- write path is join_waitlist(), a security-definer function with a fixed
-- search_path, database validation, duplicate-safe responses and rate limits.

create table public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text,
  searching_with text,
  region text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  referrer text,
  referral_code text not null unique,
  referred_by uuid references public.waitlist_signups (id) on delete set null,
  email_confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_notified_at timestamptz,
  unsubscribe_token_hash text unique,
  ip_hash text not null,
  created_at timestamptz not null default now(),
  constraint waitlist_signups_email_lowercase check (email = lower(email)),
  constraint waitlist_signups_email_length check (char_length(email) between 3 and 254),
  constraint waitlist_signups_email_format check (
    email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ),
  constraint waitlist_signups_role_check check (
    role is null or role in (
      'planning_next_12_months',
      'actively_looking',
      'just_browsing',
      'agent_or_broker',
      'creator'
    )
  ),
  constraint waitlist_signups_searching_with_check check (
    searching_with is null or searching_with in ('on_my_own', 'partner', 'family_or_friends')
  ),
  constraint waitlist_signups_region_length check (region is null or char_length(region) <= 80),
  constraint waitlist_signups_region_single_line check (region is null or region !~ '[\r\n]'),
  constraint waitlist_signups_utm_source_length check (utm_source is null or char_length(utm_source) <= 200),
  constraint waitlist_signups_utm_medium_length check (utm_medium is null or char_length(utm_medium) <= 200),
  constraint waitlist_signups_utm_campaign_length check (utm_campaign is null or char_length(utm_campaign) <= 200),
  constraint waitlist_signups_referrer_length check (referrer is null or char_length(referrer) <= 500),
  constraint waitlist_signups_referral_code_format check (referral_code ~ '^[a-z0-9]{10}$'),
  constraint waitlist_signups_ip_hash_format check (ip_hash ~ '^[0-9a-f]{64}$'),
  constraint waitlist_signups_unsubscribe_hash_format check (
    unsubscribe_token_hash is null or unsubscribe_token_hash ~ '^[0-9a-f]{64}$'
  )
);

create unique index waitlist_signups_email_unique on public.waitlist_signups (email);
create index waitlist_signups_ip_created_idx on public.waitlist_signups (ip_hash, created_at desc);
create index waitlist_signups_created_idx on public.waitlist_signups (created_at desc);
create index waitlist_signups_referred_by_idx on public.waitlist_signups (referred_by);

alter table public.waitlist_signups enable row level security;

-- No policies are created. Even if a policy is added later by mistake, the
-- default table privileges are removed here as a second layer.
revoke all on table public.waitlist_signups from public, anon, authenticated;

comment on table public.waitlist_signups is
  'Private waitlist signups. Readable only through the Supabase dashboard or service role.';
comment on column public.waitlist_signups.ip_hash is
  'Salted hash used only for abuse rate limiting; never a raw IP address.';
comment on column public.waitlist_signups.unsubscribe_token_hash is
  'SHA-256 of the signed unsubscribe token. The token itself is never stored.';

create or replace function public.join_waitlist(
  p_email text,
  p_role text default null,
  p_searching_with text default null,
  p_region text default null,
  p_utm_source text default null,
  p_utm_medium text default null,
  p_utm_campaign text default null,
  p_referrer text default null,
  p_referral_code text default null,
  p_ip_hash text default null,
  p_unsubscribe_token_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_role text := nullif(lower(btrim(coalesce(p_role, ''))), '');
  v_searching_with text := nullif(lower(btrim(coalesce(p_searching_with, ''))), '');
  v_region text := nullif(btrim(coalesce(p_region, '')), '');
  v_utm_source text := nullif(btrim(coalesce(p_utm_source, '')), '');
  v_utm_medium text := nullif(btrim(coalesce(p_utm_medium, '')), '');
  v_utm_campaign text := nullif(btrim(coalesce(p_utm_campaign, '')), '');
  v_referrer text := nullif(btrim(coalesce(p_referrer, '')), '');
  v_referral_code text := nullif(lower(btrim(coalesce(p_referral_code, ''))), '');
  v_ip_hash text := nullif(lower(btrim(coalesce(p_ip_hash, ''))), '');
  v_unsubscribe_hash text := nullif(lower(btrim(coalesce(p_unsubscribe_token_hash, ''))), '');
  v_referred_by uuid;
  v_new_code text;
  v_existing public.waitlist_signups%rowtype;
begin
  if v_email = ''
     or char_length(v_email) > 254
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_role is not null and v_role not in (
    'planning_next_12_months',
    'actively_looking',
    'just_browsing',
    'agent_or_broker',
    'creator'
  ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_searching_with is not null and v_searching_with not in (
    'on_my_own',
    'partner',
    'family_or_friends'
  ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_region is not null and (char_length(v_region) > 80 or v_region ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if (v_utm_source is not null and char_length(v_utm_source) > 200)
     or (v_utm_medium is not null and char_length(v_utm_medium) > 200)
     or (v_utm_campaign is not null and char_length(v_utm_campaign) > 200)
     or (v_referrer is not null and char_length(v_referrer) > 500) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_referral_code is not null and v_referral_code !~ '^[a-z0-9]{10}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_ip_hash is null or v_ip_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_unsubscribe_hash is not null and v_unsubscribe_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  -- Serialize same-email requests so concurrent submits cannot create two rows.
  perform pg_advisory_xact_lock(hashtext('waitlist_email:' || v_email));

  select *
    into v_existing
    from public.waitlist_signups
   where email = v_email;

  if found then
    -- Deliberately identical to a new signup: callers cannot learn whether an
    -- address was already present.
    return jsonb_build_object('ok', true, 'referral_code', v_existing.referral_code);
  end if;

  -- Global burst guard, then per-IP hourly guard. The global lock is taken
  -- before the IP lock so concurrent requests cannot deadlock.
  perform pg_advisory_xact_lock(hashtext('waitlist_global'));

  if (
    select count(*)
      from public.waitlist_signups
     where created_at > now() - interval '1 minute'
  ) >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext('waitlist_ip:' || v_ip_hash));

  if (
    select count(*)
      from public.waitlist_signups
     where ip_hash = v_ip_hash
       and created_at > now() - interval '1 hour'
  ) >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if v_referral_code is not null then
    select id
      into v_referred_by
      from public.waitlist_signups
     where referral_code = v_referral_code
       and unsubscribed_at is null;
  end if;

  loop
    -- gen_random_uuid() is available on every supported Postgres version.
    v_new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    exit when not exists (
      select 1 from public.waitlist_signups where referral_code = v_new_code
    );
  end loop;

  insert into public.waitlist_signups (
    email,
    role,
    searching_with,
    region,
    utm_source,
    utm_medium,
    utm_campaign,
    referrer,
    referral_code,
    referred_by,
    ip_hash,
    unsubscribe_token_hash
  )
  values (
    v_email,
    v_role,
    v_searching_with,
    v_region,
    v_utm_source,
    v_utm_medium,
    v_utm_campaign,
    v_referrer,
    v_new_code,
    v_referred_by,
    v_ip_hash,
    v_unsubscribe_hash
  )
  returning referral_code into v_new_code;

  return jsonb_build_object('ok', true, 'referral_code', v_new_code);
end;
$$;

revoke all on function public.join_waitlist(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.join_waitlist(
  text, text, text, text, text, text, text, text, text, text, text
) to anon;

-- Only the count is public. It never exposes rows or identities.
create or replace function public.waitlist_signup_count()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)
    from public.waitlist_signups
   where unsubscribed_at is null;
$$;

revoke all on function public.waitlist_signup_count() from public, anon, authenticated;
grant execute on function public.waitlist_signup_count() to anon;

-- Unsubscribe is authenticated by the secret token; only its hash reaches the
-- database. A valid token clears the subscription and a repeat call is a no-op.
create or replace function public.unsubscribe_waitlist(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := nullif(lower(btrim(coalesce(p_token_hash, ''))), '');
  v_count integer;
begin
  if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  update public.waitlist_signups
     set unsubscribed_at = coalesce(unsubscribed_at, now())
   where unsubscribe_token_hash = v_hash;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.unsubscribe_waitlist(text) from public, anon, authenticated;
grant execute on function public.unsubscribe_waitlist(text) to anon;

-- Claims the one-time welcome notification for this token. A duplicate signup
-- cannot trigger a second email, and it does not reveal whether the address was
-- already present.
create or replace function public.claim_waitlist_notification(p_token_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text := nullif(lower(btrim(coalesce(p_token_hash, ''))), '');
  v_count integer;
begin
  if v_hash is null or v_hash !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  update public.waitlist_signups
     set last_notified_at = now()
   where unsubscribe_token_hash = v_hash
     and last_notified_at is null
     and unsubscribed_at is null;

  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

revoke all on function public.claim_waitlist_notification(text) from public, anon, authenticated;
grant execute on function public.claim_waitlist_notification(text) to anon;
