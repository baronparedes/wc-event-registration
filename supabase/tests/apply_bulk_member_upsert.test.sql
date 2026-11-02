begin;

select
  extensions.plan (9);

create temporary table member_upsert_test_fixture (
  user_id uuid not null default gen_random_uuid(),
  member_id text not null default 'test-mem-001'
) on
commit
drop;

insert into
  member_upsert_test_fixture
default values;

-- 1. Insert a member with metadata, Sunday commitment, start_date, and contact info
select
  extensions.is (
    (
      select
        inserted_count
      from
        public.apply_bulk_member_upsert (
          jsonb_build_array(
            jsonb_build_object(
              'operation',
              'insert',
              'member_id',
              (
                select
                  member_id
                from
                  member_upsert_test_fixture
              ),
              'first_name',
              'Test',
              'last_name',
              'User',
              'nickname',
              'Tester',
              'email',
              'tester@example.com',
              'phone',
              '09171234567',
              'date_of_birth',
              '1990-01-01',
              'role',
              'Prayer Coach',
              'category',
              'Adults',
              'metadata',
              jsonb_build_object(
                'first_sunday',
                '9AM',
                'start_date',
                '2026-01-01',
                'is_oic',
                true,
                'role',
                'LegacyRole',
                'category',
                'LegacyCategory'
              )
            )
          )
        )
    ),
    1,
    'apply_bulk_member_upsert successfully inserts 1 member'
  );

-- Store inserted user id
update member_upsert_test_fixture
set
  user_id = (
    select
      id
    from
      public.users
    where
      member_id = (
        select
          member_id
        from
          member_upsert_test_fixture
      )
  );

-- 2. Verify inserted user has metadata properly initialized (and role/category pruned)
select
  extensions.is (
    (
      select
        metadata
      from
        public.users
      where
        id = (
          select
            user_id
          from
            member_upsert_test_fixture
        )
    ),
    jsonb_build_object(
      'first_sunday',
      '9AM',
      'start_date',
      '2026-01-01',
      'is_oic',
      true
    ),
    'insert prunes legacy role/category and stores valid metadata keys'
  );

-- 3. Update the member with an omitted metadata payload (empty metadata: {}) and null contact info
select
  extensions.is (
    (
      select
        updated_count
      from
        public.apply_bulk_member_upsert (
          jsonb_build_array(
            jsonb_build_object(
              'operation',
              'update',
              'target_id',
              (
                select
                  user_id
                from
                  member_upsert_test_fixture
              )::text,
              'member_id',
              (
                select
                  member_id
                from
                  member_upsert_test_fixture
              ),
              'first_name',
              'Test Updated',
              'last_name',
              'User',
              'nickname',
              'Tester',
              'email',
              null,
              'phone',
              null,
              'date_of_birth',
              null,
              'role',
              'Usher',
              'category',
              'Adults',
              'metadata',
              '{}'::jsonb
            )
          )
        )
    ),
    1,
    'apply_bulk_member_upsert successfully updates 1 member'
  );

-- 4. Verify existing metadata keys (first_sunday, start_date, is_oic) are preserved
select
  extensions.is (
    (
      select
        metadata
      from
        public.users
      where
        id = (
          select
            user_id
          from
            member_upsert_test_fixture
        )
    ),
    jsonb_build_object(
      'first_sunday',
      '9AM',
      'start_date',
      '2026-01-01',
      'is_oic',
      true
    ),
    'metadata fields are preserved when omitted from update payload'
  );

-- 5. Verify email, phone, and date_of_birth are preserved when null in update payload
select
  extensions.is (
    (
      select
        email || '|' || phone || '|' || date_of_birth::text
      from
        public.users
      where
        id = (
          select
            user_id
          from
            member_upsert_test_fixture
        )
    ),
    'tester@example.com|09171234567|1990-01-01',
    'contact details (email, phone, date_of_birth) are coalesced and preserved'
  );

-- 6. Update with partial metadata change (only updating is_oic to false, leaving first_sunday and start_date omitted)
select
  extensions.is (
    (
      select
        updated_count
      from
        public.apply_bulk_member_upsert (
          jsonb_build_array(
            jsonb_build_object(
              'operation',
              'update',
              'target_id',
              (
                select
                  user_id
                from
                  member_upsert_test_fixture
              )::text,
              'member_id',
              (
                select
                  member_id
                from
                  member_upsert_test_fixture
              ),
              'first_name',
              'Test Updated',
              'last_name',
              'User',
              'nickname',
              'Tester',
              'email',
              'tester@example.com',
              'phone',
              '09171234567',
              'date_of_birth',
              '1990-01-01',
              'role',
              'Usher',
              'category',
              'Adults',
              'metadata',
              jsonb_build_object('is_oic', false)
            )
          )
        )
    ),
    1,
    'partial metadata update executes successfully'
  );

-- 7. Verify partial metadata update modifies target key while retaining omitted keys
select
  extensions.is (
    (
      select
        metadata
      from
        public.users
      where
        id = (
          select
            user_id
          from
            member_upsert_test_fixture
        )
    ),
    jsonb_build_object(
      'first_sunday',
      '9AM',
      'start_date',
      '2026-01-01',
      'is_oic',
      false
    ),
    'partial metadata update modifies target key while retaining omitted keys'
  );

-- 8. Update explicitly overwriting first_sunday with a new commitment
select
  extensions.is (
    (
      select
        updated_count
      from
        public.apply_bulk_member_upsert (
          jsonb_build_array(
            jsonb_build_object(
              'operation',
              'update',
              'target_id',
              (
                select
                  user_id
                from
                  member_upsert_test_fixture
              )::text,
              'member_id',
              (
                select
                  member_id
                from
                  member_upsert_test_fixture
              ),
              'first_name',
              'Test Updated',
              'last_name',
              'User',
              'nickname',
              'Tester',
              'email',
              'tester@example.com',
              'phone',
              '09171234567',
              'date_of_birth',
              '1990-01-01',
              'role',
              'Usher',
              'category',
              'Adults',
              'metadata',
              jsonb_build_object('first_sunday', '11AM')
            )
          )
        )
    ),
    1,
    'explicit metadata overwrite executes successfully'
  );

-- 9. Verify first_sunday is updated to 11AM while start_date and is_oic remain intact
select
  extensions.is (
    (
      select
        metadata
      from
        public.users
      where
        id = (
          select
            user_id
          from
            member_upsert_test_fixture
        )
    ),
    jsonb_build_object(
      'first_sunday',
      '11AM',
      'start_date',
      '2026-01-01',
      'is_oic',
      false
    ),
    'explicit metadata update overwrites specified key and preserves other keys'
  );

select
  *
from
  extensions.finish ();

rollback;
