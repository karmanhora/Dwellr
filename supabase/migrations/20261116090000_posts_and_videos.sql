-- Milestone 3 — social posts and short vertical video.
--
-- Design notes:
--   * Posts are user-generated content. They are never property facts and do
--     not write property provenance.
--   * A post is created through create_post(), not a direct table insert. That
--     keeps the post and its media atomic, enforces per-user rate limits and
--     storage quotas, and makes a video post impossible without its video row.
--   * Social likes/comments/reports reuse the Milestone 2 target pattern: the
--     `post` branch is completed here instead of adding parallel tables.
--   * Media paths are server-generated as <author-id>/<uuid>.<ext>; buckets
--     enforce MIME and size, and triggers repeat the prefix checks.
--   * Videos are stored and served by Supabase Storage behind the VideoProvider
--     interface in packages/core. No server-side transcoding in this milestone.
--   * Every table revokes Supabase's default ALL grant before the minimum grant.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.post_kind as enum ('text', 'photo', 'video');

create type public.post_category as enum (
  'walkthrough',
  'renovation',
  'architecture',
  'interiors',
  'neighborhood',
  'before_after',
  'diy',
  'other'
);

create type public.video_status as enum ('uploaded', 'ready', 'failed');

alter type public.report_reason add value if not exists 'personal_information';

-- ---------------------------------------------------------------------------
-- posts
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  kind public.post_kind not null,
  caption text not null default '',
  categories public.post_category[] not null default '{}',
  property_id uuid references public.properties (id) on delete set null,
  neighborhood text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles (id) on delete set null,
  constraint posts_caption_length check (char_length(caption) <= 2200),
  constraint posts_text_needs_caption check (
    kind <> 'text' or char_length(btrim(caption)) > 0
  ),
  constraint posts_neighborhood_length check (
    neighborhood is null or char_length(btrim(neighborhood)) between 1 and 80
  ),
  constraint posts_city_length check (
    city is null or char_length(btrim(city)) between 1 and 80
  ),
  constraint posts_categories_count check (cardinality(categories) <= 3)
);

comment on table public.posts is
  'User-generated social posts. Soft-deleted posts are hidden everywhere; media rows are removed when the author deletes.';
comment on column public.posts.property_id is
  'Optional link to a persistent property profile. The post remains community content and never changes property provenance.';

create index posts_feed_idx
  on public.posts (created_at desc, id desc)
  where deleted_at is null;
create index posts_author_idx
  on public.posts (author_id, created_at desc)
  where deleted_at is null;
create index posts_property_idx
  on public.posts (property_id, created_at desc)
  where property_id is not null and deleted_at is null;
create index posts_neighborhood_idx
  on public.posts (lower(neighborhood))
  where deleted_at is null and neighborhood is not null;

create trigger posts_set_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

create or replace function public.validate_post_categories()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if cardinality(new.categories) > 3 then
    raise exception 'Choose at most three categories.' using errcode = 'check_violation';
  end if;

  if cardinality(new.categories) <> (
    select count(distinct category)::integer
    from unnest(new.categories) as category
  ) then
    raise exception 'Choose each category once.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger posts_validate_categories
  before insert or update of categories on public.posts
  for each row
  execute function public.validate_post_categories();

-- ---------------------------------------------------------------------------
-- post_photos
-- ---------------------------------------------------------------------------

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  storage_path text not null unique,
  position smallint not null,
  alt_text text,
  width integer,
  height integer,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint post_photos_position check (position between 0 and 7),
  constraint post_photos_path check (
    storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  ),
  constraint post_photos_alt_length check (alt_text is null or char_length(alt_text) <= 200),
  constraint post_photos_dimensions check (
    (width is null and height is null)
    or (width between 1 and 12000 and height between 1 and 12000)
  ),
  constraint post_photos_size check (size_bytes between 1 and 5242880),
  unique (post_id, position)
);

comment on table public.post_photos is
  'Up to eight re-encoded post images. Rows are written by create_post(); clients never insert media directly.';

create index post_photos_post_idx on public.post_photos (post_id, position);

create or replace function public.validate_post_photo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  post_kind public.post_kind;
  photo_count integer;
