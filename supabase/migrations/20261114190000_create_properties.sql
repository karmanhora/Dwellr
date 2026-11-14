-- Milestone 1 — property posts, photos, field provenance, and storage.
--
-- Design notes (see docs/ARCHITECTURE.md for the full rationale):
--   * Location is neighbourhood-level only. No street addresses exist in this
--     schema; lat/lng are optional and rounded to 2 decimal places (~1.1 km).
--   * Provenance lives in its own table. Clients get SELECT only — they cannot
--     write provenance at all. A trigger records every user-entered field as
--     'user_submitted'; only service-role integrations will be able to flip a
--     field to 'verified'.
--   * Money is stored in cents (bigint) to avoid float rounding.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.listing_status as enum ('for_sale', 'off_market', 'sold', 'unknown');
create type public.property_type as enum (
  'house',
  'apartment',
  'condo',
  'townhouse',
  'multi_family',
  'land',
  'other'
);
create type public.field_provenance as enum ('user_submitted', 'verified');

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  listing_status public.listing_status not null default 'unknown',
  price_cents bigint,
  currency text not null default 'USD',
  bedrooms numeric(4, 1),
  bathrooms numeric(4, 1),
  square_feet integer,
  property_type public.property_type not null default 'house',
  -- Generalized location only: no street address column exists.
  neighborhood text not null,
  city text not null,
  state text,
  postal_code text,
  -- Optional approximate coordinates, rounded to 2 decimals (~1.1 km).
  latitude numeric(6, 2),
  longitude numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_title_length check (char_length(btrim(title)) between 3 and 120),
  constraint properties_description_length check (
    description is null or char_length(description) <= 4000
  ),
  constraint properties_price_range check (
    price_cents is null or (price_cents >= 0 and price_cents <= 100000000000)
  ),
  constraint properties_currency_format check (currency ~ '^[A-Z]{3}$'),
  constraint properties_bedrooms_range check (bedrooms is null or (bedrooms >= 0 and bedrooms <= 50)),
  constraint properties_bathrooms_range check (
    bathrooms is null or (bathrooms >= 0 and bathrooms <= 50)
  ),
  constraint properties_square_feet_range check (
    square_feet is null or (square_feet between 1 and 100000)
  ),
  constraint properties_neighborhood_length check (
    char_length(btrim(neighborhood)) between 1 and 80
  ),
  constraint properties_city_length check (char_length(btrim(city)) between 1 and 80),
  constraint properties_state_length check (
    state is null or char_length(btrim(state)) between 2 and 80
  ),
  constraint properties_postal_code_length check (
    postal_code is null or char_length(btrim(postal_code)) between 2 and 12
  ),
  constraint properties_latitude_range check (latitude is null or (latitude between -90 and 90)),
  constraint properties_longitude_range check (
    longitude is null or (longitude between -180 and 180)
  ),
  constraint properties_location_precision check (
    (latitude is null or latitude = round(latitude, 2))
    and (longitude is null or longitude = round(longitude, 2))
  )
);

comment on table public.properties is
  'User-submitted property posts. Location is neighbourhood-level; no street addresses.';
comment on column public.properties.price_cents is
  'Asking price in minor units of currency. NULL means the poster did not list a price.';
comment on column public.properties.latitude is
  'Optional approximate latitude, rounded to 2 decimals (about 1.1 km) for privacy.';

-- ---------------------------------------------------------------------------
-- property_photos
-- ---------------------------------------------------------------------------

create table public.property_photos (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null default 0,
  alt_text text,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  constraint property_photos_position_range check (position between 0 and 9),
  constraint property_photos_alt_length check (alt_text is null or char_length(alt_text) <= 200),
  constraint property_photos_dimensions check (
    (width is null and height is null)
    or (width between 1 and 12000 and height between 1 and 12000)
  ),
  constraint property_photos_storage_path_format check (
    storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  ),
  constraint property_photos_unique_position unique (property_id, position)
);

comment on column public.property_photos.storage_path is
  'Object path inside the property-photos bucket: <user-id>/<uuid>.<ext>. Names and types come from the server, never the client.';

-- Hard limit of 8 photos per property (also checked by the app schema).
create or replace function public.enforce_property_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.property_photos where property_id = new.property_id) >= 8 then
    raise exception 'A property can have at most 8 photos.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger property_photos_enforce_limit
  before insert on public.property_photos
  for each row
  execute function public.enforce_property_photo_limit();

-- ---------------------------------------------------------------------------
-- property_field_provenance
-- ---------------------------------------------------------------------------

create table public.property_field_provenance (
  property_id uuid not null references public.properties (id) on delete cascade,
  field text not null,
  provenance public.field_provenance not null default 'user_submitted',
  verified_at timestamptz,
  source_ref text,
  primary key (property_id, field),
  constraint property_field_provenance_field_allowed check (
    field in (
      'title',
      'description',
      'listing_status',
      'price',
      'bedrooms',
      'bathrooms',
      'square_feet',
      'property_type',
      'neighborhood',
      'city',
      'state',
      'postal_code',
      'location'
    )
  ),
  constraint property_field_provenance_verified_at check (
    (provenance = 'user_submitted' and verified_at is null)
    or (provenance = 'verified' and verified_at is not null)
  )
);

