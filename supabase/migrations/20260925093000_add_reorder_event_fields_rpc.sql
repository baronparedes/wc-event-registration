begin;

create or replace function public.reorder_event_fields (p_event_id uuid, p_ordered_ids uuid[]) returns void as $$
declare
  v_status text;
begin
  select status into v_status from public.events where id = p_event_id;
  if v_status is null then
    raise exception 'Event not found';
  end if;
  if v_status != 'draft' then
    raise exception 'Cannot reorder fields on a published or archived event. Archive this event and create a new one to change the registration form.';
  end if;

  update public.event_fields
  set display_order = t.idx - 1,
      updated_at = now()
  from (
    select id, row_number() over () as idx
    from unnest(p_ordered_ids) as id
  ) as t
  where event_fields.id = t.id
    and event_fields.event_id = p_event_id;
end;
$$ language plpgsql security invoker;

-- Only authenticated users and service_role can execute this
grant
execute on function public.reorder_event_fields (uuid, uuid[]) to authenticated;

grant
execute on function public.reorder_event_fields (uuid, uuid[]) to service_role;

commit;
