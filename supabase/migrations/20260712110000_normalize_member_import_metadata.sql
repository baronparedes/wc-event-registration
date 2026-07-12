begin;

with normalized as (
  select
    id,
    metadata,
    jsonb_strip_nulls(
      jsonb_build_object(
        'role', metadata -> 'role',
        'category', metadata -> 'category',
        'sr_pwd', metadata -> 'sr_pwd',
        'is_oic', coalesce(metadata -> 'is_oic', metadata -> 'isoic'),
        'first_sunday', coalesce(
          metadata -> 'first_sunday',
          metadata -> '1st_sunday',
          metadata -> 'availability' -> 'first_sunday'
        ),
        'second_sunday', coalesce(
          metadata -> 'second_sunday',
          metadata -> '2nd_sunday',
          metadata -> 'availability' -> 'second_sunday'
        ),
        'third_sunday', coalesce(
          metadata -> 'third_sunday',
          metadata -> '3rd_sunday',
          metadata -> 'availability' -> 'third_sunday'
        ),
        'fourth_sunday', coalesce(
          metadata -> 'fourth_sunday',
          metadata -> '4th_sunday',
          metadata -> 'availability' -> 'fourth_sunday'
        ),
        'fifth_sunday', coalesce(
          metadata -> 'fifth_sunday',
          metadata -> '5th_sunday',
          metadata -> 'availability' -> 'fifth_sunday'
        )
      )
    ) as canonical_import_metadata
  from public.users
)
update public.users as u
set
  metadata = (
    (
      coalesce(n.metadata, '{}'::jsonb)
      - 'role'
      - 'category'
      - 'sr_pwd'
      - 'is_oic'
      - 'isoic'
      - 'availability'
      - '1st_sunday'
      - '2nd_sunday'
      - '3rd_sunday'
      - '4th_sunday'
      - '5th_sunday'
      - 'first_sunday'
      - 'second_sunday'
      - 'third_sunday'
      - 'fourth_sunday'
      - 'fifth_sunday'
    )
    || n.canonical_import_metadata
  ),
  updated_at = now()
from normalized as n
where u.id = n.id
  and (
    n.metadata ? 'availability'
    or n.metadata ? 'isoic'
    or n.metadata ? '1st_sunday'
    or n.metadata ? '2nd_sunday'
    or n.metadata ? '3rd_sunday'
    or n.metadata ? '4th_sunday'
    or n.metadata ? '5th_sunday'
  );

commit;
