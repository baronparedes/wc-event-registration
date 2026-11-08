-- Migration: 20261107003000_update_deploy_recruitment_applicant_rpc.sql
-- Description: Consolidated Phase 5 update of deploy_recruitment_applicant (supersedes the
-- original 20261102065904 definition). Squashes the previously separate branch migrations that:
--   * copied applicant avatar_object_key into public.users on deployment,
--   * allowed deployment from Step 8 (RFID releasing) or Step 9 (deployment),
--   * populated the complete member directory metadata (age, city, is_oic, sr_pwd, dob_*,
--     ccf_vmt_*, dgroup_*, Sunday commitment strings, etc.) into public.users.metadata.
-- Also backfills metadata for any recruitment application that was already deployed.
begin;

create or replace function public.deploy_recruitment_applicant (p_application_id uuid) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_user_id uuid;
  v_next_step_8_attempt integer;
  v_next_step_9_attempt integer;
  v_metadata jsonb;
  v_first_sunday text;
  v_second_sunday text;
  v_third_sunday text;
  v_fourth_sunday text;
  v_fifth_sunday text;
  v_age text := '';
  v_dob_day text := '';
  v_dob_month text := '';
  v_dob_year text := '';
  v_is_sr_pwd boolean := false;
  v_is_oic boolean := false;
