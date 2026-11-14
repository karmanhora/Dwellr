-- Milestone 2 — personalized feed preferences and ranking.
--
-- Ranking is deliberately simple and explainable:
--   3 = from a followed person AND matches a saved neighborhood or style
--   2 = from a followed person
--   1 = matches a saved neighborhood or style
-- Rows are ordered by relevance desc, then created_at desc, id desc. There is
-- no engagement or black-box signal. The view is security_invoker, so the
-- caller's RLS on properties and follows still applies.

create table public.feed_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  neighborhoods text[] not null default '{}',
  property_types public.property_type[] not null default '{}',
  updated_at timestamptz not null default now(),
  constraint feed_preferences_neighborhood_count check (cardinality(neighborhoods) <= 10),
  constraint feed_preferences_type_count check (cardinality(property_types) <= 10)
);

comment on table public.feed_preferences is
  'Explicit onboarding choices that feed the home feed. Never used for hidden profiling.';

create or replace function public.validate_feed_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  neighborhood text;
begin
  foreach neighborhood in array new.neighborhoods loop
    if char_length(btrim(neighborhood)) not between 1 and 80 then
      raise exception 'Neighborhoods must be 1–80 characters.' using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end;
$$;

create trigger feed_preferences_validate
  before insert or update of neighborhoods on public.feed_preferences
  for each row
  execute function public.validate_feed_preferences();

create trigger feed_preferences_set_updated_at
  before update on public.feed_preferences
  for each row
  execute function public.set_updated_at();

revoke all on public.feed_preferences from anon, authenticated;
revoke truncate, references, trigger on public.feed_preferences from anon, authenticated;
grant select, insert, update on public.feed_preferences to authenticated;

alter table public.feed_preferences enable row level security;

create policy "Users read their own feed preferences"
  on public.feed_preferences
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users write their own feed preferences"
  on public.feed_preferences
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their own feed preferences"
  on public.feed_preferences
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create view public.feed_properties
with (security_invoker = true) as
select
  p.id,
  p.created_at,
  case
    when f.follower_id is not null
      and (
        p.neighborhood = any(coalesce(pref.neighborhoods, '{}'::text[]))
        or p.property_type = any(coalesce(pref.property_types, '{}'::public.property_type[]))
      ) then 3
    when f.follower_id is not null then 2
    else 1
  end as relevance
from public.properties p
left join public.follows f
  on f.follower_id = (select auth.uid())
 and f.following_id = p.created_by
left join public.feed_preferences pref
  on pref.user_id = (select auth.uid())
where f.follower_id is not null
   or p.neighborhood = any(coalesce(pref.neighborhoods, '{}'::text[]))
   or p.property_type = any(coalesce(pref.property_types, '{}'::public.property_type[]));

comment on view public.feed_properties is
  'Explainable feed candidates: followed people plus explicit neighborhood/style matches.';

grant select on public.feed_properties to authenticated;
