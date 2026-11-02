begin;

create or replace function public.snapshot_user_commitment_metadata () returns trigger language plpgsql security definer
set
  search_path = public as $$
declare
  old_commitments jsonb;
  new_commitments jsonb;
  history_count integer;
  effective_date date;
begin
  new_commitments := jsonb_build_object(
    'first_sunday', new.metadata->'first_sunday',
    'second_sunday', new.metadata->'second_sunday',
    'third_sunday', new.metadata->'third_sunday',
    'fourth_sunday', new.metadata->'fourth_sunday',
    'fifth_sunday', new.metadata->'fifth_sunday'
  );

  if tg_op = 'INSERT' then
    if exists (
      select 1
      from jsonb_each(new_commitments) commitment
      where commitment.value is not null
        and commitment.value <> 'null'::jsonb
        and commitment.value <> 'false'::jsonb
        and commitment.value <> '""'::jsonb
        and commitment.value <> '[]'::jsonb
    ) then
      effective_date := public.get_nearest_upcoming_sunday(current_date);

      insert into public.user_commitment_history (user_id, effective_date, metadata)
      values (new.id, effective_date, new_commitments);
    end if;

    return new;
  end if;

  old_commitments := jsonb_build_object(
    'first_sunday', old.metadata->'first_sunday',
    'second_sunday', old.metadata->'second_sunday',
    'third_sunday', old.metadata->'third_sunday',
    'fourth_sunday', old.metadata->'fourth_sunday',
    'fifth_sunday', old.metadata->'fifth_sunday'
  );

  if old_commitments is distinct from new_commitments then
    select count(*) into history_count
    from public.user_commitment_history
    where user_id = new.id;

    if history_count = 0 then
      insert into public.user_commitment_history (user_id, effective_date, metadata)
      values (new.id, '2000-01-01'::date, old_commitments);
    end if;

    effective_date := public.get_nearest_upcoming_sunday(current_date);

    insert into public.user_commitment_history (user_id, effective_date, metadata)
    values (new.id, effective_date, new_commitments);
  end if;

  return new;
end;
$$;

drop trigger if exists users_snapshot_commitment_metadata on public.users;

create trigger users_snapshot_commitment_metadata
after insert or update on public.users for each row
execute function public.snapshot_user_commitment_metadata ();

commit;