begin
  select p.author_id, p.kind
  into post_author, post_kind
  from public.posts p
  where p.id = new.post_id;

  if post_author is null then
    raise exception 'That post does not exist.' using errcode = 'foreign_key_violation';
  end if;

  if post_kind <> 'photo' then
    raise exception 'Only photo posts can carry photos.' using errcode = 'check_violation';
  end if;

  if split_part(new.storage_path, '/', 1) <> post_author::text then
    raise exception 'That photo belongs to a different account.' using errcode = 'insufficient_privilege';
  end if;

  select count(*) into photo_count
  from public.post_photos p
  where p.post_id = new.post_id;

  if photo_count >= 8 then
    raise exception 'A post can carry at most eight photos.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger post_photos_validate
  before insert on public.post_photos
  for each row
  execute function public.validate_post_photo();

-- ---------------------------------------------------------------------------
-- videos
-- ---------------------------------------------------------------------------

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null unique references public.posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null unique,
  poster_path text not null,
  duration_seconds numeric(5, 1) not null,
  width integer not null,
  height integer not null,
  size_bytes bigint not null,
  mime_type text not null,
  captions text,
  status public.video_status not null default 'uploaded',
  created_at timestamptz not null default now(),
  constraint videos_duration check (duration_seconds between 0.1 and 30),
  constraint videos_dimensions check (width between 1 and 4096 and height between 1 and 4096),
  constraint videos_size check (size_bytes between 1 and 26214400),
  constraint videos_mime check (mime_type in ('video/mp4', 'video/webm')),
  constraint videos_captions_length check (captions is null or char_length(captions) <= 2000),
  constraint videos_path check (
    storage_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$'
  ),
  constraint videos_poster_path check (
    poster_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  )
);

comment on table public.videos is
  'One short video per video post. Metadata is client-declared and checked against hard limits; dwellr does not probe or transcode the file yet.';

create index videos_author_idx on public.videos (author_id, created_at desc);

create or replace function public.validate_video()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  post_kind public.post_kind;
begin
  select p.author_id, p.kind
  into post_author, post_kind
  from public.posts p
  where p.id = new.post_id;

  if post_author is null then
    raise exception 'That post does not exist.' using errcode = 'foreign_key_violation';
  end if;

  if post_kind <> 'video' then
    raise exception 'Only video posts can carry a video.' using errcode = 'check_violation';
  end if;

  if new.author_id <> post_author then
    raise exception 'The video must belong to the post author.' using errcode = 'insufficient_privilege';
  end if;

  if split_part(new.storage_path, '/', 1) <> new.author_id::text
    or split_part(new.poster_path, '/', 1) <> new.author_id::text then
    raise exception 'Those media paths belong to a different account.' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger videos_validate
  before insert or update on public.videos
  for each row
  execute function public.validate_video();

-- The deferred constraint makes the invariant true even if a future writer
-- bypasses create_post(): a video post cannot commit without a valid video.
create or replace function public.validate_post_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  photo_count integer;
  video_count integer;
begin
  select count(*) into photo_count from public.post_photos p where p.post_id = new.id;
  select count(*) into video_count from public.videos v where v.post_id = new.id;

  if new.kind = 'text' and (photo_count > 0 or video_count > 0) then
    raise exception 'A text post cannot carry media.' using errcode = 'check_violation';
  end if;

  if new.kind = 'photo' and (photo_count < 1 or photo_count > 8 or video_count > 0) then
    raise exception 'A photo post needs one to eight photos and no video.' using errcode = 'check_violation';
  end if;

  if new.kind = 'video' and (video_count <> 1 or photo_count > 0) then
    raise exception 'A video post needs exactly one video and no photos.' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create constraint trigger posts_validate_media
  after insert on public.posts
  initially deferred
  for each row
  execute function public.validate_post_media();

-- ---------------------------------------------------------------------------
-- Per-user media usage and quotas
-- ---------------------------------------------------------------------------

create table public.user_media_usage (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  photo_bytes bigint not null default 0,
  video_bytes bigint not null default 0,
  updated_at timestamptz not null default now(),
  constraint user_media_usage_photo_nonnegative check (photo_bytes >= 0),
  constraint user_media_usage_video_nonnegative check (video_bytes >= 0)
);

comment on table public.user_media_usage is
  'Trigger-maintained post-photo and video bytes per user. Property photos and avatars are outside this first quota.';

