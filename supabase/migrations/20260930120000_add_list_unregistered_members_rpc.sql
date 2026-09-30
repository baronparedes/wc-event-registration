begin;

create or replace function public.list_unregistered_members (
  p_event_id uuid,
  p_page_size integer,
  p_offset integer,
  p_search_term text
) returns table (items jsonb, total_count bigint) language plpgsql stable security definer
set
  search_path = public as $$
begin
  if auth.role() is distinct from 'service_role'
    and not public.is_admin_viewer()
  then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  return query
  with
    search_pattern as (
      select
        case
          when nullif(trim(p_search_term), '') is null then null
          else
            '%' || replace(
              replace(
                replace(trim(p_search_term), E'\\', E'\\\\'),
                '%',
                E'\\%'
              ),
              '_',
              E'\\_'
            ) || '%'
        end as value
    ),
    filtered_users as (
      select
        u.id,
        u.member_id,
        u.full_name,
        u.email,
        u.role,
        u.category
      from public.users as u
      cross join search_pattern as pattern
      where u.is_active
        and not exists (
          select 1
          from public.registrations as r
          where r.event_id = p_event_id
            and r.user_id = u.id
            and r.status in ('submitted', 'updated')
        )
        and (
          pattern.value is null
          or u.member_id ilike pattern.value escape E'\\'
          or u.full_name ilike pattern.value escape E'\\'
          or u.email ilike pattern.value escape E'\\'
          or u.first_name ilike pattern.value escape E'\\'
          or u.last_name ilike pattern.value escape E'\\'
          or u.nickname ilike pattern.value escape E'\\'
          or u.role ilike pattern.value escape E'\\'
        )
    ),
    paged_users as (
      select *
      from filtered_users
      order by full_name, member_id
      offset p_offset
      limit p_page_size
    )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'member_id', page.member_id,
          'full_name', page.full_name,
          'email', page.email,
          'role', page.role,
          'category', page.category
        ) order by page.full_name, page.member_id
      ),
      '[]'::jsonb
    ) as items,
    (select count(*) from filtered_users) as total_count
  from paged_users as page;
end;
$$;

revoke
execute on function public.list_unregistered_members (uuid, integer, integer, text)
from
  public,
  anon;

grant
execute on function public.list_unregistered_members (uuid, integer, integer, text) to authenticated,
service_role;

commit;
