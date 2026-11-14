-- Milestone 2 — collaborative collections.
--
-- Collections move from one owner to a membership model:
--   * owner  — manages the collection, members and invites
--   * editor — adds/removes homes and writes their own evaluations
--   * viewer — reads everything and writes nothing
--
-- Invite tokens are generated in the server action and only their SHA-256 hash
-- is stored. The accept/decline RPCs are security definer because the invitee
-- is not yet a member and therefore cannot see the collection through RLS.
--
-- Every table revokes Supabase's default ALL grant, then grants the minimum.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.collection_role as enum ('owner', 'editor', 'viewer');

create type public.collection_activity_action as enum (
  'member_joined',
  'member_left',
  'member_removed',
  'item_added',
  'item_removed',
  'evaluation_saved'
);

-- ---------------------------------------------------------------------------
-- collection_members
-- ---------------------------------------------------------------------------

create table public.collection_members (
  collection_id uuid not null references public.collections (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.collection_role not null default 'viewer',
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  primary key (collection_id, user_id)
);

comment on table public.collection_members is
  'Collection membership and role. Private collections are visible only to members; public collections are readable by anyone.';

create index collection_members_user_idx
  on public.collection_members (user_id, joined_at desc);

-- Existing collections predate membership: give every owner an explicit row.
insert into public.collection_members (collection_id, user_id, role)
select id, owner_id, 'owner'
from public.collections
on conflict (collection_id, user_id) do nothing;

-- New collections get their owner membership automatically.
create or replace function public.add_collection_owner_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.collection_members (collection_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (collection_id, user_id) do nothing;
  return new;
end;
$$;

create trigger collections_add_owner_member
  after insert on public.collections
  for each row
  execute function public.add_collection_owner_member();

-- The collection owner is the only owner. Ownership transfer is deliberately
-- not part of this milestone, so owner_id is immutable and the owner row cannot
-- be removed or demoted.
create or replace function public.protect_collection_ownership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  collection_owner uuid;
begin
  -- A cascading collection delete removes the parent first; let its child rows
  -- disappear without treating that as an owner demotion or removal.
  if tg_table_name = 'collection_members'
    and tg_op = 'DELETE'
    and not exists (select 1 from public.collections c where c.id = old.collection_id) then
    return old;
  end if;

  if tg_table_name = 'collections' then
    if new.owner_id is distinct from old.owner_id then
      raise exception 'Collection ownership cannot be transferred yet.'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    select c.owner_id into collection_owner
    from public.collections c
    where c.id = new.collection_id;

    if collection_owner is null then
      raise exception 'The collection does not exist.' using errcode = 'foreign_key_violation';
    end if;

    if new.role = 'owner' and new.user_id <> collection_owner then
      raise exception 'Only the collection creator can hold the owner role.'
        using errcode = 'check_violation';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id
      or new.collection_id is distinct from old.collection_id then
      raise exception 'A member''s identity cannot be changed.'
        using errcode = 'check_violation';
    end if;
  end if;

  if old.role = 'owner' then
    if tg_op = 'DELETE' then
      raise exception 'The collection owner cannot be removed.'
        using errcode = 'check_violation';
    end if;

    if new.role <> 'owner' then
      raise exception 'The collection owner role cannot be changed.'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

create trigger collections_protect_ownership
  before update of owner_id on public.collections
  for each row
  execute function public.protect_collection_ownership();

create trigger collection_members_protect_ownership
  before insert or update or delete on public.collection_members
  for each row
  execute function public.protect_collection_ownership();

-- Security-definer helpers keep policies from recursively selecting the
-- membership table they are protecting.
create or replace function public.is_collection_member(
  p_collection_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.collection_members m
    where m.collection_id = p_collection_id
      and m.user_id = p_user_id
  );
$$;

create or replace function public.collection_role_for(
  p_collection_id uuid,
  p_user_id uuid
)
returns public.collection_role
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.collection_members m
  where m.collection_id = p_collection_id
    and m.user_id = p_user_id;
$$;

-- ---------------------------------------------------------------------------
-- collection_invites
-- ---------------------------------------------------------------------------

create table public.collection_invites (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections (id) on delete cascade,
  invited_by uuid not null references public.profiles (id) on delete cascade,
  invitee_id uuid references public.profiles (id) on delete cascade,
  role public.collection_role not null default 'viewer',
  -- SHA-256 hex. The plaintext token is only ever in the invite URL.
  token_hash text not null unique,
  max_uses smallint not null default 1,
  use_count smallint not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now(),
  constraint collection_invites_role check (role in ('editor', 'viewer')),
  constraint collection_invites_token_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint collection_invites_uses check (max_uses between 1 and 50 and use_count >= 0 and use_count <= max_uses),
  constraint collection_invites_expiry check (expires_at > created_at)
);

comment on table public.collection_invites is
  'Hashed, revocable, expiring collection invites. token_hash is never granted to clients.';

create index collection_invites_collection_idx
  on public.collection_invites (collection_id, created_at desc);
create index collection_invites_invitee_idx
  on public.collection_invites (invitee_id, created_at desc)
  where invitee_id is not null;

create or replace function public.accept_collection_invite(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.collection_invites;
  current_user_id uuid := (select auth.uid());
  inserted_rows integer := 0;
begin
  if current_user_id is null then
    raise exception 'Sign in to accept this invite.' using errcode = 'insufficient_privilege';
  end if;

  select *
  into invite
  from public.collection_invites i
  where i.token_hash = p_token_hash
  for update;

  if not found
    or invite.revoked_at is not null
    or invite.declined_at is not null
    or invite.expires_at <= now()
    or invite.use_count >= invite.max_uses then
    raise exception 'This invite is no longer valid.' using errcode = 'check_violation';
  end if;

  if invite.invitee_id is not null and invite.invitee_id <> current_user_id then
    raise exception 'This invite is for a different account.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.collection_members (collection_id, user_id, role, invited_by)
  values (invite.collection_id, current_user_id, invite.role, invite.invited_by)
  on conflict (collection_id, user_id) do nothing;

  get diagnostics inserted_rows = row_count;

  if inserted_rows > 0 then
    update public.collection_invites
    set use_count = use_count + 1
    where id = invite.id;
  end if;

  return invite.collection_id;
end;
$$;

-- Username invites do not expose a link token to the invitee. The invitee can
-- accept their own named invite by id; the row's invitee_id is the authorization.
create or replace function public.accept_collection_invite_by_id(p_invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invite public.collection_invites;
  current_user_id uuid := (select auth.uid());
  already_member boolean;
begin
  if current_user_id is null then
    raise exception 'Sign in to accept this invite.' using errcode = 'insufficient_privilege';
  end if;

  select *
  into invite
  from public.collection_invites i
  where i.id = p_invite_id
  for update;

  if not found
    or invite.invitee_id is distinct from current_user_id
    or invite.revoked_at is not null
    or invite.declined_at is not null
    or invite.expires_at <= now()
    or invite.use_count >= invite.max_uses then
    raise exception 'This invite is no longer valid.' using errcode = 'check_violation';
  end if;

  select exists (
    select 1 from public.collection_members m
    where m.collection_id = invite.collection_id and m.user_id = current_user_id
  ) into already_member;

  if already_member then
    raise exception 'You are already a member of this collection.' using errcode = 'check_violation';
  end if;

  insert into public.collection_members (collection_id, user_id, role, invited_by)
  values (invite.collection_id, current_user_id, invite.role, invite.invited_by);

  update public.collection_invites
  set use_count = use_count + 1
  where id = invite.id;

  return invite.collection_id;
end;
$$;

create or replace function public.decline_collection_invite_by_id(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Sign in to decline this invite.' using errcode = 'insufficient_privilege';
  end if;

  update public.collection_invites
  set declined_at = now()
  where id = p_invite_id
    and invitee_id = current_user_id
    and declined_at is null
    and revoked_at is null
    and use_count = 0;
end;
$$;

create or replace function public.decline_collection_invite(p_token_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Sign in to decline this invite.' using errcode = 'insufficient_privilege';
  end if;

  update public.collection_invites
  set declined_at = now()
  where token_hash = p_token_hash
    and invitee_id = current_user_id
    and declined_at is null
    and revoked_at is null
    and use_count = 0;
end;
$$;

create or replace function public.protect_collection_invite_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if new.collection_id is distinct from old.collection_id
    or new.invited_by is distinct from old.invited_by
    or new.invitee_id is distinct from old.invitee_id
    or new.role is distinct from old.role
    or new.token_hash is distinct from old.token_hash
    or new.max_uses is distinct from old.max_uses
    or new.expires_at is distinct from old.expires_at
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the invite status can be changed.' using errcode = 'check_violation';
  end if;

  if new.declined_at is distinct from old.declined_at and current_user_id is distinct from old.invitee_id then
    raise exception 'Only the invitee can decline this invite.' using errcode = 'insufficient_privilege';
  end if;

  if new.revoked_at is distinct from old.revoked_at then
    if not exists (
      select 1 from public.collections c
      where c.id = old.collection_id and c.owner_id = current_user_id
    ) then
      raise exception 'Only the collection owner can revoke an invite.' using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

create trigger collection_invites_protect_update
  before update on public.collection_invites
  for each row
  execute function public.protect_collection_invite_update();

-- ---------------------------------------------------------------------------
-- collection_item_evaluations
-- ---------------------------------------------------------------------------

create table public.collection_item_evaluations (
  collection_id uuid not null,
  property_id uuid not null,
  user_id uuid not null,
  rating smallint not null,
  note text,
  pros text[] not null default '{}',
  cons text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection_id, property_id, user_id),
  foreign key (collection_id, property_id)
    references public.collection_items (collection_id, property_id) on delete cascade,
  foreign key (collection_id, user_id)
    references public.collection_members (collection_id, user_id) on delete cascade,
  constraint collection_evaluations_rating check (rating between 1 and 5),
  constraint collection_evaluations_note_length check (note is null or char_length(note) <= 500),
  constraint collection_evaluations_pros_count check (cardinality(pros) <= 6),
  constraint collection_evaluations_cons_count check (cardinality(cons) <= 6)
);

comment on table public.collection_item_evaluations is
  'A member''s private-to-the-collection rating, note, pros and cons for one home. Never a property fact.';

create index collection_evaluations_property_idx
  on public.collection_item_evaluations (property_id, collection_id);

create trigger collection_evaluations_set_updated_at
  before update on public.collection_item_evaluations
  for each row
  execute function public.set_updated_at();

create or replace function public.validate_evaluation_tags()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tag text;
begin
  foreach tag in array new.pros loop
    if char_length(btrim(tag)) not between 1 and 40 then
      raise exception 'Pros tags must be 1–40 characters.' using errcode = 'check_violation';
    end if;
  end loop;

  foreach tag in array new.cons loop
    if char_length(btrim(tag)) not between 1 and 40 then
      raise exception 'Cons tags must be 1–40 characters.' using errcode = 'check_violation';
    end if;
  end loop;

  return new;
end;
$$;

create trigger collection_evaluations_validate_tags
  before insert or update of pros, cons on public.collection_item_evaluations
  for each row
  execute function public.validate_evaluation_tags();

-- ---------------------------------------------------------------------------
-- collection_activity
-- ---------------------------------------------------------------------------

create table public.collection_activity (
  id bigint generated always as identity primary key,
  collection_id uuid not null references public.collections (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action public.collection_activity_action not null,
  property_id uuid references public.properties (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.collection_activity is
  'Append-only trail of collection membership, home and evaluation changes. Written by triggers.';

create index collection_activity_collection_idx
  on public.collection_activity (collection_id, created_at desc, id desc);

create or replace function public.log_collection_member_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  activity_collection uuid := case when tg_op = 'INSERT' then new.collection_id else old.collection_id end;
begin
  if not exists (select 1 from public.collections c where c.id = activity_collection) then
    return null;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'owner' then return null; end if;
    insert into public.collection_activity (collection_id, actor_id, action, target_user_id)
    values (new.collection_id, coalesce(actor, new.user_id), 'member_joined', new.user_id);
    return null;
  end if;

  insert into public.collection_activity (collection_id, actor_id, action, target_user_id)
  values (old.collection_id, coalesce(actor, old.user_id), 'member_left', old.user_id);
  return null;
end;
$$;

create trigger collection_members_log_activity
  after insert or delete on public.collection_members
  for each row
  execute function public.log_collection_member_activity();

create or replace function public.log_collection_item_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  activity_collection uuid := case when tg_op = 'INSERT' then new.collection_id else old.collection_id end;
  activity_property uuid := case when tg_op = 'INSERT' then new.property_id else old.property_id end;
begin
  if not exists (select 1 from public.collections c where c.id = activity_collection) then
    return null;
  end if;

  if not exists (select 1 from public.properties p where p.id = activity_property) then
    activity_property := null;
  end if;

  insert into public.collection_activity (collection_id, actor_id, action, property_id)
  values (
    activity_collection,
    (select auth.uid()),
    (case when tg_op = 'INSERT' then 'item_added' else 'item_removed' end)::public.collection_activity_action,
    activity_property
  );
  return null;
end;
$$;

create trigger collection_items_log_activity
  after insert or delete on public.collection_items
  for each row
  execute function public.log_collection_item_activity();

create or replace function public.log_collection_evaluation_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.collection_activity (collection_id, actor_id, action, property_id)
  values (new.collection_id, new.user_id, 'evaluation_saved', new.property_id);
  return null;
end;
$$;

create trigger collection_evaluations_log_activity
  after insert or update on public.collection_item_evaluations
  for each row
  execute function public.log_collection_evaluation_activity();

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.collection_members from anon, authenticated;
revoke all on public.collection_invites from anon, authenticated;
revoke all on public.collection_item_evaluations from anon, authenticated;
revoke all on public.collection_activity from anon, authenticated;

revoke truncate, references, trigger on public.collection_members from anon, authenticated;
revoke truncate, references, trigger on public.collection_invites from anon, authenticated;
revoke truncate, references, trigger on public.collection_item_evaluations from anon, authenticated;
revoke truncate, references, trigger on public.collection_activity from anon, authenticated;

grant select on public.collection_members to anon, authenticated;
grant insert, update, delete on public.collection_members to authenticated;

-- token_hash is deliberately absent from the readable column list.
grant select (
  id, collection_id, invited_by, invitee_id, role, max_uses, use_count,
  expires_at, revoked_at, declined_at, created_at
) on public.collection_invites to authenticated;
grant insert on public.collection_invites to authenticated;
grant update (revoked_at, declined_at) on public.collection_invites to authenticated;

grant select on public.collection_item_evaluations to anon, authenticated;
grant insert, update, delete on public.collection_item_evaluations to authenticated;

grant select on public.collection_activity to authenticated;

revoke all on function public.accept_collection_invite(text) from public, anon;
revoke all on function public.decline_collection_invite(text) from public, anon;
revoke all on function public.accept_collection_invite_by_id(uuid) from public, anon;
revoke all on function public.decline_collection_invite_by_id(uuid) from public, anon;
grant execute on function public.accept_collection_invite(text) to authenticated;
grant execute on function public.decline_collection_invite(text) to authenticated;
grant execute on function public.accept_collection_invite_by_id(uuid) to authenticated;
grant execute on function public.decline_collection_invite_by_id(uuid) to authenticated;

grant execute on function public.is_collection_member(uuid, uuid) to anon, authenticated;
grant execute on function public.collection_role_for(uuid, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS: collections and items
-- ---------------------------------------------------------------------------

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;
alter table public.collection_members enable row level security;
alter table public.collection_invites enable row level security;
alter table public.collection_item_evaluations enable row level security;
alter table public.collection_activity enable row level security;

drop policy if exists "Public collections are readable, owners see their own" on public.collections;
create policy "Collections are visible to members or through a public link"
  on public.collections
  for select
  using (
    is_public
    or public.is_collection_member(id, (select auth.uid()))
  );

drop policy if exists "Items of public or owned collections are readable" on public.collection_items;
create policy "Items of public collections are readable, private items are member-only"
  on public.collection_items
  for select
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.is_public
    )
    or public.is_collection_member(collection_id, (select auth.uid()))
  );

drop policy if exists "Owners add homes to their own collections" on public.collection_items;
create policy "Owners and editors add homes"
  on public.collection_items
  for insert
  to authenticated
  with check (
    added_by = (select auth.uid())
    and public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor')
  );

drop policy if exists "Owners update items in their own collections" on public.collection_items;
create policy "Owners and editors update items"
  on public.collection_items
  for update
  to authenticated
  using (public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor'))
  with check (public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor'));

drop policy if exists "Owners remove items from their own collections" on public.collection_items;
create policy "Owners and editors remove items"
  on public.collection_items
  for delete
  to authenticated
  using (public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor'));

-- ---------------------------------------------------------------------------
-- RLS: members
-- ---------------------------------------------------------------------------

create policy "Members of public collections are readable, private members are member-only"
  on public.collection_members
  for select
  using (
    exists (select 1 from public.collections c where c.id = collection_id and c.is_public)
    or public.is_collection_member(collection_id, (select auth.uid()))
  );

create policy "Owners add members"
  on public.collection_members
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners change member roles"
  on public.collection_members
  for update
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners remove members and members can leave"
  on public.collection_members
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
    or (user_id = (select auth.uid()) and role <> 'owner')
  );

-- ---------------------------------------------------------------------------
-- RLS: invites
-- ---------------------------------------------------------------------------

create policy "Owners and invitees read invites"
  on public.collection_invites
  for select
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners create invites"
  on public.collection_invites
  for insert
  to authenticated
  with check (
    invited_by = (select auth.uid())
    and exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners revoke invites and invitees decline them"
  on public.collection_invites
  for update
  to authenticated
  using (
    invitee_id = (select auth.uid())
    or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    invitee_id = (select auth.uid())
    or exists (
      select 1 from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: evaluations and activity
-- ---------------------------------------------------------------------------

create policy "Collection evaluations are readable with the collection"
  on public.collection_item_evaluations
  for select
  using (
    exists (select 1 from public.collections c where c.id = collection_id and c.is_public)
    or public.is_collection_member(collection_id, (select auth.uid()))
  );

create policy "Members write only their own evaluation"
  on public.collection_item_evaluations
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor')
    and exists (
      select 1 from public.collection_items i
      where i.collection_id = collection_id and i.property_id = property_id
    )
  );

create policy "Members update only their own evaluation"
  on public.collection_item_evaluations
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor')
  )
  with check (
    user_id = (select auth.uid())
    and public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor')
  );

create policy "Members delete only their own evaluation"
  on public.collection_item_evaluations
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and public.collection_role_for(collection_id, (select auth.uid())) in ('owner', 'editor')
  );

create policy "Collection activity is member-only"
  on public.collection_activity
  for select
  to authenticated
  using (public.is_collection_member(collection_id, (select auth.uid())));