create or replace function public.adjust_post_photo_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  delta bigint;
  next_photo_bytes bigint;
begin
  if tg_op = 'INSERT' then
    select p.author_id into target_user from public.posts p where p.id = new.post_id;
    delta := new.size_bytes;
  else
    select p.author_id into target_user from public.posts p where p.id = old.post_id;
    delta := -old.size_bytes;
  end if;

  if target_user is null then
    return coalesce(new, old);
  end if;

  insert into public.user_media_usage (user_id, photo_bytes, video_bytes)
  values (target_user, greatest(delta, 0), 0)
  on conflict (user_id) do update
  set
    photo_bytes = greatest(0, public.user_media_usage.photo_bytes + delta),
    updated_at = now()
  returning photo_bytes into next_photo_bytes;

  if next_photo_bytes > 209715200 then
    raise exception 'Photo storage quota reached. Delete an older post before uploading more.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger post_photos_adjust_usage
  after insert or delete on public.post_photos
  for each row
  execute function public.adjust_post_photo_usage();

create or replace function public.adjust_video_usage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  delta bigint;
  next_video_bytes bigint;
begin
  if tg_op = 'INSERT' then
    target_user := new.author_id;
    delta := new.size_bytes;
  else
    target_user := old.author_id;
    delta := -old.size_bytes;
  end if;

  insert into public.user_media_usage (user_id, photo_bytes, video_bytes)
  values (target_user, 0, greatest(delta, 0))
  on conflict (user_id) do update
  set
    video_bytes = greatest(0, public.user_media_usage.video_bytes + delta),
    updated_at = now()
  returning video_bytes into next_video_bytes;

  if next_video_bytes > 524288000 then
    raise exception 'Video storage quota reached. Delete an older video before uploading more.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

create trigger videos_adjust_usage
  after insert or delete on public.videos
  for each row
  execute function public.adjust_video_usage();

-- ---------------------------------------------------------------------------
-- Atomic create and soft delete
-- ---------------------------------------------------------------------------

