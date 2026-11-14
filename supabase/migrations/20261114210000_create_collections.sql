-- Milestone 2A — private saves and shareable collections.
--
-- Design notes:
--   * Saving a home is a private bookmark (`property_saves`). It is never
--     public and never changes a property's facts or provenance.
--   * Collections are named lists owned by one person. They are private by
--     default; an owner can publish one and share its slug. Membership is
--     owner-curated in this milestone (collaboration comes later).
--   * Share slugs are generated server-side (12 lowercase alphanumerics) and
--     are not guessable enough to replace the RLS check.
--   * Supabase grants ALL on new public tables by default, so every table
--     below revokes first and then grants the minimum.

-- ---------------------------------------------------------------------------
-- collections
-- ---------------------------------------------------------------------------

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  description text,
  is_public boolean not null default false,
  share_slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint collections_name_length check (char_length(btrim(name)) between 1 and 60),
  constraint collections_description_length check (
    description is null or char_length(description) <= 500
  ),
  constraint collections_share_slug_format check (share_slug ~ '^[a-z0-9]{12}$')
);

comment on table public.collections is
  'Owner-curated lists of homes. Private by default; public collections are readable by anyone with the slug.';

create unique index collections_owner_name_idx
  on public.collections (owner_id, lower(btrim(name)));
create index collections_owner_created_idx
  on public.collections (owner_id, created_at desc);
create index collections_public_idx
  on public.collections (created_at desc)
  where is_public;

create trigger collections_set_updated_at
  before update on public.collections
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- collection_items
-- ---------------------------------------------------------------------------

create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  added_by uuid not null references public.profiles (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  primary key (collection_id, property_id),
  constraint collection_items_note_length check (note is null or char_length(note) <= 500)
);

comment on column public.collection_items.note is
  'The owner''s private note about this home in this collection. Never treated as a property fact.';

create index collection_items_property_idx on public.collection_items (property_id);

-- Hard limit of 100 homes per collection.
create or replace function public.enforce_collection_item_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.collection_items where collection_id = new.collection_id) >= 100 then
    raise exception 'A collection can hold at most 100 homes.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger collection_items_enforce_limit
  before insert on public.collection_items
  for each row
  execute function public.enforce_collection_item_limit();

-- ---------------------------------------------------------------------------
-- property_saves
-- ---------------------------------------------------------------------------

create table public.property_saves (
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);

comment on table public.property_saves is
  'Private bookmarks. Only the saver can read, add or remove their own rows.';

create index property_saves_user_idx on public.property_saves (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.collections from anon;
revoke all on public.collection_items from anon;
revoke all on public.property_saves from anon, authenticated;

revoke truncate, references, trigger on public.collections from anon, authenticated;
revoke truncate, references, trigger on public.collection_items from anon, authenticated;
revoke truncate, references, trigger on public.property_saves from anon, authenticated;

grant select on public.collections to anon, authenticated;
grant insert, update, delete on public.collections to authenticated;

grant select on public.collection_items to anon, authenticated;
grant insert, update, delete on public.collection_items to authenticated;

grant select, insert, delete on public.property_saves to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: collections
-- ---------------------------------------------------------------------------

alter table public.collections enable row level security;

create policy "Public collections are readable, owners see their own"
  on public.collections
  for select
  using (is_public or owner_id = (select auth.uid()));

create policy "Users create their own collections"
  on public.collections
  for insert
  to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update their own collections"
  on public.collections
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "Owners delete their own collections"
  on public.collections
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: collection_items
-- ---------------------------------------------------------------------------

alter table public.collection_items enable row level security;

create policy "Items of public or owned collections are readable"
  on public.collection_items
  for select
  using (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id
        and (c.is_public or c.owner_id = (select auth.uid()))
    )
  );

create policy "Owners add homes to their own collections"
  on public.collection_items
  for insert
  to authenticated
  with check (
    added_by = (select auth.uid())
    and exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners update items in their own collections"
  on public.collection_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

create policy "Owners remove items from their own collections"
  on public.collection_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.collections c
      where c.id = collection_id and c.owner_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: property_saves
-- ---------------------------------------------------------------------------

alter table public.property_saves enable row level security;

create policy "Users read their own saves"
  on public.property_saves
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users save homes for themselves"
  on public.property_saves
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users remove their own saves"
  on public.property_saves
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
