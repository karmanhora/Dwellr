-- Waitlist position, double opt-in and referral security.
--
-- Positions are always derived from confirmed signups. Nothing stores or
-- offsets a position. The public status RPC exposes only a bearer code's own
-- position, total when it is useful, confirmed referral count and tier.

alter table public.waitlist_signups
  add column if not exists status_code text;

-- Existing rows need a status link too. The code is a bearer secret, so it is
-- never returned by the public signup RPC.
update public.waitlist_signups
   set status_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 24)
 where status_code is null;

alter table public.waitlist_signups
  alter column status_code set not null;

alter table public.waitlist_signups
  add constraint waitlist_signups_status_code_format
  check (status_code ~ '^[a-z0-9]{24}$');

alter table public.waitlist_signups
  add constraint waitlist_signups_no_self_referral
  check (referred_by is null or referred_by <> id);

create unique index waitlist_signups_status_code_unique
  on public.waitlist_signups (status_code);

create index waitlist_signups_confirmed_queue_idx
  on public.waitlist_signups (email_confirmed_at, id)
  where email_confirmed_at is not null;

create index waitlist_signups_referred_confirmed_idx
  on public.waitlist_signups (referred_by, email_confirmed_at)
  where referred_by is not null and email_confirmed_at is not null;

comment on column public.waitlist_signups.status_code is
  'Bearer secret for the noindex status page. Never return this from a public signup RPC.';

-- Rate-limit buckets are keyed by a hash of the attempted status code. No raw
-- codes and no IP addresses are stored.
create table if not exists public.waitlist_status_attempts (
  rate_key text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0,
  constraint waitlist_status_attempts_key_format check (rate_key ~ '^[0-9a-f]{32}$'),
  constraint waitlist_status_attempts_count check (attempts >= 0)
);

alter table public.waitlist_status_attempts enable row level security;
revoke all on table public.waitlist_status_attempts from public, anon, authenticated, service_role;

comment on table public.waitlist_status_attempts is
  'Hashed status-code rate-limit buckets. Accessible only through security-definer functions.';

create or replace function public.waitlist_tier(p_confirmed_referrals integer)
returns text
language sql
immutable
security definer
set search_path = ''
as $$
  select case
    when coalesce(p_confirmed_referrals, 0) >= 10 then 'founding_member_badge'
    when coalesce(p_confirmed_referrals, 0) >= 3 then 'first_wave'
    when coalesce(p_confirmed_referrals, 0) >= 1 then 'founding_members'
    else null
  end;
$$;

revoke all on function public.waitlist_tier(integer) from public, anon, authenticated, service_role;

