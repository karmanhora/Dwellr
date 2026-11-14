-- Listing freshness — observed price/status history and poster confirmations.
--
-- Design notes:
--   * History is written only by a trigger that observes real property writes.
--     Clients can read it but cannot insert, edit or delete entries, so a
--     price-cut badge can only reflect a change dwellr actually saw.
--   * Confirmations are self-reported freshness signals, not verification.
--     They live in their own table and never touch property_field_provenance;
--     provenance rules stay exactly as they were.
--   * Supabase grants ALL on new public tables, so each table revokes first
--     and re-grants the minimum.

-- ---------------------------------------------------------------------------
-- property_price_history
-- ---------------------------------------------------------------------------

create table public.property_price_history (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  price_cents bigint not null,
  previous_price_cents bigint,
  currency text not null,
  recorded_at timestamptz not null default now(),
  constraint property_price_history_price_range check (
    price_cents >= 0 and price_cents <= 100000000000
  ),
  constraint property_price_history_previous_range check (
    previous_price_cents is null
    or (previous_price_cents >= 0 and previous_price_cents <= 100000000000)
  ),
  constraint property_price_history_currency_format check (currency ~ '^[A-Z]{3}$')
);

comment on table public.property_price_history is
  'Observed asking-price changes, written by trigger. Clients have read-only access.';

create index property_price_history_property_idx
  on public.property_price_history (property_id, recorded_at desc, id desc);

-- ---------------------------------------------------------------------------
-- property_status_history
-- ---------------------------------------------------------------------------

create table public.property_status_history (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  status public.listing_status not null,
  previous_status public.listing_status,
  recorded_at timestamptz not null default now()
);

comment on table public.property_status_history is
  'Observed listing-status changes, written by trigger. Clients have read-only access.';

create index property_status_history_property_idx
  on public.property_status_history (property_id, recorded_at desc, id desc);

-- ---------------------------------------------------------------------------
-- property_confirmations
-- ---------------------------------------------------------------------------

create table public.property_confirmations (
  id bigint generated always as identity primary key,
  property_id uuid not null references public.properties (id) on delete cascade,
  confirmed_by uuid not null references public.profiles (id) on delete cascade,
  confirmed_at timestamptz not null default now()
);

comment on table public.property_confirmations is
  'Self-reported "still accurate" confirmations from the poster. Not a verification signal.';

create index property_confirmations_property_idx
  on public.property_confirmations (property_id, confirmed_at desc, id desc);

-- ---------------------------------------------------------------------------
-- History trigger
-- ---------------------------------------------------------------------------

create or replace function public.record_property_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.price_cents is not null then
      insert into public.property_price_history (
        property_id, price_cents, previous_price_cents, currency
      )
      values (new.id, new.price_cents, null, new.currency);
    end if;

    insert into public.property_status_history (property_id, status, previous_status)
    values (new.id, new.listing_status, null);

    return new;
  end if;

  if new.price_cents is not null and new.price_cents is distinct from old.price_cents then
    insert into public.property_price_history (
      property_id, price_cents, previous_price_cents, currency
    )
    values (new.id, new.price_cents, old.price_cents, new.currency);
  end if;

  if new.listing_status is distinct from old.listing_status then
    insert into public.property_status_history (property_id, status, previous_status)
    values (new.id, new.listing_status, old.listing_status);
  end if;

  return new;
end;
$$;

create trigger properties_record_history
  after insert or update of price_cents, listing_status on public.properties
  for each row
  execute function public.record_property_history();

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.property_price_history from anon, authenticated;
revoke all on public.property_status_history from anon, authenticated;
revoke all on public.property_confirmations from anon, authenticated;

revoke truncate, references, trigger on public.property_price_history from anon, authenticated;
revoke truncate, references, trigger on public.property_status_history from anon, authenticated;
revoke truncate, references, trigger on public.property_confirmations from anon, authenticated;

grant select on public.property_price_history to anon, authenticated;
grant select on public.property_status_history to anon, authenticated;
grant select on public.property_confirmations to anon, authenticated;
grant insert on public.property_confirmations to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.property_price_history enable row level security;
alter table public.property_status_history enable row level security;
alter table public.property_confirmations enable row level security;

create policy "Price history is publicly readable"
  on public.property_price_history
  for select
  using (true);

create policy "Status history is publicly readable"
  on public.property_status_history
  for select
  using (true);

create policy "Confirmations are publicly readable"
  on public.property_confirmations
  for select
  using (true);

create policy "Posters confirm their own listings"
  on public.property_confirmations
  for insert
  to authenticated
  with check (
    confirmed_by = (select auth.uid())
    and exists (
      select 1
      from public.properties p
      where p.id = property_id and p.created_by = (select auth.uid())
    )
  );
