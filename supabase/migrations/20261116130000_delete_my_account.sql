-- Self-service account deletion.
--
-- Storage files are removed by the server action before this runs, because
-- Postgres cannot delete the underlying Storage API objects. This function
-- only removes the caller's own auth row; the id is never supplied by the
-- client. Cascades remove the profile and the user's app rows.
--
-- Notifications have a check constraint that forbids a null follow actor, and
-- actor_ids is not a foreign key. Remove every notification involving the
-- account first so the auth-user cascade cannot fail or leave stale ids.

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_id uuid := (select auth.uid());
begin
  if account_id is null then
    raise exception 'Not authenticated.' using errcode = '28000';
  end if;

  delete from public.notifications
  where user_id = account_id
     or actor_id = account_id
     or account_id = any (actor_ids);

  -- Waitlist signups are deliberately not auth-linked, and referrals cascade
  -- to null, so remove the row that belongs to this account by its email.
  delete from public.waitlist_signups
  where lower(email) = lower((select u.email from auth.users u where u.id = account_id));

  delete from auth.users
  where id = account_id;

  if not found then
    raise exception 'Account not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

comment on function public.delete_my_account() is
  'Deletes only the authenticated caller''s account and cascaded app data. Storage cleanup is handled by the server action first.';