begin
  if not (
    public.is_admin_or_slod()
    or auth.role() = 'service_role'
    or current_user = 'service_role'
  ) then
    raise exception 'unauthorized';
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.id = p_application_id
  for update;

  if not found then
    raise exception 'Recruitment application not found';
  end if;

  if v_application.status = 'deployed' and v_application.promoted_user_id is not null then
    return jsonb_build_object(
      'success', true,
      'application_id', v_application.id,
      'user_id', v_application.promoted_user_id,
      'member_id', v_application.assigned_rfid_member_id,
      'already_deployed', true
    );
  end if;

  if v_application.status <> 'active' or v_application.current_step not in (8, 9) then
    raise exception 'Applicant must be active at Step 8 or Step 9 before deployment';
  end if;

  if v_application.confirmed_role is null then
    raise exception 'Applicant must have a confirmed role before deployment';
  end if;

  if not v_application.vmt_registered
    or nullif(trim(v_application.ccf_vmt_id), '') is null
    or v_application.ccf_vmt_date is null then
    raise exception 'CCF VMT registration must be completed and verified before deployment';
  end if;

  if nullif(trim(v_application.assigned_rfid_member_id), '') is null then
    raise exception 'An RFID member ID must be assigned before deployment';
  end if;

  if not exists (
    select 1
    from jsonb_each(v_application.service_commitments) as commitment(key, value)
    where commitment.key in ('first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday')
      and case jsonb_typeof(commitment.value)
        when 'array' then jsonb_array_length(commitment.value) > 0
        when 'string' then length(trim(commitment.value #>> '{}')) > 0
        when 'boolean' then commitment.value = 'true'::jsonb
        else false
      end
  ) then
    raise exception 'At least one Sunday service commitment is required before deployment';
  end if;

  select user_record.id
  into v_user_id
  from public.users user_record
  where lower(user_record.email) = lower(v_application.email)
  for update;

  if exists (
    select 1
    from public.users user_record
    where user_record.member_id = v_application.assigned_rfid_member_id
      and (v_user_id is null or user_record.id <> v_user_id)
  ) then
    raise exception 'Assigned RFID member ID is already in use';
  end if;

  -- Compute DOB & Age metadata
  if v_application.date_of_birth is not null then
    v_age := extract(year from age(current_date, v_application.date_of_birth))::text;
    v_dob_day := extract(day from v_application.date_of_birth)::text;
    v_dob_month := extract(month from v_application.date_of_birth)::text;
    v_dob_year := extract(year from v_application.date_of_birth)::text;
    v_is_sr_pwd := (extract(year from age(current_date, v_application.date_of_birth)) >= 60);
  end if;

  v_is_oic := (v_application.confirmed_role = 'OIC' or v_application.desired_role = 'OIC');

  -- Extract each Sunday commitment as comma-separated text string
  select coalesce(
    case jsonb_typeof(v_application.service_commitments->'first_sunday')
      when 'array' then (
        select string_agg(val, ', ')
        from jsonb_array_elements_text(v_application.service_commitments->'first_sunday') as val
      )
      when 'string' then trim(v_application.service_commitments->>'first_sunday')
      else ''
    end,
    ''
  ) into v_first_sunday;

  select coalesce(
    case jsonb_typeof(v_application.service_commitments->'second_sunday')
      when 'array' then (
        select string_agg(val, ', ')
        from jsonb_array_elements_text(v_application.service_commitments->'second_sunday') as val
      )
      when 'string' then trim(v_application.service_commitments->>'second_sunday')
      else ''
    end,
    ''
  ) into v_second_sunday;

  select coalesce(
    case jsonb_typeof(v_application.service_commitments->'third_sunday')
      when 'array' then (
        select string_agg(val, ', ')
        from jsonb_array_elements_text(v_application.service_commitments->'third_sunday') as val
      )
      when 'string' then trim(v_application.service_commitments->>'third_sunday')
      else ''
    end,
    ''
  ) into v_third_sunday;

  select coalesce(
    case jsonb_typeof(v_application.service_commitments->'fourth_sunday')
      when 'array' then (
        select string_agg(val, ', ')
        from jsonb_array_elements_text(v_application.service_commitments->'fourth_sunday') as val
      )
      when 'string' then trim(v_application.service_commitments->>'fourth_sunday')
      else ''
    end,
    ''
  ) into v_fourth_sunday;

  select coalesce(
    case jsonb_typeof(v_application.service_commitments->'fifth_sunday')
      when 'array' then (
        select string_agg(val, ', ')
        from jsonb_array_elements_text(v_application.service_commitments->'fifth_sunday') as val
      )
      when 'string' then trim(v_application.service_commitments->>'fifth_sunday')
      else ''
    end,
    ''
  ) into v_fifth_sunday;

  -- Construct comprehensive user metadata matching Member directory schema
  v_metadata := jsonb_build_object(
    'age', v_age,
    'city', coalesce(v_application.personal_details->>'city', ''),
    'is_oic', v_is_oic,
    'sr_pwd', v_is_sr_pwd,
    'dob_day', v_dob_day,
    'dob_year', v_dob_year,
    'dob_month', v_dob_month,
    'timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'),
    'ccf_vmt_id', coalesce(v_application.ccf_vmt_id, ''),
    'occupation', coalesce(v_application.personal_details->>'occupation', ''),
    'data_source', 'recruitment_pipeline',
    'match_level', 'LEVEL1_EXACT',
    'powerappsid', v_application.id::text,
    'volunteerid', coalesce(v_application.assigned_rfid_member_id, ''),
    'ccf_vmt_date', coalesce(v_application.ccf_vmt_date::text, ''),
    'civil_status', coalesce(v_application.life_stage, ''),
    'dgroup_since', coalesce(v_application.dgroup_info->>'leader_since', v_application.dgroup_info->>'member_since', ''),
    'dgroup_member_since', coalesce(v_application.dgroup_info->>'member_since', ''),
    'dgroup_leader', coalesce(v_application.dgroup_info->>'leader_name', ''),
    'dgroup_leader_email', coalesce(v_application.dgroup_info->>'leader_email', ''),
    'dgroup_leader_contact', coalesce(v_application.dgroup_info->>'leader_phone', ''),
    'dgroup_status', case when (v_application.dgroup_info->>'is_dgroup_leader')::boolean = true then 'leader' else 'member' end,
    'blockage_count', false,
    'languages_spoken', coalesce(v_application.personal_details->>'languages_spoken', 'English, Tagalog'),
    'match_confidence', '100%',
    'manual_entry_count', false,
    'first_sunday', v_first_sunday,
    'second_sunday', v_second_sunday,
    'third_sunday', v_third_sunday,
    'fourth_sunday', v_fourth_sunday,
    'fifth_sunday', v_fifth_sunday
  );

  insert into public.users (
    member_id,
    first_name,
    last_name,
    full_name,
    nickname,
    email,
    phone,
    date_of_birth,
    role,
    category,
    metadata,
    avatar_object_key,
    is_active
  )
  values (
    v_application.assigned_rfid_member_id,
    v_application.first_name,
    v_application.last_name,
    v_application.full_name,
    v_application.nickname,
    lower(v_application.email),
    v_application.phone,
    v_application.date_of_birth,
    v_application.confirmed_role,
    v_application.life_stage,
    v_metadata,
    v_application.avatar_object_key,
    true
  )
  on conflict (lower(email)) where email is not null
  do update set
    member_id = excluded.member_id,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    full_name = excluded.full_name,
    nickname = excluded.nickname,
    phone = excluded.phone,
    date_of_birth = excluded.date_of_birth,
    role = excluded.role,
    category = excluded.category,
    metadata = coalesce(public.users.metadata, '{}'::jsonb) || excluded.metadata,
    avatar_object_key = coalesce(excluded.avatar_object_key, public.users.avatar_object_key),
    is_active = true,
    updated_at = now()
  returning id into v_user_id;

  if v_application.current_step = 8 then
    select coalesce(max(transaction.attempt_number), 0) + 1
    into v_next_step_8_attempt
    from public.recruitment_pipeline_transactions transaction
    where transaction.application_id = v_application.id
      and transaction.step_number = 8;

    insert into public.recruitment_pipeline_transactions (
      application_id,
      step_number,
      step_key,
      attempt_number,
      transaction_type,
      from_step,
      to_step,
      status,
      assigned_reviewer_id,
      created_by_user_id,
      completed_at
    )
    values (
      v_application.id,
      8,
      'rfid_releasing',
      v_next_step_8_attempt,
      'completed',
      8,
      9,
      'completed',
      auth.uid(),
      auth.uid(),
      now()
    );
  end if;

  select coalesce(max(transaction.attempt_number), 0) + 1
  into v_next_step_9_attempt
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id
    and transaction.step_number = 9;

  insert into public.recruitment_pipeline_transactions (
    application_id,
    step_number,
    step_key,
    attempt_number,
    transaction_type,
    from_step,
    to_step,
    status,
    assigned_reviewer_id,
    created_by_user_id,
    completed_at
  )
  values (
    v_application.id,
    9,
    'deployment',
    v_next_step_9_attempt,
    'completed',
    v_application.current_step,
    9,
    'completed',
    auth.uid(),
    auth.uid(),
    now()
  );

  update public.recruitment_applications
  set status = 'deployed',
      current_step = 9,
      promoted_user_id = v_user_id,
      deployed_at = now()
  where id = v_application.id;

  return jsonb_build_object(
    'success', true,
    'application_id', v_application.id,
    'user_id', v_user_id,
    'member_id', v_application.assigned_rfid_member_id,
    'already_deployed', false
  );
end;
$$;

revoke
execute on function public.deploy_recruitment_applicant (uuid)
from
  public,
  anon;

grant
execute on function public.deploy_recruitment_applicant (uuid) to authenticated,
service_role;

-- Backfill metadata for any recruitment application that was already deployed
update public.users u
set
  metadata = coalesce(u.metadata, '{}'::jsonb) || jsonb_build_object(
    'age',
    coalesce(
      extract(
        year
        from
          age (current_date, a.date_of_birth)
      )::text,
      ''
    ),
    'city',
    coalesce(a.personal_details ->> 'city', ''),
    'is_oic',
    (
      a.confirmed_role = 'OIC'
      or a.desired_role = 'OIC'
    ),
    'sr_pwd',
    coalesce(
      extract(
        year
        from
          age (current_date, a.date_of_birth)
      ) >= 60,
      false
    ),
    'dob_day',
    coalesce(
      extract(
        day
        from
          a.date_of_birth
      )::text,
      ''
    ),
    'dob_year',
    coalesce(
      extract(
        year
        from
          a.date_of_birth
      )::text,
      ''
    ),
    'dob_month',
    coalesce(
      extract(
        month
        from
          a.date_of_birth
      )::text,
      ''
    ),
    'timestamp',
    to_char(
      coalesce(a.deployed_at, now()),
      'YYYY-MM-DD HH24:MI:SS'
    ),
    'ccf_vmt_id',
    coalesce(a.ccf_vmt_id, ''),
    'occupation',
    coalesce(a.personal_details ->> 'occupation', ''),
    'data_source',
    'recruitment_pipeline',
    'match_level',
    'LEVEL1_EXACT',
    'powerappsid',
    a.id::text,
    'volunteerid',
    coalesce(a.assigned_rfid_member_id, ''),
    'ccf_vmt_date',
    coalesce(a.ccf_vmt_date::text, ''),
    'civil_status',
    coalesce(a.life_stage, ''),
    'dgroup_since',
    coalesce(
      a.dgroup_info ->> 'leader_since',
      a.dgroup_info ->> 'member_since',
      ''
    ),
    'dgroup_member_since',
    coalesce(a.dgroup_info ->> 'member_since', ''),
    'dgroup_leader',
    coalesce(a.dgroup_info ->> 'leader_name', ''),
    'dgroup_leader_email',
    coalesce(a.dgroup_info ->> 'leader_email', ''),
    'dgroup_leader_contact',
    coalesce(a.dgroup_info ->> 'leader_phone', ''),
    'dgroup_status',
    case
      when (a.dgroup_info ->> 'is_dgroup_leader')::boolean = true then 'leader'
      else 'member'
    end,
    'blockage_count',
    false,
    'languages_spoken',
    coalesce(
      a.personal_details ->> 'languages_spoken',
      'English, Tagalog'
    ),
    'match_confidence',
    '100%',
    'manual_entry_count',
    false,
    'first_sunday',
    coalesce(
      case jsonb_typeof(a.service_commitments -> 'first_sunday')
        when 'array' then (
          select
            string_agg(val, ', ')
          from
            jsonb_array_elements_text(a.service_commitments -> 'first_sunday') as val
        )
        when 'string' then trim(a.service_commitments ->> 'first_sunday')
        else ''
      end,
      ''
    ),
    'second_sunday',
    coalesce(
      case jsonb_typeof(a.service_commitments -> 'second_sunday')
        when 'array' then (
          select
            string_agg(val, ', ')
          from
            jsonb_array_elements_text(a.service_commitments -> 'second_sunday') as val
        )
        when 'string' then trim(a.service_commitments ->> 'second_sunday')
        else ''
      end,
      ''
    ),
    'third_sunday',
    coalesce(
      case jsonb_typeof(a.service_commitments -> 'third_sunday')
        when 'array' then (
          select
            string_agg(val, ', ')
          from
            jsonb_array_elements_text(a.service_commitments -> 'third_sunday') as val
        )
        when 'string' then trim(a.service_commitments ->> 'third_sunday')
        else ''
      end,
      ''
    ),
    'fourth_sunday',
    coalesce(
      case jsonb_typeof(a.service_commitments -> 'fourth_sunday')
        when 'array' then (
          select
            string_agg(val, ', ')
          from
            jsonb_array_elements_text(a.service_commitments -> 'fourth_sunday') as val
        )
        when 'string' then trim(a.service_commitments ->> 'fourth_sunday')
        else ''
      end,
      ''
    ),
    'fifth_sunday',
    coalesce(
      case jsonb_typeof(a.service_commitments -> 'fifth_sunday')
        when 'array' then (
          select
            string_agg(val, ', ')
          from
            jsonb_array_elements_text(a.service_commitments -> 'fifth_sunday') as val
        )
        when 'string' then trim(a.service_commitments ->> 'fifth_sunday')
        else ''
      end,
      ''
    )
  )
from
  public.recruitment_applications a
where
  a.promoted_user_id = u.id
  and a.status = 'deployed';

commit;
