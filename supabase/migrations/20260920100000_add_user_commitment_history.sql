begin;

create table public.user_commitment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  effective_date date not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index user_commitment_history_user_id_idx on public.user_commitment_history (user_id);

create index user_commitment_history_effective_date_idx on public.user_commitment_history (effective_date);

alter table public.user_commitment_history enable row level security;

create policy "admin viewers can read user_commitment_history" on public.user_commitment_history for
select
  to authenticated using (public.is_admin_viewer ());

create policy "users can read their own user_commitment_history" on public.user_commitment_history for
select
  to authenticated using (
    user_id = (
      select
        u.id
      from
        public.users u
      where
        u.auth_user_id = auth.uid ()
      limit
        1
    )
  );

grant
select
,
  insert,
update,
delete on public.user_commitment_history to authenticated,
service_role;

-- Function to calculate nearest upcoming Sunday
create or replace function public.get_nearest_upcoming_sunday (base_date date) returns date as $$
declare
  day_of_week integer;
  days_to_add integer;
begin
  day_of_week := extract(dow from base_date);
  if day_of_week = 0 then
    days_to_add := 0;
  else
    days_to_add := 7 - day_of_week;
  end if;
  return base_date + days_to_add;
end;
$$ language plpgsql immutable;

-- Trigger function to snapshot commitment metadata
create or replace function public.snapshot_user_commitment_metadata () returns trigger as $$
declare
  old_commitments jsonb;
  new_commitments jsonb;
  history_count integer;
  effective_date date;
begin
  -- Extract only the commitment-related keys from metadata
  old_commitments := jsonb_build_object(
    'first_sunday', old.metadata->'first_sunday',
    'second_sunday', old.metadata->'second_sunday',
    'third_sunday', old.metadata->'third_sunday',
    'fourth_sunday', old.metadata->'fourth_sunday',
    'fifth_sunday', old.metadata->'fifth_sunday'
  );

  new_commitments := jsonb_build_object(
    'first_sunday', new.metadata->'first_sunday',
    'second_sunday', new.metadata->'second_sunday',
    'third_sunday', new.metadata->'third_sunday',
    'fourth_sunday', new.metadata->'fourth_sunday',
    'fifth_sunday', new.metadata->'fifth_sunday'
  );

  -- Only act if the commitments have changed
  if old_commitments is distinct from new_commitments then
    -- Check if the user has any existing history
    select count(*) into history_count from public.user_commitment_history where user_id = new.id;

    -- If no history exists, insert a baseline snapshot using the OLD metadata effective from a long time ago
    if history_count = 0 then
      insert into public.user_commitment_history (user_id, effective_date, metadata)
      values (new.id, '2000-01-01'::date, old_commitments);
    end if;

    -- Calculate the nearest upcoming Sunday based on current date
    effective_date := public.get_nearest_upcoming_sunday(current_date);

    -- Insert the new snapshot
    insert into public.user_commitment_history (user_id, effective_date, metadata)
    values (new.id, effective_date, new_commitments);
  end if;

  return new;
end;
$$ language plpgsql;

create trigger users_snapshot_commitment_metadata
after update on public.users for each row
execute function public.snapshot_user_commitment_metadata ();

commit;
