-- Milestone 2 — likes, comments, follows and blocking.
--
-- All social content is polymorphic at the database boundary:
--   social_target_type = property | post, plus target_id.
-- Property is the only resolvable target today; Milestone 3 adds posts and
-- only has to replace assert_social_target()'s post branch.
--
-- Counts are derived in security-invoker views over write-protected tables, so
-- a client can never forge a like or follower count.

create type public.social_target_type as enum ('property', 'post');

-- ---------------------------------------------------------------------------
-- Target integrity
-- ---------------------------------------------------------------------------

create or replace function public.assert_social_target(
  p_target_type public.social_target_type,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_target_type = 'property' then
    if not exists (select 1 from public.properties p where p.id = p_target_id) then
      raise exception 'That property does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return;
  end if;

  -- Milestone 3 replaces this branch with a posts lookup. Until then no client
  -- can create a dangling social row aimed at a future content type.
  raise exception 'Posts are not available yet.' using errcode = 'feature_not_supported';
end;
$$;

create or replace function public.social_target_owner(
  p_target_type public.social_target_type,
  p_target_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'property' then (select p.created_by from public.properties p where p.id = p_target_id)
    else null
  end;
$$;

-- ---------------------------------------------------------------------------
-- blocks
-- ---------------------------------------------------------------------------

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

comment on table public.blocks is
  'A user''s block list. Hidden in both directions; blocked users cannot comment on or follow the blocker.';

create index blocks_blocked_idx on public.blocks (blocked_id);

create or replace function public.is_blocked_between(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.blocks b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

-- ---------------------------------------------------------------------------
-- content_likes
-- ---------------------------------------------------------------------------

create table public.content_likes (
  user_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.social_target_type not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, target_type, target_id)
);

comment on table public.content_likes is
  'Likes on any social target. Counts are derived; clients can only add/remove their own row.';

create index content_likes_target_idx
  on public.content_likes (target_type, target_id, created_at desc);

create or replace function public.validate_content_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  perform public.assert_social_target(new.target_type, new.target_id);
  owner_id := public.social_target_owner(new.target_type, new.target_id);

  if owner_id is not null and public.is_blocked_between((select auth.uid()), owner_id) then
    raise exception 'You cannot interact with this content.' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger content_likes_validate
  before insert on public.content_likes
  for each row
  execute function public.validate_content_like();

create view public.content_like_counts
with (security_invoker = true) as
select target_type, target_id, count(*)::integer as like_count
from public.content_likes
group by target_type, target_id;

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  target_type public.social_target_type not null,
  target_id uuid not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  constraint comments_body_length check (
    (deleted_at is null and char_length(btrim(body)) between 1 and 1000)
    or deleted_at is not null
  )
);

comment on table public.comments is
  'User-generated comments and one-level replies. Soft-deleted comments remain as tombstones so threads do not collapse.';

create index comments_target_idx
  on public.comments (target_type, target_id, created_at asc, id asc);
create index comments_parent_idx on public.comments (parent_id);
create index comments_author_idx on public.comments (author_id, created_at desc);

create trigger comments_set_updated_at
  before update on public.comments
  for each row
  execute function public.set_updated_at();

create or replace function public.validate_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent public.comments;
  owner_id uuid;
  recent_count integer;
begin
  perform public.assert_social_target(new.target_type, new.target_id);

  if new.author_id <> (select auth.uid()) then
    raise exception 'You can only comment as yourself.' using errcode = 'insufficient_privilege';
  end if;

  owner_id := public.social_target_owner(new.target_type, new.target_id);
  if owner_id is not null and public.is_blocked_between(new.author_id, owner_id) then
    raise exception 'You cannot comment on this content.' using errcode = 'insufficient_privilege';
  end if;

  if new.parent_id is not null then
    select * into parent from public.comments c where c.id = new.parent_id;
    if not found then
      raise exception 'That reply target does not exist.' using errcode = 'foreign_key_violation';
    end if;
    if parent.target_type <> new.target_type or parent.target_id <> new.target_id then
      raise exception 'Replies must stay on the same content.' using errcode = 'check_violation';
    end if;
    if parent.parent_id is not null then
      raise exception 'Comments only nest one level deep.' using errcode = 'check_violation';
    end if;
  end if;

  -- PostgREST is directly callable, so the rate limit lives in the database.
  select count(*) into recent_count
  from public.comments c
  where c.author_id = new.author_id
    and c.created_at > now() - interval '1 minute';

  if recent_count >= 10 then
    raise exception 'You are commenting too quickly. Wait a minute and try again.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger comments_validate
  before insert on public.comments
  for each row
  execute function public.validate_comment();

create or replace function public.protect_comment_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  if old.deleted_at is not null then
    raise exception 'This comment is already deleted.' using errcode = 'check_violation';
  end if;

  if new.deleted_at is null then
    raise exception 'Comments are immutable; only deletion is allowed.' using errcode = 'check_violation';
  end if;

  if new.target_type is distinct from old.target_type
    or new.target_id is distinct from old.target_id
    or new.author_id is distinct from old.author_id
    or new.parent_id is distinct from old.parent_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Comment identity cannot be changed.' using errcode = 'check_violation';
  end if;

  owner_id := public.social_target_owner(old.target_type, old.target_id);
  if (select auth.uid()) is null
    or ((select auth.uid()) <> old.author_id and (select auth.uid()) <> owner_id) then
    raise exception 'Only the author or the content owner can delete this comment.'
      using errcode = 'insufficient_privilege';
  end if;

  new.body := '';
  new.deleted_by := (select auth.uid());
  new.updated_at := now();
  return new;
end;
$$;

create trigger comments_protect_update
  before update on public.comments
  for each row
  execute function public.protect_comment_update();

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_not_self check (follower_id <> following_id)
);

