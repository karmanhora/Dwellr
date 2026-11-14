-- Named invites are visible to the invitee, but the private collection they
-- point at is not. The notifications page needs only enough metadata to render
-- an accept button, so return it through a narrow security-definer RPC rather
-- than widening the collections SELECT policy (which would also risk policy
-- recursion between collections and collection_invites).

create or replace function public.get_my_pending_invites()
returns table (
  id uuid,
  collection_name text,
  collection_slug text,
  role public.collection_role,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select i.id, c.name, c.share_slug, i.role, i.expires_at
  from public.collection_invites i
  join public.collections c on c.id = i.collection_id
  where i.invitee_id = (select auth.uid())
    and i.revoked_at is null
    and i.declined_at is null
    and i.expires_at > now()
    and i.use_count < i.max_uses
  order by i.created_at desc;
$$;

revoke all on function public.get_my_pending_invites() from public, anon;
grant execute on function public.get_my_pending_invites() to authenticated;
