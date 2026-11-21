-- Waitlist survey.
--
-- One row per signup. Answers arrive from an unverified browser first and are
-- stored as staged data: they are never the signup's canonical role/searching
-- fields and never trusted contact details. They become verified only once
-- email ownership is proven, either by the emailed confirmation link (which
-- carries the signup-time survey session) or from the private status page.
--
-- The table is unreachable from anon/authenticated: RLS is on with no policies,
-- and every write goes through a security-definer function with a fixed
-- search_path. Only the service role can execute those functions.

create table public.waitlist_survey_responses (
  signup_id uuid primary key references public.waitlist_signups (id) on delete cascade,
  answers_status text not null default 'staged',
  role text not null,
  searching_with text,
  region text,
  timeline text,
  use_case text,
  display_name text,
  brokerage text,
  work_region text,
  contact_method text,
  phone text,
  promo_interest text,
  creator_focus text,
  creator_channel text,
  notes text,
  staged_session_id uuid,
  staged_at timestamptz,
  verified_at timestamptz,
  verified_via text,
  last_ip_hash text,
  last_write_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_survey_status_check check (answers_status in ('staged', 'verified')),
  constraint waitlist_survey_role_check check (
    role in (
      'planning_next_12_months',
      'actively_looking',
      'just_browsing',
      'agent_or_broker',
      'creator'
    )
  ),
  constraint waitlist_survey_searching_with_check check (
    searching_with is null or searching_with in ('on_my_own', 'partner', 'family_or_friends')
  ),
  constraint waitlist_survey_region_check check (
    region is null or (char_length(region) <= 80 and region !~ '[\r\n]')
  ),
  constraint waitlist_survey_timeline_check check (
    timeline is null
    or timeline in ('asap', 'next_3_months', 'next_6_12_months', 'just_exploring')
  ),
  constraint waitlist_survey_use_case_check check (
    use_case is null
    or use_case in ('find_a_home', 'compare_neighborhoods', 'follow_listings', 'share_with_partner')
  ),
  constraint waitlist_survey_display_name_check check (
    display_name is null or (char_length(display_name) <= 80 and display_name !~ '[\r\n]')
  ),
  constraint waitlist_survey_brokerage_check check (
    brokerage is null or (char_length(brokerage) <= 120 and brokerage !~ '[\r\n]')
  ),
  constraint waitlist_survey_work_region_check check (
    work_region is null or (char_length(work_region) <= 80 and work_region !~ '[\r\n]')
  ),
  constraint waitlist_survey_contact_method_check check (
    contact_method is null or contact_method in ('email', 'phone', 'text')
  ),
  constraint waitlist_survey_phone_check check (
    phone is null or (char_length(phone) <= 32 and phone !~ '[\r\n]')
  ),
  constraint waitlist_survey_promo_interest_check check (
    promo_interest is null or promo_interest in ('yes', 'no', 'maybe')
  ),
  constraint waitlist_survey_creator_focus_check check (
    creator_focus is null
    or creator_focus in ('listing_videos', 'neighborhood_content', 'interior_design', 'other')
  ),
  constraint waitlist_survey_creator_channel_check check (
    creator_channel is null or (char_length(creator_channel) <= 200 and creator_channel !~ '[\r\n]')
  ),
  constraint waitlist_survey_notes_check check (
    notes is null or char_length(notes) <= 500
  ),
  constraint waitlist_survey_verified_check check (
    answers_status <> 'verified'
    or (verified_at is not null and verified_via in ('confirmation', 'status_page'))
  ),
  constraint waitlist_survey_ip_hash_check check (
    last_ip_hash is null or last_ip_hash ~ '^[0-9a-f]{64}$'
  )
);

create index waitlist_survey_ip_time_idx
  on public.waitlist_survey_responses (last_ip_hash, last_write_at desc);

alter table public.waitlist_survey_responses enable row level security;

-- No policies are created. Even if a policy were added later by mistake, the
-- default table privileges are removed here as a second layer.
revoke all on table public.waitlist_survey_responses from public, anon, authenticated;

create trigger waitlist_survey_responses_set_updated_at
  before update on public.waitlist_survey_responses
  for each row
  execute function public.set_updated_at();

comment on table public.waitlist_survey_responses is
  'Waitlist survey answers. Staged rows are unverified anonymous input and are never trusted; verified rows were promoted after email ownership was proven.';
comment on column public.waitlist_survey_responses.last_ip_hash is
  'Salted hash used only for abuse rate limiting; never a raw IP address.';
