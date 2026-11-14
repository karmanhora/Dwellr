-- Milestone 2 — notifications and trust & safety basics.
--
-- Notifications are written only by security-definer triggers. Clients have
-- SELECT and a column-level UPDATE on read_at; there is no INSERT or DELETE
-- grant or policy, so a browser cannot forge activity.
--
-- Repeated likes on the same target collapse into one unread notification
-- with an actor list and count. A partial unique index makes the collapse
-- race-safe.

create type public.report_target_type as enum ('property', 'post', 'comment', 'profile');
create type public.report_reason as enum (
  'spam',
  'harassment',
  'false_information',
  'inappropriate',
  'other'
);
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create type public.notification_type as enum (
  'collection_invite',
  'collection_activity',
  'comment',
  'like',
  'follow'
);

-- ---------------------------------------------------------------------------
-- reports
-- ---------------------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason public.report_reason not null,
  details text,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint reports_details_length check (details is null or char_length(details) <= 1000),
  constraint reports_resolution check (
    (status in ('open', 'reviewing') and resolved_at is null)
    or (status in ('resolved', 'dismissed') and resolved_at is not null)
  )
);

comment on table public.reports is
  'User reports. Reporters can read only their own rows; moderation is server-side.';

create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_queue_idx on public.reports (status, created_at asc);

create or replace function public.validate_report_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'property' then
    if not exists (select 1 from public.properties p where p.id = new.target_id) then
      raise exception 'That property does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  if new.target_type = 'comment' then
    if not exists (select 1 from public.comments c where c.id = new.target_id) then
      raise exception 'That comment does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  if new.target_type = 'profile' then
    if not exists (select 1 from public.profiles p where p.id = new.target_id) then
      raise exception 'That profile does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  raise exception 'Posts are not available yet.' using errcode = 'feature_not_supported';
end;
$$;

create trigger reports_validate_target
  before insert on public.reports
  for each row
  execute function public.validate_report_target();

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type public.notification_type not null,
  target_type public.social_target_type,
  target_id uuid,
  comment_id uuid references public.comments (id) on delete cascade,
  collection_id uuid references public.collections (id) on delete cascade,
  actor_ids uuid[] not null default '{}',
  actor_count integer not null default 1,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_payload check (
    (type = 'collection_invite' and collection_id is not null)
    or (type = 'collection_activity' and collection_id is not null)
    or (type in ('comment', 'like') and target_type is not null and target_id is not null)
    or (type = 'follow' and actor_id is not null)
  ),
  constraint notifications_actor_count check (actor_count >= 1)
);

comment on table public.notifications is
  'Trigger-written notifications. actor_ids is internal collapse state and is not granted to clients.';

create index notifications_user_idx
  on public.notifications (user_id, created_at desc, id desc);

-- Polymorphic target columns cannot carry a foreign key, so property and
-- comment deletion clean up their social rows explicitly.
create or replace function public.cleanup_property_social_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.content_likes
  where target_type = 'property' and target_id = old.id;
  delete from public.comments
  where target_type = 'property' and target_id = old.id;
  delete from public.reports
  where target_type = 'property' and target_id = old.id;
  delete from public.notifications
  where target_type = 'property' and target_id = old.id;
  return old;
end;
$$;

create trigger properties_cleanup_social_rows
  after delete on public.properties
  for each row
  execute function public.cleanup_property_social_rows();

create or replace function public.cleanup_comment_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reports
  where target_type = 'comment' and target_id = old.id;
  return old;
end;
$$;

create trigger comments_cleanup_reports
  after delete on public.comments
  for each row
  execute function public.cleanup_comment_reports();
create index notifications_unread_idx
  on public.notifications (user_id, read_at)
  where read_at is null;

-- One unread like notification per target; further likes update it.
create unique index notifications_unread_like_idx
  on public.notifications (user_id, target_type, target_id)
  where type = 'like' and read_at is null;

