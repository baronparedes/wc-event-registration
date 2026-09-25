begin;

create or replace function public.reorder_attendance_fields (p_event_id uuid, p_ordered_ids uuid[]) returns void as $$
begin
  update public.attendance_fields
  set display_order = t.idx - 1,
      updated_at = now()
  from (
    select id, row_number() over () as idx
    from unnest(p_ordered_ids) as id
  ) as t
  where attendance_fields.id = t.id
    and attendance_fields.event_id = p_event_id;
end;
$$ language plpgsql security invoker;

-- Only authenticated users can execute this
grant
execute on function public.reorder_attendance_fields to authenticated;

commit;
