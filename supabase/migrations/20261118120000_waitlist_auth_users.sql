-- Link waitlist signups to the Auth user mirrored for the same email.
-- This is nullable because existing rows are backfilled explicitly and because
-- a waitlist email may already belong to an existing full account.

alter table public.waitlist_signups
  add column if not exists auth_user_id uuid references auth.users (id) on delete set null;

comment on column public.waitlist_signups.auth_user_id is
  'Auth user mirrored for this waitlist email; used to confirm the Auth email after waitlist confirmation.';

create unique index if not exists waitlist_signups_auth_user_id_key
  on public.waitlist_signups (auth_user_id)
  where auth_user_id is not null;
