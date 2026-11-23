-- Consolidate duplicate metadata.volunteer_id into canonical metadata.volunteerid
-- and remove the stray volunteer_id key created by earlier Google Sheet sync runs.
begin;

update public.users
set
  metadata = case
    when nullif(btrim(metadata ->> 'volunteerid'), '') is null
    and nullif(btrim(metadata ->> 'volunteer_id'), '') is not null then (metadata - 'volunteer_id') || jsonb_build_object('volunteerid', metadata -> 'volunteer_id')
    else metadata - 'volunteer_id'
  end
where
  metadata is not null
  and metadata ? 'volunteer_id';

commit;
