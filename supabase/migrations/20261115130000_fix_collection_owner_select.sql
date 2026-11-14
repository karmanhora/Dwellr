-- Fix collection creation visibility.
--
-- The membership row is created by an AFTER INSERT trigger, so it is not
-- visible to the SELECT policy during INSERT ... RETURNING in the same
-- statement. Keep owner_id as an explicit fallback; membership remains the
-- authority for everyone else.

drop policy if exists "Collections are visible to members or through a public link"
  on public.collections;

create policy "Collections are visible to owners, members, or through a public link"
  on public.collections
  for select
  using (
    owner_id = (select auth.uid())
    or is_public
    or public.is_collection_member(id, (select auth.uid()))
  );