create or replace function public.create_post(
  p_kind public.post_kind,
  p_caption text,
  p_categories public.post_category[],
  p_property_id uuid default null,
  p_neighborhood text default null,
  p_city text default null,
  p_photos jsonb default '[]'::jsonb,
  p_video jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_post_id uuid;
  photo jsonb;
  photo_count integer := 0;
  new_photo_bytes bigint := 0;
  used_photo_bytes bigint := 0;
  used_video_bytes bigint := 0;
  recent_posts integer;
  recent_videos integer;
  video_duration numeric;
  video_width integer;
  video_height integer;
  video_size bigint;
  video_mime text;
begin
  if current_user_id is null then
    raise exception 'Sign in to publish a post.' using errcode = 'insufficient_privilege';
  end if;

  if p_kind = 'text' and char_length(btrim(coalesce(p_caption, ''))) = 0 then
    raise exception 'Write something for a text post.' using errcode = 'check_violation';
  end if;

  if coalesce(cardinality(p_categories), 0) > 3 then
    raise exception 'Choose at most three categories.' using errcode = 'check_violation';
  end if;

  if coalesce(cardinality(p_categories), 0) <> (
    select count(distinct category)::integer from unnest(coalesce(p_categories, '{}')) as category
  ) then
    raise exception 'Choose each category once.' using errcode = 'check_violation';
  end if;

  if p_property_id is not null
    and not exists (select 1 from public.properties p where p.id = p_property_id) then
    raise exception 'That property does not exist.' using errcode = 'foreign_key_violation';
  end if;

  -- Database rate limits are authoritative; the UI only explains them.
  select count(*) into recent_posts
  from public.posts p
  where p.author_id = current_user_id
    and p.created_at > now() - interval '1 hour';

  if recent_posts >= 10 then
    raise exception 'You can publish ten posts an hour. Try again in a little while.'
      using errcode = 'check_violation';
  end if;

  if p_kind = 'video' then
    select count(*) into recent_videos
    from public.posts p
    where p.author_id = current_user_id
      and p.kind = 'video'
      and p.created_at > now() - interval '1 day';

    if recent_videos >= 3 then
      raise exception 'You can publish three videos a day. Try again tomorrow.'
        using errcode = 'check_violation';
    end if;
  end if;

  if p_photos is null or jsonb_typeof(p_photos) <> 'array' then
    raise exception 'Photo references must be a list.' using errcode = 'check_violation';
  end if;

  photo_count := jsonb_array_length(p_photos);
  if p_kind = 'text' and (photo_count > 0 or p_video is not null) then
    raise exception 'A text post cannot carry media.' using errcode = 'check_violation';
  end if;
  if p_kind = 'photo' and (photo_count < 1 or photo_count > 8 or p_video is not null) then
    raise exception 'A photo post needs one to eight photos and no video.' using errcode = 'check_violation';
  end if;
  if p_kind = 'video' and (photo_count > 0 or p_video is null or jsonb_typeof(p_video) <> 'object') then
    raise exception 'A video post needs exactly one video and no photos.' using errcode = 'check_violation';
  end if;

  select coalesce(sum((item->>'sizeBytes')::bigint), 0)
  into new_photo_bytes
  from jsonb_array_elements(p_photos) as item;

  for photo in select * from jsonb_array_elements(p_photos) loop
    if split_part(photo->>'storagePath', '/', 1) <> current_user_id::text then
      raise exception 'Those photos belong to a different account.' using errcode = 'insufficient_privilege';
    end if;
    if (photo->>'storagePath') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$' then
      raise exception 'That photo reference is not valid.' using errcode = 'check_violation';
    end if;
    if (photo->>'sizeBytes')::bigint not between 1 and 5242880 then
      raise exception 'Photos must be 5 MB or smaller.' using errcode = 'check_violation';
    end if;
  end loop;

  select
    coalesce((select u.photo_bytes from public.user_media_usage u where u.user_id = current_user_id), 0),
    coalesce((select u.video_bytes from public.user_media_usage u where u.user_id = current_user_id), 0)
  into used_photo_bytes, used_video_bytes;

  if (used_photo_bytes + new_photo_bytes) > 209715200 then
    raise exception 'Photo storage quota reached. Delete an older post before uploading more.'
      using errcode = 'check_violation';
  end if;

  if p_kind = 'video' then
    if split_part(p_video->>'storagePath', '/', 1) <> current_user_id::text
      or split_part(p_video->>'posterPath', '/', 1) <> current_user_id::text then
      raise exception 'Those media paths belong to a different account.' using errcode = 'insufficient_privilege';
    end if;
    if (p_video->>'storagePath') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$' then
      raise exception 'That video reference is not valid.' using errcode = 'check_violation';
    end if;
    if (p_video->>'posterPath') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$' then
      raise exception 'That poster reference is not valid.' using errcode = 'check_violation';
    end if;

    video_duration := (p_video->>'durationSeconds')::numeric;
    video_width := (p_video->>'width')::integer;
    video_height := (p_video->>'height')::integer;
    video_size := (p_video->>'sizeBytes')::bigint;
    video_mime := p_video->>'mimeType';

    if video_duration is null or video_duration not between 0.1 and 30 then
      raise exception 'Videos must be 30 seconds or shorter.' using errcode = 'check_violation';
    end if;
    if video_width is null or video_height is null
      or video_width not between 1 and 4096 or video_height not between 1 and 4096 then
      raise exception 'That video has invalid dimensions.' using errcode = 'check_violation';
    end if;
    if video_size is null or video_size not between 1 and 26214400 then
      raise exception 'Videos must be 25 MB or smaller.' using errcode = 'check_violation';
    end if;
    if video_mime not in ('video/mp4', 'video/webm') then
      raise exception 'Use an MP4 (H.264) or WebM video.' using errcode = 'check_violation';
    end if;
    if (used_video_bytes + video_size) > 524288000 then
      raise exception 'Video storage quota reached. Delete an older video before uploading more.'
        using errcode = 'check_violation';
    end if;
  end if;

  insert into public.posts (author_id, kind, caption, categories, property_id, neighborhood, city)
  values (
    current_user_id,
    p_kind,
    coalesce(p_caption, ''),
    coalesce(p_categories, '{}'),
    p_property_id,
    nullif(btrim(p_neighborhood), ''),
    nullif(btrim(p_city), '')
  )
  returning id into new_post_id;

  if photo_count > 0 then
    insert into public.post_photos (
      post_id, storage_path, position, alt_text, width, height, size_bytes
    )
    select
      new_post_id,
      item->>'storagePath',
      (ordinality - 1)::smallint,
      nullif(btrim(item->>'altText'), ''),
      nullif(item->>'width', '')::integer,
      nullif(item->>'height', '')::integer,
      (item->>'sizeBytes')::bigint
    from jsonb_array_elements(p_photos) with ordinality as photo_rows(item, ordinality);
  end if;

  if p_kind = 'video' then
    insert into public.videos (
      post_id, author_id, storage_path, poster_path, duration_seconds,
      width, height, size_bytes, mime_type, captions, status
    )
    values (
      new_post_id,
      current_user_id,
      p_video->>'storagePath',
      p_video->>'posterPath',
      video_duration,
      video_width,
      video_height,
      video_size,
      video_mime,
      nullif(btrim(p_video->>'captions'), ''),
      'ready'
    );
  end if;

  return new_post_id;
end;
$$;

create or replace function public.soft_delete_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  post_author uuid;
begin
  if current_user_id is null then
    raise exception 'Sign in to delete a post.' using errcode = 'insufficient_privilege';
  end if;

  select p.author_id into post_author
  from public.posts p
  where p.id = p_post_id and p.deleted_at is null
  for update;

  if post_author is null then
    raise exception 'That post does not exist.' using errcode = 'no_data_found';
  end if;
  if post_author <> current_user_id then
    raise exception 'Only the author can delete this post.' using errcode = 'insufficient_privilege';
  end if;

  -- Media rows are removed so quotas are released; the post row remains as a
  -- soft-deleted tombstone. The app removes Storage objects before calling this.
  delete from public.post_photos p where p.post_id = p_post_id;
  delete from public.videos v where v.post_id = p_post_id;

  update public.posts
  set deleted_at = now(), deleted_by = current_user_id
  where id = p_post_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Complete the polymorphic social target branch
-- ---------------------------------------------------------------------------

create or replace function public.assert_social_target(
  p_target_type public.social_target_type,
  p_target_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_target_type = 'property' then
    if not exists (select 1 from public.properties p where p.id = p_target_id) then
      raise exception 'That property does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return;
  end if;

  if p_target_type = 'post' then
    if not exists (
      select 1 from public.posts p where p.id = p_target_id and p.deleted_at is null
    ) then
      raise exception 'That post does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return;
  end if;
end;
$$;

create or replace function public.social_target_owner(
  p_target_type public.social_target_type,
  p_target_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'property' then (select p.created_by from public.properties p where p.id = p_target_id)
    when 'post' then (select p.author_id from public.posts p where p.id = p_target_id)
    else null
  end;
$$;

create or replace function public.validate_report_target()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.target_type = 'property' then
    if not exists (select 1 from public.properties p where p.id = new.target_id) then
      raise exception 'That property does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  if new.target_type = 'post' then
    if not exists (select 1 from public.posts p where p.id = new.target_id) then
      raise exception 'That post does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  if new.target_type = 'comment' then
    if not exists (select 1 from public.comments c where c.id = new.target_id) then
      raise exception 'That comment does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  if new.target_type = 'profile' then
    if not exists (select 1 from public.profiles p where p.id = new.target_id) then
      raise exception 'That profile does not exist.' using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  return new;
end;
$$;

create or replace function public.cleanup_post_social_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.content_likes
  where target_type = 'post' and target_id = old.id;
  delete from public.comments
  where target_type = 'post' and target_id = old.id;
  delete from public.reports
  where target_type = 'post' and target_id = old.id;
  delete from public.notifications
  where target_type = 'post' and target_id = old.id;
  return old;
end;
$$;

create trigger posts_cleanup_social_rows
  after delete on public.posts
  for each row
  execute function public.cleanup_post_social_rows();

-- Comments on a soft-deleted post disappear with it.
drop policy if exists "Comments are public except across a block" on public.comments;
create policy "Comments are public except across a block"
  on public.comments
  for select
  using (
    not public.is_blocked_between((select auth.uid()), author_id)
    and (
      target_type <> 'post'
      or exists (
        select 1 from public.posts p
        where p.id = target_id and p.deleted_at is null
      )
    )
  );

-- ---------------------------------------------------------------------------
-- Explainable /watch ranking
-- ---------------------------------------------------------------------------

create view public.watch_posts
with (security_invoker = true) as
select
  p.id as post_id,
  p.created_at,
  (
    case
      when f.follower_id is not null and prefs.user_id is not null then 3
      when f.follower_id is not null then 2
      when prefs.user_id is not null then 1
      else 0
    end
  )::integer as relevance,
  (
    (select count(*) from public.content_likes l
      where l.target_type = 'post' and l.target_id = p.id)
    + 2 * (select count(*) from public.comments c
      where c.target_type = 'post' and c.target_id = p.id and c.deleted_at is null)
  )::integer as engagement_score
from public.posts p
left join public.follows f
  on f.follower_id = (select auth.uid())
 and f.following_id = p.author_id
left join public.feed_preferences prefs
  on prefs.user_id = (select auth.uid())
 and (
   (p.neighborhood is not null and p.neighborhood = any(prefs.neighborhoods))
   or exists (
     select 1 from public.properties pr
     where pr.id = p.property_id
       and pr.property_type = any(prefs.property_types)
   )
 )
where p.deleted_at is null
  and not public.is_blocked_between((select auth.uid()), p.author_id);

comment on view public.watch_posts is
  'Post ranking: follow + neighborhood (3), follow (2), neighborhood or tagged-home style (1), then engagement and recency. No hidden signals.';

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('post-photos', 'post-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('post-videos', 'post-videos', true, 26214400, array['video/mp4', 'video/webm'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Post photos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'post-photos');

create policy "Users upload post photos under their own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update post photos under their own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete post photos under their own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Post videos are publicly readable"
  on storage.objects
  for select
  using (bucket_id = 'post-videos');

create policy "Users upload post videos under their own prefix"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users update post videos under their own prefix"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete post videos under their own prefix"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-videos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---------------------------------------------------------------------------
-- Least-privilege grants
-- ---------------------------------------------------------------------------

revoke all on public.posts from anon, authenticated;
revoke all on public.post_photos from anon, authenticated;
revoke all on public.videos from anon, authenticated;
revoke all on public.user_media_usage from anon, authenticated;

revoke truncate, references, trigger on public.posts from anon, authenticated;
revoke truncate, references, trigger on public.post_photos from anon, authenticated;
revoke truncate, references, trigger on public.videos from anon, authenticated;
revoke truncate, references, trigger on public.user_media_usage from anon, authenticated;

grant select on public.posts to anon, authenticated;
grant update (caption, categories, property_id, neighborhood, city, updated_at)
  on public.posts to authenticated;

grant select on public.post_photos to anon, authenticated;
grant select on public.videos to anon, authenticated;
grant select on public.user_media_usage to authenticated;

grant select on public.watch_posts to anon, authenticated;

revoke all on function public.create_post(
  public.post_kind, text, public.post_category[], uuid, text, text, jsonb, jsonb
) from public, anon;
revoke all on function public.soft_delete_post(uuid) from public, anon;
grant execute on function public.create_post(
  public.post_kind, text, public.post_category[], uuid, text, text, jsonb, jsonb
) to authenticated;
grant execute on function public.soft_delete_post(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.post_photos enable row level security;
alter table public.videos enable row level security;
alter table public.user_media_usage enable row level security;

create policy "Posts are public except across a block"
  on public.posts
  for select
  using (
    deleted_at is null
    and not public.is_blocked_between((select auth.uid()), author_id)
  );

create policy "Authors edit their own live post copy and tags"
  on public.posts
  for update
  to authenticated
  using (author_id = (select auth.uid()) and deleted_at is null)
  with check (author_id = (select auth.uid()) and deleted_at is null);

-- No insert/delete grant or policy: create_post() and soft_delete_post() are
-- the only write paths, so the media invariant and quota checks cannot be
-- bypassed through PostgREST.

create policy "Post photos are public with their post"
  on public.post_photos
  for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.deleted_at is null
        and not public.is_blocked_between((select auth.uid()), p.author_id)
    )
  );

create policy "Videos are public with their post"
  on public.videos
  for select
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.deleted_at is null
        and not public.is_blocked_between((select auth.uid()), p.author_id)
    )
  );

create policy "Users read their own media usage"
  on public.user_media_usage
  for select
  to authenticated
  using (user_id = (select auth.uid()));
