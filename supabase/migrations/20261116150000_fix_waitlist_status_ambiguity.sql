-- Qualify columns referenced inside ON CONFLICT DO UPDATE. Both the target
-- row and EXCLUDED have these columns, so unqualified references are
-- ambiguous in the status-code rate limiter.

create or replace function public.waitlist_status_allowed(p_code text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text := md5(coalesce(p_code, ''));
  v_allowed boolean;
begin
  insert into public.waitlist_status_attempts as buckets (rate_key, window_start, attempts)
  values (v_key, now(), 1)
  on conflict (rate_key) do update
    set attempts = case
          when buckets.window_start < now() - interval '60 seconds' then 1
          else buckets.attempts + 1
        end,
        window_start = case
          when buckets.window_start < now() - interval '60 seconds' then now()
          else buckets.window_start
        end
  returning attempts <= 20 into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.waitlist_status_allowed(text)
  from public, anon, authenticated, service_role;