create index follows_following_idx on public.follows (following_id, created_at desc);

create or replace function public.validate_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'You cannot follow this account.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger follows_validate
  before insert on public.follows
  for each row
  execute function public.validate_follow();

create view public.profile_follow_counts
with (security_invoker = true) as
select
  p.id as user_id,
  (select count(*)::integer from public.follows f where f.following_id = p.id) as follower_count,
  (select count(*)::integer from public.follows f where f.follower_id = p.id) as following_count
from public.profiles p;

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.blocks from anon, authenticated;
revoke all on public.content_likes from anon, authenticated;
revoke all on public.comments from anon, authenticated;
revoke all on public.follows from anon, authenticated;

revoke truncate, references, trigger on public.blocks from anon, authenticated;
revoke truncate, references, trigger on public.content_likes from anon, authenticated;
revoke truncate, references, trigger on public.comments from anon, authenticated;
revoke truncate, references, trigger on public.follows from anon, authenticated;

grant select, insert, delete on public.blocks to authenticated;

grant select on public.content_likes to anon, authenticated;
grant insert, delete on public.content_likes to authenticated;

grant select on public.comments to anon, authenticated;
grant insert on public.comments to authenticated;
grant update (deleted_at, deleted_by) on public.comments to authenticated;

grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;

grant select on public.content_like_counts to anon, authenticated;
grant select on public.profile_follow_counts to anon, authenticated;

revoke all on function public.assert_social_target(public.social_target_type, uuid) from public;
revoke all on function public.social_target_owner(public.social_target_type, uuid) from public;
grant execute on function public.social_target_owner(public.social_target_type, uuid) to authenticated;
grant execute on function public.is_blocked_between(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.blocks enable row level security;
alter table public.content_likes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;

create policy "Users read their own block list"
  on public.blocks
  for select
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users block for themselves"
  on public.blocks
  for insert
  to authenticated
  with check (blocker_id = (select auth.uid()));

create policy "Users unblock their own blocks"
  on public.blocks
  for delete
  to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Likes are public"
  on public.content_likes
  for select
  using (true);

create policy "Users like as themselves"
  on public.content_likes
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove their own likes"
  on public.content_likes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Comments are public except across a block"
  on public.comments
  for select
  using (not public.is_blocked_between((select auth.uid()), author_id));

create policy "Users comment as themselves"
  on public.comments
  for insert
  to authenticated
  with check (author_id = (select auth.uid()));

create policy "Authors and content owners soft-delete comments"
  on public.comments
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    or public.social_target_owner(target_type, target_id) = (select auth.uid())
  )
  with check (
    author_id = (select auth.uid())
    or public.social_target_owner(target_type, target_id) = (select auth.uid())
  );

create policy "Follows are public except across a block"
  on public.follows
  for select
  using (
    not public.is_blocked_between((select auth.uid()), follower_id)
    and not public.is_blocked_between((select auth.uid()), following_id)
  );

create policy "Users follow as themselves"
  on public.follows
  for insert
  to authenticated
  with check (follower_id = (select auth.uid()));

create policy "Users unfollow as themselves"
  on public.follows
  for delete
  to authenticated
  using (follower_id = (select auth.uid()));

-- Blocked accounts disappear from profiles and properties in both directions.
-- Anonymous readers have no blocks, so public discovery is unchanged for them.
drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are readable except across a block"
  on public.profiles
  for select
  using (not public.is_blocked_between((select auth.uid()), id));

drop policy if exists "Properties are publicly readable" on public.properties;
create policy "Properties are readable except across a block"
  on public.properties
  for select
  using (not public.is_blocked_between((select auth.uid()), created_by));
