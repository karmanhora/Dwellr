-- Milestone 0 — public profiles, one per auth user.
--
-- Access model:
--   * select: everyone (profiles are public by product design)
--   * insert: authenticated user, only for their own auth id
--   * update: authenticated user, only for their own auth id
--   * delete: not exposed to clients; the row is removed with the auth user
--
-- Every column here is user-owned profile data. No property facts are stored
-- in this milestone, so there is nothing here to mark as verified.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$'),
  constraint profiles_display_name_length check (
    display_name is null or char_length(btrim(display_name)) between 1 and 50
  ),
  constraint profiles_bio_length check (bio is null or char_length(bio) <= 160),
  constraint profiles_avatar_url_length check (avatar_url is null or char_length(avatar_url) <= 2048)
);

comment on table public.profiles is
  'Public profile for each auth user, created by trigger on sign-up.';

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles
  for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Privileges (RLS decides which rows; grants decide which verbs are allowed).
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- Sign-up trigger: mirrors the username and display name the client sent in
-- auth metadata into a profile row. It sanitises and de-duplicates the
-- username so a bad payload or a race can never block account creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_username text;
  candidate text;
  suffix integer := 0;
begin
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1), ''),
      '[^a-z0-9_]',
      '',
      'g'
    )
  );

  if length(base_username) < 3 then
    base_username := 'dwellr';
  end if;

  base_username := left(base_username, 20);
  candidate := base_username;

  loop
    begin
      insert into public.profiles (id, username, display_name)
      values (
        new.id,
        candidate,
        nullif(
          left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 50),
          ''
        )
      );
      exit;
    exception
      when unique_violation then
        suffix := suffix + 1;
        if suffix >= 100 then
          raise;
        end if;
        candidate := left(base_username, 20) || '_' || suffix::text;
    end;
  end loop;

  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the public profile row for every new auth.users row.';

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
