-- Rebrand the generated fallback username and the video table description for
-- databases that were provisioned before the HausCrawl rename.

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
    base_username := 'hauscrawl';
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

comment on table public.videos is
  'One short video per video post. Metadata is client-declared and checked against hard limits; HausCrawl does not probe or transcode the file yet.';