comment on column public.waitlist_survey_responses.staged_session_id is
  'Survey session that wrote the staged answers. Promotion on confirmation requires this to match the session claimed by the emailed confirmation token.';

-- Validates and normalizes answers. Returns the canonical payload the write
-- functions store; every rejection is the same invalid_input code so callers do
-- not learn which field failed.
create or replace function public.normalize_waitlist_survey_answers(p_answers jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_role text;
  v_searching_with text;
  v_region text;
  v_timeline text;
  v_use_case text;
  v_display_name text;
  v_brokerage text;
  v_work_region text;
  v_contact_method text;
  v_phone text;
  v_promo_interest text;
  v_creator_focus text;
  v_creator_channel text;
  v_notes text;
begin
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  v_role := nullif(lower(btrim(coalesce(p_answers ->> 'role', ''))), '');
  v_searching_with := nullif(lower(btrim(coalesce(p_answers ->> 'searching_with', ''))), '');
  v_region := nullif(btrim(coalesce(p_answers ->> 'region', '')), '');
  v_timeline := nullif(lower(btrim(coalesce(p_answers ->> 'timeline', ''))), '');
  v_use_case := nullif(lower(btrim(coalesce(p_answers ->> 'use_case', ''))), '');
  v_display_name := nullif(btrim(coalesce(p_answers ->> 'display_name', '')), '');
  v_brokerage := nullif(btrim(coalesce(p_answers ->> 'brokerage', '')), '');
  v_work_region := nullif(btrim(coalesce(p_answers ->> 'work_region', '')), '');
  v_contact_method := nullif(lower(btrim(coalesce(p_answers ->> 'contact_method', ''))), '');
  v_phone := nullif(btrim(coalesce(p_answers ->> 'phone', '')), '');
  v_promo_interest := nullif(lower(btrim(coalesce(p_answers ->> 'promo_interest', ''))), '');
  v_creator_focus := nullif(lower(btrim(coalesce(p_answers ->> 'creator_focus', ''))), '');
  v_creator_channel := nullif(btrim(coalesce(p_answers ->> 'creator_channel', '')), '');
  v_notes := nullif(btrim(coalesce(p_answers ->> 'notes', '')), '');

  if v_role is null or v_role not in (
    'planning_next_12_months',
    'actively_looking',
    'just_browsing',
    'agent_or_broker',
    'creator'
  ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_searching_with is not null
     and v_searching_with not in ('on_my_own', 'partner', 'family_or_friends') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_region is not null and (char_length(v_region) > 80 or v_region ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_timeline is not null
     and v_timeline not in ('asap', 'next_3_months', 'next_6_12_months', 'just_exploring') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_use_case is not null
     and v_use_case not in (
       'find_a_home',
       'compare_neighborhoods',
       'follow_listings',
       'share_with_partner'
     ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_display_name is not null
     and (char_length(v_display_name) > 80 or v_display_name ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_brokerage is not null
     and (char_length(v_brokerage) > 120 or v_brokerage ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_work_region is not null
     and (char_length(v_work_region) > 80 or v_work_region ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_contact_method is not null
     and v_contact_method not in ('email', 'phone', 'text') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_phone is not null and (char_length(v_phone) > 32 or v_phone ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_promo_interest is not null and v_promo_interest not in ('yes', 'no', 'maybe') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_creator_focus is not null
     and v_creator_focus not in (
       'listing_videos',
       'neighborhood_content',
       'interior_design',
       'other'
     ) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_creator_channel is not null
     and (char_length(v_creator_channel) > 200 or v_creator_channel ~ '[\r\n]') then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_notes is not null and char_length(v_notes) > 500 then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'role', v_role,
    'searching_with', v_searching_with,
    'region', v_region,
    'timeline', v_timeline,
    'use_case', v_use_case,
    'display_name', v_display_name,
    'brokerage', v_brokerage,
    'work_region', v_work_region,
    'contact_method', v_contact_method,
    'phone', v_phone,
    'promo_interest', v_promo_interest,
    'creator_focus', v_creator_focus,
    'creator_channel', v_creator_channel,
    'notes', v_notes
  );
end;
$$;

revoke all on function public.normalize_waitlist_survey_answers(jsonb)
  from public, anon, authenticated;

-- The single write path for answers, shared by anonymous staging and verified
-- saves. It takes normalized answers; callers own the rate limits and the
-- ownership checks.
--
-- A staged write is refused once the row is verified (the WHERE on the upsert),
-- so anonymous input can never overwrite trusted answers. A verified write is
-- always allowed, including over a previously verified row, so a verified owner
-- can never be locked out.
create or replace function public.write_waitlist_survey_answers(
  p_signup_id uuid,
  p_session_id uuid,
  p_ip_hash text,
  p_answers jsonb,
  p_verified_via text
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_verified boolean := p_verified_via is not null;
  v_state text;
begin
  if p_signup_id is null
     or p_answers is null
     or (v_verified and p_verified_via not in ('confirmation', 'status_page'))
     or (v_verified and p_session_id is not null)
     or (not v_verified and p_session_id is null) then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  insert into public.waitlist_survey_responses as survey (
    signup_id,
    answers_status,
    role,
    searching_with,
    region,
    timeline,
    use_case,
    display_name,
    brokerage,
    work_region,
    contact_method,
    phone,
    promo_interest,
    creator_focus,
    creator_channel,
    notes,
    staged_session_id,
    staged_at,
    verified_at,
    verified_via,
    last_ip_hash,
    last_write_at
  )
  values (
    p_signup_id,
    case when v_verified then 'verified' else 'staged' end,
    p_answers ->> 'role',
    p_answers ->> 'searching_with',
    p_answers ->> 'region',
    p_answers ->> 'timeline',
    p_answers ->> 'use_case',
    p_answers ->> 'display_name',
    p_answers ->> 'brokerage',
    p_answers ->> 'work_region',
    p_answers ->> 'contact_method',
    p_answers ->> 'phone',
    p_answers ->> 'promo_interest',
    p_answers ->> 'creator_focus',
    p_answers ->> 'creator_channel',
    p_answers ->> 'notes',
    case when v_verified then null else p_session_id end,
    case when v_verified then null else now() end,
    case when v_verified then now() else null end,
    p_verified_via,
    p_ip_hash,
    now()
  )
  on conflict (signup_id) do update set
    answers_status = excluded.answers_status,
    role = excluded.role,
    searching_with = excluded.searching_with,
    region = excluded.region,
    timeline = excluded.timeline,
    use_case = excluded.use_case,
    display_name = excluded.display_name,
    brokerage = excluded.brokerage,
    work_region = excluded.work_region,
    contact_method = excluded.contact_method,
    phone = excluded.phone,
    promo_interest = excluded.promo_interest,
    creator_focus = excluded.creator_focus,
    creator_channel = excluded.creator_channel,
    notes = excluded.notes,
    staged_session_id = excluded.staged_session_id,
    staged_at = case when v_verified then survey.staged_at else now() end,
    verified_at = coalesce(excluded.verified_at, survey.verified_at),
    verified_via = coalesce(excluded.verified_via, survey.verified_via),
    last_ip_hash = excluded.last_ip_hash,
    last_write_at = now()
  where survey.answers_status = 'staged' or excluded.answers_status = 'verified';

  select answers_status
    into v_state
    from public.waitlist_survey_responses
   where signup_id = p_signup_id;

  return v_state;
end;
$$;

revoke all on function public.write_waitlist_survey_answers(uuid, uuid, text, jsonb, text)
  from public, anon, authenticated;

-- Copies the three canonical answers onto the signup. This is the only place
-- survey input reaches waitlist_signups, and both callers reach it only after
-- ownership was proven. Answers the survey did not ask keep their old value.
create or replace function public.apply_waitlist_survey_canonical(
  p_signup_id uuid,
  p_role text,
  p_searching_with text,
  p_region text
)
returns void
language sql
set search_path = ''
as $$
  update public.waitlist_signups
     set role = p_role,
         searching_with = coalesce(p_searching_with, searching_with),
         region = coalesce(p_region, region)
   where id = p_signup_id;
$$;

revoke all on function public.apply_waitlist_survey_canonical(uuid, text, text, text)
  from public, anon, authenticated;

-- Anonymous staging. Writes only while the row is staged and returns nothing
-- about the stored answers. The session id is the one issued at signup, so a
-- token handed to someone who only typed an email can never be promoted by the
-- real owner's confirmation.
create or replace function public.stage_waitlist_survey(
  p_signup_id uuid,
  p_session_id uuid,
  p_ip_hash text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answers jsonb;
  v_ip text := nullif(lower(btrim(coalesce(p_ip_hash, ''))), '');
  v_recent integer;
begin
  if p_signup_id is null or p_session_id is null then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if v_ip is null or v_ip !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  if not exists (select 1 from public.waitlist_signups where id = p_signup_id) then
    return jsonb_build_object('ok', false, 'state', 'unknown');
  end if;

  v_answers := public.normalize_waitlist_survey_answers(p_answers);

  -- Row-level approximation of a global burst guard; the per-IP limit below is
  -- the one that matters for a single abuser.
  if (
    select count(*)
      from public.waitlist_survey_responses
     where last_write_at > now() - interval '1 minute'
  ) >= 240 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select count(*)::integer
    into v_recent
    from public.waitlist_survey_responses
   where last_ip_hash = v_ip
     and last_write_at > now() - interval '1 hour';

  if v_recent >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'state', coalesce(
      public.write_waitlist_survey_answers(p_signup_id, p_session_id, v_ip, v_answers, null),
      'staged'
    )
  );
end;
$$;

revoke all on function public.stage_waitlist_survey(uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.stage_waitlist_survey(uuid, uuid, text, jsonb) to service_role;

-- Promotion on confirmation. Only the session named in the emailed confirmation
-- token can promote, so answers staged by someone who merely typed the address
-- are never trusted.
create or replace function public.promote_waitlist_survey(
  p_signup_id uuid,
  p_session_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answers public.waitlist_survey_responses%rowtype;
begin
  if p_signup_id is null or p_session_id is null then
    return jsonb_build_object('ok', false, 'promoted', false);
  end if;

  update public.waitlist_survey_responses
     set answers_status = 'verified',
         verified_at = now(),
         verified_via = 'confirmation',
         staged_session_id = null
   where signup_id = p_signup_id
     and answers_status = 'staged'
     and staged_session_id = p_session_id
  returning * into v_answers;

  if not found then
    return jsonb_build_object('ok', true, 'promoted', false);
  end if;

  perform public.apply_waitlist_survey_canonical(
    p_signup_id,
    v_answers.role,
    v_answers.searching_with,
    v_answers.region
  );

  return jsonb_build_object('ok', true, 'promoted', true);
end;
$$;

revoke all on function public.promote_waitlist_survey(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.promote_waitlist_survey(uuid, uuid) to service_role;

-- Verified writes from the private status page. This always succeeds, including
-- over a previously verified row. The route only calls it after the status-page
-- token checks out, and the signup must already have a confirmed email.
create or replace function public.save_verified_waitlist_survey(
  p_signup_id uuid,
  p_ip_hash text,
  p_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_answers jsonb;
  v_ip text := nullif(lower(btrim(coalesce(p_ip_hash, ''))), '');
  v_confirmed_at timestamptz;
  v_recent integer;
  v_state text;
begin
  if p_signup_id is null or v_ip is null or v_ip !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_input' using errcode = '22023';
  end if;

  select email_confirmed_at
    into v_confirmed_at
    from public.waitlist_signups
   where id = p_signup_id;

  if not found then
    return jsonb_build_object('ok', false, 'state', 'unknown');
  end if;

  if v_confirmed_at is null then
    return jsonb_build_object('ok', false, 'state', 'unverified');
  end if;

  v_answers := public.normalize_waitlist_survey_answers(p_answers);

  select count(*)::integer
    into v_recent
    from public.waitlist_survey_responses
   where last_ip_hash = v_ip
     and last_write_at > now() - interval '1 hour';

  if v_recent >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  v_state := public.write_waitlist_survey_answers(
    p_signup_id,
    null,
    v_ip,
    v_answers,
    'status_page'
  );

  perform public.apply_waitlist_survey_canonical(
    p_signup_id,
    v_answers ->> 'role',
    v_answers ->> 'searching_with',
    v_answers ->> 'region'
  );

  return jsonb_build_object('ok', true, 'state', coalesce(v_state, 'verified'));
end;
$$;

revoke all on function public.save_verified_waitlist_survey(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_verified_waitlist_survey(uuid, text, jsonb) to service_role;

-- The status page holds the emailed status code, not the signup id. It needs the
-- id only to mint a separate, short-lived survey capability; the status code
-- itself never appears in a survey URL.
create or replace function public.waitlist_survey_signup_id(p_status_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
    from public.waitlist_signups
   where status_code = lower(btrim(coalesce(p_status_code, '')))
     and email_confirmed_at is not null;
$$;

revoke all on function public.waitlist_survey_signup_id(text)
  from public, anon, authenticated;
grant execute on function public.waitlist_survey_signup_id(text) to service_role;