-- A position is the row number after sorting by effective rank, then by the
-- original confirmation order. The referral lift is five spots, capped at ten
-- referrals (fifty spots).
create or replace function public.waitlist_position(p_signup_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  with confirmed as (
    select
      s.id,
      row_number() over (order by s.email_confirmed_at, s.id) as queue_order,
      (
        select count(*)
          from public.waitlist_signups r
         where r.referred_by = s.id
           and r.email_confirmed_at is not null
      ) as confirmed_referrals
      from public.waitlist_signups s
     where s.email_confirmed_at is not null
  ),
  ranked as (
    select
      id,
      queue_order,
      queue_order - 5 * least(confirmed_referrals, 10) as effective_rank
      from confirmed
  ),
  ordered as (
    select
      id,
      row_number() over (order by effective_rank, queue_order) as "position"
      from ranked
  )
  select "position"
    from ordered
   where id = p_signup_id;
$$;

revoke all on function public.waitlist_position(uuid) from public, anon, authenticated, service_role;
grant execute on function public.waitlist_position(uuid) to service_role;

-- Status reads are limited per attempted code. The same empty row shape is
-- returned for unknown, unconfirmed, invalid and rate-limited codes.
create or replace function public.waitlist_status_allowed(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := md5(coalesce(p_code, ''));
  v_allowed boolean;
begin
  insert into public.waitlist_status_attempts (rate_key, window_start, attempts)
  values (v_key, now(), 1)
  on conflict (rate_key) do update
    set attempts = case
          when window_start < now() - interval '60 seconds' then 1
          else attempts + 1
        end,
        window_start = case
          when window_start < now() - interval '60 seconds' then now()
          else window_start
        end
  returning attempts <= 20 into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.waitlist_status_allowed(text) from public, anon, authenticated, service_role;

create or replace function public.get_waitlist_status(p_code text)
returns table (
  "position" bigint,
  total bigint,
  referral_count integer,
  tier text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_signup public.waitlist_signups%rowtype;
  v_referrals integer;
  v_total bigint;
  v_position bigint;
begin
  if not public.waitlist_status_allowed(v_code) then
    return query select null::bigint, null::bigint, 0::integer, null::text;
    return;
  end if;

  if v_code !~ '^[a-z0-9]{12,64}$' then
    return query select null::bigint, null::bigint, 0::integer, null::text;
    return;
  end if;

  select *
    into v_signup
    from public.waitlist_signups
   where status_code = v_code;

  if not found or v_signup.email_confirmed_at is null then
    return query select null::bigint, null::bigint, 0::integer, null::text;
    return;
  end if;

  select count(*)::integer
    into v_referrals
    from public.waitlist_signups
   where referred_by = v_signup.id
     and email_confirmed_at is not null;

  select count(*)
    into v_total
    from public.waitlist_signups
   where email_confirmed_at is not null;

  v_position := public.waitlist_position(v_signup.id);

  return query
    select
      v_position,
      case when v_total >= 25 then v_total else null::bigint end,
      v_referrals,
      public.waitlist_tier(v_referrals);
end;
$$;

revoke all on function public.get_waitlist_status(text) from public;
grant execute on function public.get_waitlist_status(text) to anon, authenticated;

-- The status page needs the shareable referral code, but the public status RPC
-- deliberately does not return it. This function is service-role only.
create or replace function public.get_waitlist_referral_code(p_status_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select referral_code
    from public.waitlist_signups
   where status_code = lower(btrim(coalesce(p_status_code, '')))
     and email_confirmed_at is not null;
$$;

revoke all on function public.get_waitlist_referral_code(text)
  from public, anon, authenticated;
grant execute on function public.get_waitlist_referral_code(text) to service_role;

-- Internal insert helper. It returns codes only to the service-role wrapper;
-- the public wrapper discards them. This keeps duplicate signups and codes out
-- of anonymous responses.
create or replace function public.waitlist_join_internal(
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
  v_new_id uuid;
  v_new_code text;
  v_new_status_code text;
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

  perform pg_advisory_xact_lock(hashtext('waitlist_email:' || v_email));

  select *
    into v_existing
    from public.waitlist_signups
   where email = v_email;

  if found then
    return jsonb_build_object(
      'ok', true,
      'is_new', false,
      'signup_id', v_existing.id,
      'status_code', v_existing.status_code,
      'referral_code', v_existing.referral_code
    );
  end if;

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
       and unsubscribed_at is null
       and email <> v_email
       and ip_hash <> v_ip_hash;
  end if;

  loop
    v_new_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
    exit when not exists (
      select 1 from public.waitlist_signups where referral_code = v_new_code
    );
  end loop;

  loop
    v_new_status_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 24);
    exit when not exists (
      select 1 from public.waitlist_signups where status_code = v_new_status_code
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
    status_code,
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
    v_new_status_code,
    v_ip_hash,
    v_unsubscribe_hash
  )
  returning id into v_new_id;

  return jsonb_build_object(
    'ok', true,
    'is_new', true,
    'signup_id', v_new_id,
    'status_code', v_new_status_code,
    'referral_code', v_new_code
  );
end;
$$;

revoke all on function public.waitlist_join_internal(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;

-- Public signup returns only success. Codes are delivered by email, never by
-- this anonymous function.
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
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('ok', true)
    from (
      select public.waitlist_join_internal(
        p_email,
        p_role,
        p_searching_with,
        p_region,
        p_utm_source,
        p_utm_medium,
        p_utm_campaign,
        p_referrer,
        p_referral_code,
        p_ip_hash,
        p_unsubscribe_token_hash
      )
    ) as joined;
$$;

revoke all on function public.join_waitlist(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.join_waitlist(
  text, text, text, text, text, text, text, text, text, text, text
) to anon;

create or replace function public.join_waitlist_admin(
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
language sql
security definer
set search_path = ''
as $$
  select public.waitlist_join_internal(
    p_email,
    p_role,
    p_searching_with,
    p_region,
    p_utm_source,
    p_utm_medium,
    p_utm_campaign,
    p_referrer,
    p_referral_code,
    p_ip_hash,
    p_unsubscribe_token_hash
  );
$$;

revoke all on function public.join_waitlist_admin(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.join_waitlist_admin(
  text, text, text, text, text, text, text, text, text, text, text
) to service_role;

-- Confirmation is idempotent. The referral is credited only on the first
-- confirmation, and only after the self-referral and same-IP daily cap checks.
create or replace function public.confirm_waitlist_signup(p_signup_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_signup public.waitlist_signups%rowtype;
  v_referrer public.waitlist_signups%rowtype;
  v_same_ip_today integer;
begin
  if p_signup_id is null then
    return jsonb_build_object('ok', false);
  end if;

  select *
    into v_signup
    from public.waitlist_signups
   where id = p_signup_id
   for update;

  if not found then
    return jsonb_build_object('ok', false);
  end if;

  if v_signup.email_confirmed_at is null then
    update public.waitlist_signups
       set email_confirmed_at = now()
     where id = v_signup.id;

    if v_signup.referred_by is not null then
      select *
        into v_referrer
        from public.waitlist_signups
       where id = v_signup.referred_by;

      if not found
         or v_referrer.email = v_signup.email
         or v_referrer.ip_hash = v_signup.ip_hash
         or v_referrer.unsubscribed_at is not null then
        update public.waitlist_signups
           set referred_by = null
         where id = v_signup.id;
      else
        select count(*)::integer
          into v_same_ip_today
          from public.waitlist_signups
         where referred_by = v_referrer.id
           and id <> v_signup.id
           and email_confirmed_at is not null
           and ip_hash = v_signup.ip_hash
           and email_confirmed_at >= date_trunc('day', now());

        if v_same_ip_today >= 3 then
          update public.waitlist_signups
             set referred_by = null
           where id = v_signup.id;
        end if;
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'status_code', v_signup.status_code
  );
end;
$$;

revoke all on function public.confirm_waitlist_signup(uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_waitlist_signup(uuid) to service_role;

-- Admin-only ordering view. Revoked from every public Data API role; use the
-- service role or the Supabase SQL editor.
create or replace view public.waitlist_invite_order
with (security_invoker = true)
as
with confirmed as (
  select
    s.id,
    s.email,
    s.email_confirmed_at,
    row_number() over (order by s.email_confirmed_at, s.id) as queue_order,
    (
      select count(*)
        from public.waitlist_signups r
       where r.referred_by = s.id
         and r.email_confirmed_at is not null
    ) as confirmed_referrals
    from public.waitlist_signups s
   where s.email_confirmed_at is not null
),
ranked as (
  select
    id,
    email,
    email_confirmed_at,
    queue_order,
    confirmed_referrals,
    queue_order - 5 * least(confirmed_referrals, 10) as effective_rank
    from confirmed
)
select
  row_number() over (order by effective_rank, queue_order) as "position",
  email,
  email_confirmed_at,
  queue_order,
  confirmed_referrals,
  effective_rank
from ranked;

revoke all on table public.waitlist_invite_order from public, anon, authenticated;
grant select on table public.waitlist_invite_order to service_role;
