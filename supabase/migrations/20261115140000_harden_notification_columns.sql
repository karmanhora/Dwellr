-- actor_ids is internal collapse state used by the notification triggers.
-- The original table-level SELECT grant exposed it despite the column list in
-- the migration comment. Replace it with an explicit client column grant.

revoke select on public.notifications from authenticated;

grant select (
  id,
  user_id,
  actor_id,
  type,
  target_type,
  target_id,
  comment_id,
  collection_id,
  actor_count,
  read_at,
  created_at
) on public.notifications to authenticated;
