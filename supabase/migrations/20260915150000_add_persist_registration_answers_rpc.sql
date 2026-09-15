begin;

create or replace function public.persist_registration_answers (
  p_registration_id uuid,
  p_answers jsonb,
  p_replace_existing boolean
) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  if p_registration_id is null then
    raise exception 'p_registration_id is required';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'array' then
    raise exception 'p_answers must be a JSON array';
  end if;

  if p_replace_existing then
    delete from public.registration_answers
    where registration_id = p_registration_id;
  end if;

  insert into public.registration_answers (registration_id, event_field_id, answer_text)
  select
    answer.registration_id,
    answer.event_field_id,
    answer.answer_text
  from jsonb_to_recordset(p_answers) as answer (
    registration_id uuid,
    event_field_id uuid,
    answer_text text
  );
end
$$;

grant
execute on function public.persist_registration_answers (uuid, jsonb, boolean) to service_role;

commit;
