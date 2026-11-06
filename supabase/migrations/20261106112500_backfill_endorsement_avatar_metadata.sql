-- Migration: 20261106112500_backfill_endorsement_avatar_metadata.sql
-- Description: Backfill avatar_object_key into approval_requests metadata for recruitment endorsements
begin;

update public.approval_requests ar
set
  metadata = ar.metadata || jsonb_build_object('avatar_object_key', ra.avatar_object_key)
from
  public.recruitment_applications ra
where
  ar.entity_type = 'recruitment_endorsement'
  and ar.entity_id = ra.id
  and ra.avatar_object_key is not null
  and (
    ar.metadata ->> 'avatar_object_key' is null
    or ar.metadata ->> 'avatar_object_key' = ''
  );

commit;
