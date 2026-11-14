-- Milestone 1 hardening, found during live schema verification.
--
-- 1. Supabase's default privileges grant ALL on new public tables to anon and
--    authenticated. That made the column-level SELECT grant on
--    property_field_provenance ineffective: clients could still read
--    source_ref, which names the verifying integration. Revoke the table-level
--    privileges first, then grant only what each role actually needs.
-- 2. A photo row's storage_path was only format-checked, not checked against
--    the property owner. A signed-in user could attach another account's
--    object path to their own post. The app checks the prefix, but PostgREST is
--    directly callable, so the database has to enforce it too.

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.properties from anon;
revoke all on public.property_photos from anon;
revoke all on public.property_field_provenance from anon, authenticated;

revoke truncate, references, trigger on public.properties from anon, authenticated;
revoke truncate, references, trigger on public.property_photos from anon, authenticated;

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;

grant select on public.property_photos to anon, authenticated;
grant insert, update, delete on public.property_photos to authenticated;

-- Provenance stays read-only for every client role, and source_ref stays out
-- of the readable column list. Service-role integrations bypass grants.
grant select (property_id, field, provenance, verified_at)
  on public.property_field_provenance
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Photos must live under the property owner's prefix
-- ---------------------------------------------------------------------------

create or replace function public.enforce_property_photo_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
begin
  select p.created_by into owner_id
  from public.properties p
  where p.id = new.property_id;

  if owner_id is null then
    raise exception 'The property does not exist.' using errcode = 'foreign_key_violation';
  end if;

  if split_part(new.storage_path, '/', 1) <> owner_id::text then
    raise exception 'A photo path must start with the property owner''s id.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.enforce_property_photo_owner() is
  'Rejects photo rows whose storage path is not under the property owner''s user id.';

drop trigger if exists property_photos_enforce_owner on public.property_photos;

create trigger property_photos_enforce_owner
  before insert or update of storage_path, property_id on public.property_photos
  for each row
  execute function public.enforce_property_photo_owner();
