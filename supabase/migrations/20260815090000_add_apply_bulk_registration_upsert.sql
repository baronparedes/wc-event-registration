begin;

create or replace function public.apply_bulk_registration_upsert (
  p_event_id uuid,
  p_rows jsonb,
  p_field_ids uuid[],
  p_answers jsonb
) returns table (inserted_count integer, updated_count integer) language plpgsql security definer
set
  search_path = public as $$
    declare
  v_row jsonb;
v_answer jsonb;
  v_row_index integer;
  v_registration_id uuid;
  v_user_id uuid;
  v_answer_field_id uuid;
  v_answer_text text;
  v_inserted_count integer := 0;
  v_updated_count integer := 0;
begin
    if p_event_id is null then
    raise exception 'p_event_id is required';
end
if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
end
if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a JSON array';
end
if;

  create temporary table tmp_bulk_registration_map
(
    row_index integer primary key,
    registration_id uuid not null
  ) on
commit
drop;

  for v_row in
select value
from jsonb_array_elements(p_rows)
  loop
v_row_index := nullif
(trim
(coalesce
(v_row ->> 'row_index', '')), '')::integer;
    v_user_id := nullif
(trim
(coalesce
(v_row ->> 'user_id', '')), '')::uuid;

if v_row_index is null then
      raise exception 'row_index is required for each row';
end
if;

    if v_user_id is null then
      raise exception 'user_id is required for each row';
end
if;

    perform 1
    from public.users u
    where u.id = v_user_id
      and u.is_active;

if not found then
      raise exception 'Active member not found for user_id: %', v_user_id;
end
if;

    select r.id
into v_registration_id
from public.registrations r
where r.event_id = p_event_id
    and r.user_id = v_user_id
order by r.submitted_at desc, r.id desc
    limit 1
    for update;

    if found
then
update public.registrations
      set
        status = 'updated',
        submitted_at = now(),
        updated_at = now()
      where id = v_registration_id;

v_updated_count := v_updated_count + 1;
    else
insert into public.registrations
    (event_id, user_id, status, source)
values
    (p_event_id, v_user_id, 'submitted', 'admin_bulk_import')
returning id into v_registration_id;

      v_inserted_count := v_inserted_count + 1;
end
if;

    insert into tmp_bulk_registration_map
    (row_index, registration_id)
values
    (v_row_index, v_registration_id);
end loop;

if cardinality(coalesce(p_field_ids, array[]::uuid[])) > 0 then
    perform 1
    from unnest
(p_field_ids) as field_id
    left join public.event_fields ef on ef.id = field_id and ef.event_id = p_event_id
    where ef.id is null;

if found then
      raise exception 'An answer field does not belong to the event';
end
if;

    delete from public.registration_answers ra
    using tmp_bulk_registration_map
row_map
    where ra.registration_id = row_map.registration_id
      and ra.event_field_id = any
(p_field_ids);
end
if;

  for v_answer in
select value
from jsonb_array_elements(p_answers)
  loop
v_row_index := nullif
(trim
(coalesce
(v_answer ->> 'row_index', '')), '')::integer;
    v_answer_field_id := nullif
(trim
(coalesce
(v_answer ->> 'event_field_id', '')), '')::uuid;
    v_answer_text := case
      when v_answer ? 'answer_text' and jsonb_typeof
(v_answer -> 'answer_text') <> 'null'
      then v_answer ->> 'answer_text'
      else null
end;

if v_row_index is null then
      raise exception 'row_index is required for each answer';
end
if;

    if v_answer_field_id is null then
      raise exception 'event_field_id is required for each answer';
end
if;

    if v_answer_text is null then
      raise exception 'answer_text is required for each answer';
end
if;

    select row_map.registration_id
into v_registration_id
from tmp_bulk_registration_map row_map
where row_map.row_index = v_row_index;

if v_registration_id is null then
      raise exception 'No registration found for answer row_index: %', v_row_index;
end
if;

    perform 1
    from public.event_fields ef
    where ef.id = v_answer_field_id
      and ef.event_id = p_event_id;

if not found then
      raise exception 'Answer field does not belong to the event: %', v_answer_field_id;
end
if;

    insert into public.registration_answers
    (registration_id, event_field_id, answer_text)
values
    (v_registration_id, v_answer_field_id, v_answer_text);
end loop;

return query
select v_inserted_count, v_updated_count;
end;
$$;

grant
execute on function public.apply_bulk_registration_upsert (uuid, jsonb, uuid[], jsonb) to authenticated;

grant
execute on function public.apply_bulk_registration_upsert (uuid, jsonb, uuid[], jsonb) to service_role;

commit;
