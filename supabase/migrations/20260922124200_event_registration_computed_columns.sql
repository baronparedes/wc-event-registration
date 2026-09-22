begin;

create or replace function public.member_registration_count (e public.events) returns bigint language sql stable security definer as $$
  select count(*)::bigint
  from public.registrations
  where event_id = e.id
    and status != 'cancelled';
$$;

create or replace function public.public_registration_count (e public.events) returns bigint language sql stable security definer as $$
  select count(*)::bigint
  from public.public_registrations
  where event_id = e.id
    and status != 'cancelled';
$$;

grant
execute on function public.member_registration_count (public.events) to authenticated;

grant
execute on function public.public_registration_count (public.events) to authenticated;

grant
execute on function public.member_registration_count (public.events) to service_role;

grant
execute on function public.public_registration_count (public.events) to service_role;

commit;