create or replace function public.notify_collection_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.invitee_id is not null and new.invitee_id <> new.invited_by then
    insert into public.notifications (user_id, actor_id, type, collection_id)
    values (new.invitee_id, new.invited_by, 'collection_invite', new.collection_id);
  end if;
  return new;
end;
$$;

create trigger collection_invites_notify
  after insert on public.collection_invites
  for each row
  execute function public.notify_collection_invite();

create or replace function public.notify_collection_member_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := coalesce((select auth.uid()), new.user_id);
begin
  if new.role = 'owner' then return null; end if;

  insert into public.notifications (user_id, actor_id, type, collection_id)
  select m.user_id, actor, 'collection_activity', new.collection_id
  from public.collection_members m
  where m.collection_id = new.collection_id
    and m.user_id <> new.user_id
    and m.user_id <> actor;
  return null;
end;
$$;

create trigger collection_members_notify
  after insert on public.collection_members
  for each row
  execute function public.notify_collection_member_activity();

create or replace function public.notify_collection_item_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
begin
  insert into public.notifications (user_id, actor_id, type, collection_id)
  select m.user_id, actor, 'collection_activity', new.collection_id
  from public.collection_members m
  where m.collection_id = new.collection_id
    and m.user_id <> actor;
  return null;
end;
$$;

create trigger collection_items_notify
  after insert on public.collection_items
  for each row
  execute function public.notify_collection_item_activity();

create or replace function public.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := public.social_target_owner(new.target_type, new.target_id);
  parent_author uuid;
begin
  if owner_id is not null and owner_id <> new.author_id then
    insert into public.notifications (user_id, actor_id, type, target_type, target_id, comment_id)
    values (owner_id, new.author_id, 'comment', new.target_type, new.target_id, new.id);
  end if;

  if new.parent_id is not null then
    select c.author_id into parent_author from public.comments c where c.id = new.parent_id;
    if parent_author is not null and parent_author <> new.author_id and parent_author <> owner_id then
      insert into public.notifications (user_id, actor_id, type, target_type, target_id, comment_id)
      values (parent_author, new.author_id, 'comment', new.target_type, new.target_id, new.id);
    end if;
  end if;

  return new;
end;
$$;

create trigger comments_notify
  after insert on public.comments
  for each row
  execute function public.notify_comment();

create or replace function public.notify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid := public.social_target_owner(new.target_type, new.target_id);
  actor uuid := new.user_id;
begin
  if owner_id is null or owner_id = actor then return new; end if;

  insert into public.notifications (
    user_id, actor_id, type, target_type, target_id, actor_ids, actor_count
  )
  values (
    owner_id, actor, 'like', new.target_type, new.target_id,
    array[actor], 1
  )
  on conflict (user_id, target_type, target_id)
    where type = 'like' and read_at is null
  do update set
    actor_id = excluded.actor_id,
    actor_ids = case
      when actor = any(public.notifications.actor_ids) then public.notifications.actor_ids
      else array_append(public.notifications.actor_ids, actor)
    end,
    actor_count = case
      when actor = any(public.notifications.actor_ids) then public.notifications.actor_count
      else public.notifications.actor_count + 1
    end,
    created_at = now();

  return new;
end;
$$;

create trigger content_likes_notify
  after insert on public.content_likes
  for each row
  execute function public.notify_like();

create or replace function public.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (user_id, actor_id, type)
  values (new.following_id, new.follower_id, 'follow');
  return new;
end;
$$;

create trigger follows_notify
  after insert on public.follows
  for each row
  execute function public.notify_follow();

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.reports from anon, authenticated;
revoke all on public.notifications from anon, authenticated;

revoke truncate, references, trigger on public.reports from anon, authenticated;
revoke truncate, references, trigger on public.notifications from anon, authenticated;

grant select, insert on public.reports to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke all on function public.validate_report_target() from public;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.reports enable row level security;
alter table public.notifications enable row level security;

create policy "Reporters read their own reports"
  on public.reports
  for select
  to authenticated
  using (reporter_id = (select auth.uid()));

create policy "Users create their own reports"
  on public.reports
  for insert
  to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Users read their own notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users mark their own notifications read"
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
