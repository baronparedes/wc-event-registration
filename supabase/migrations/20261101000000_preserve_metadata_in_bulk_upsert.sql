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

  -- Replace the metadata update block
  function_definition := replace(
    function_definition,
    'metadata = (
          coalesce(public.users.metadata, ''{}''::jsonb)
          - ''role''
          - ''category''
          - ''sr_pwd''
          - ''is_oic''
          - ''isoic''
          - ''availability''
          - ''1st_sunday''
          - ''2nd_sunday''
          - ''3rd_sunday''
          - ''4th_sunday''
          - ''5th_sunday''
          - ''first_sunday''
          - ''second_sunday''
          - ''third_sunday''
          - ''fourth_sunday''
          - ''fifth_sunday''
        ) || v_metadata,',
    'metadata = coalesce(public.users.metadata, ''{}''::jsonb) || v_metadata,'
  );

  execute function_definition;
end;
$$;

commit;