comment on table public.property_field_provenance is
  'Per-field provenance. Clients can only read this table; triggers write user_submitted rows. Verified rows are reserved for service-role integrations.';

-- Reads a property's value for one provenance-tracked field.
create or replace function public.property_field_value(p public.properties, field_name text)
returns text
language sql
immutable
as $$
  select case field_name
    when 'title' then p.title
    when 'description' then p.description
    when 'listing_status' then p.listing_status::text
    when 'price' then p.price_cents::text
    when 'bedrooms' then p.bedrooms::text
    when 'bathrooms' then p.bathrooms::text
    when 'square_feet' then p.square_feet::text
    when 'property_type' then p.property_type::text
    when 'neighborhood' then p.neighborhood
    when 'city' then p.city
    when 'state' then p.state
    when 'postal_code' then p.postal_code
    when 'location' then
      case
        when p.latitude is not null and p.longitude is not null
          then p.latitude::text || ',' || p.longitude::text
        else null
      end
  end;
$$;

-- Records provenance for every field the poster filled in. On update, a field
-- the user changed loses any prior verification (a user edit is not verified).
create or replace function public.sync_property_provenance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tracked_fields text[] := array[
    'title',
    'description',
    'listing_status',
    'price',
    'bedrooms',
    'bathrooms',
    'square_feet',
    'property_type',
    'neighborhood',
    'city',
    'state',
    'postal_code',
    'location'
  ];
  f text;
begin
  if tg_op = 'UPDATE' then
    foreach f in array tracked_fields loop
      if public.property_field_value(new, f) is null then
        delete from public.property_field_provenance
        where property_id = new.id and field = f;
      else
        if public.property_field_value(old, f) is distinct from public.property_field_value(new, f) then
          update public.property_field_provenance
          set provenance = 'user_submitted', verified_at = null, source_ref = null
          where property_id = new.id and field = f;
        end if;

        insert into public.property_field_provenance (property_id, field, provenance)
        values (new.id, f, 'user_submitted')
        on conflict (property_id, field) do nothing;
      end if;
    end loop;
  else
    foreach f in array tracked_fields loop
      if public.property_field_value(new, f) is not null then
        insert into public.property_field_provenance (property_id, field, provenance)
        values (new.id, f, 'user_submitted')
        on conflict (property_id, field) do nothing;
      end if;
    end loop;
  end if;

  return null;
end;
$$;

create trigger properties_sync_provenance_insert
  after insert on public.properties
  for each row
  execute function public.sync_property_provenance();

create trigger properties_sync_provenance_update
  after update on public.properties
  for each row
  execute function public.sync_property_provenance();

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger properties_set_updated_at
  before update on public.properties
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes for discovery
-- ---------------------------------------------------------------------------

create index properties_created_at_idx on public.properties (created_at desc, id desc);
create index properties_status_created_at_idx on public.properties (listing_status, created_at desc);
create index properties_location_idx on public.properties (lower(city), lower(neighborhood));
create index properties_created_by_idx on public.properties (created_by, created_at desc);
create index properties_type_idx on public.properties (property_type);
create index property_photos_property_idx on public.property_photos (property_id, position);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.properties enable row level security;

create policy "Properties are publicly readable"
  on public.properties
  for select
  using (true);

create policy "Users create their own properties"
  on public.properties
  for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users update their own properties"
  on public.properties
  for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users delete their own properties"
  on public.properties
  for delete
  to authenticated
  using ((select auth.uid()) = created_by);

grant select on public.properties to anon, authenticated;
grant insert, update, delete on public.properties to authenticated;

alter table public.property_photos enable row level security;

create policy "Property photos are publicly readable"
  on public.property_photos
  for select
  using (true);

create policy "Owners add photos to their own properties"
  on public.property_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id and p.created_by = (select auth.uid())
    )
  );

create policy "Owners update photos on their own properties"
  on public.property_photos
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id and p.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.properties p
      where p.id = property_id and p.created_by = (select auth.uid())
    )
  );

create policy "Owners delete photos on their own properties"
  on public.property_photos
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.properties p
      where p.id = property_id and p.created_by = (select auth.uid())
    )
  );

grant select on public.property_photos to anon, authenticated;
grant insert, update, delete on public.property_photos to authenticated;

alter table public.property_field_provenance enable row level security;

create policy "Property provenance is publicly readable"
  on public.property_field_provenance
  for select
  using (true);

-- Deliberately no insert/update/delete policy and no write grant: clients can
-- never author provenance. The trigger (security definer) records user input,
-- and only service-role integrations may set 'verified'.

grant select on public.property_field_provenance to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage: property photos and avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-photos', 'property-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Property photos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'property-photos');

create policy "Users upload property photos under their own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update property photos under their own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete property photos under their own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Avatars are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

create policy "Users upload avatars under their own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update avatars under their own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete avatars under their own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
