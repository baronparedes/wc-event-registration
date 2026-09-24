begin;

create or replace function public.last_activity (u public.users) returns timestamptz language sql stable security definer as $$
  select checked_in_at
  from public.service_attendance
  where user_id = u.id
  order by checked_in_at desc
  limit 1;
$$;

grant
execute on function public.last_activity (public.users) to authenticated;

grant
execute on function public.last_activity (public.users) to service_role;

commit;
