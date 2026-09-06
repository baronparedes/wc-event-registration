begin;

do $$
declare
  function_definition text;
begin
  select pg_get_functiondef(p.oid)
  into function_definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'apply_bulk_member_upsert'
    and p.pronargs = 1
    and p.proargtypes[0] = 'jsonb'::regtype::oid;

  if function_definition is null then
    raise exception 'Function public.apply_bulk_member_upsert(jsonb) was not found';
  end if;

  function_definition := replace(
    function_definition,
    'email = v_email,',
    'email = coalesce(v_email, public.users.email),'
  );
  function_definition := replace(
    function_definition,
    'phone = v_phone,',
    'phone = coalesce(v_phone, public.users.phone),'
  );
  function_definition := replace(
    function_definition,
    'date_of_birth = case when v_date_of_birth is null then null else v_date_of_birth::date end,',
    'date_of_birth = coalesce(case when v_date_of_birth is null then null else v_date_of_birth::date end, public.users.date_of_birth),'
  );

  execute function_definition;
end;
$$;

commit;
