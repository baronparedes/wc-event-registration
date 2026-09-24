begin;

create or replace function public.reorder_form_fields (p_form_id uuid, p_field_ids uuid[]) returns void language sql security invoker as $$
  update public.form_fields as ff
  set display_order = (t.ord - 1) * 10
  from unnest(p_field_ids) with ordinality as t(id, ord)
  where ff.id = t.id and ff.form_id = p_form_id;
$$;

grant
execute on function public.reorder_form_fields (uuid, uuid[]) to authenticated;

grant
execute on function public.reorder_form_fields (uuid, uuid[]) to service_role;

commit;
