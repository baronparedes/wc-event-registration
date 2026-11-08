-- Migration: 20261108130000_create_bulk_recruitment_import_rpc.sql
-- Description: Create atomic bulk import RPC for recruitment applications, pipeline transactions, and synthesized endorsements
begin;

create or replace function public.apply_bulk_recruitment_import (p_rows jsonb) returns table (inserted_count integer, skipped_count integer) language plpgsql security definer
set
  search_path = public as $$
declare
  v_row jsonb;
  v_app_id uuid;
  v_approval_id uuid;
  v_email text;
  v_first_name text;
  v_middle_name text;
  v_last_name text;
  v_full_name text;
  v_nickname text;
  v_phone text;
  v_dob date;
  v_gender text;
  v_life_stage text;
  v_desired_role text;
  v_confirmed_role text;
  v_status text;
  v_current_step integer;
  v_created_at timestamptz;
  v_attested_at timestamptz;
  v_personal_details jsonb;
  v_emergency_contact jsonb;
  v_application_history jsonb;
  v_spiritual_background jsonb;
  v_dgroup_info jsonb;
  v_is_endorsed boolean;
  v_transactions jsonb;
  v_tx jsonb;
  v_step_number integer;
  v_step_key text;
  v_tx_type text;
  v_tx_status text;
  v_scheduled_at timestamptz;
  v_completed_at timestamptz;
  v_inserted_count integer := 0;
  v_skipped_count integer := 0;
begin
  -- Access control check: service_role or admin user
  if auth.role() <> 'service_role' and not public.is_admin() then
    raise exception 'Unauthorized: Only administrators can import recruitment applications';
  end if;

  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for v_row in
    select value
    from jsonb_array_elements(p_rows)
  loop
    v_email := lower(trim(coalesce(v_row ->> 'email', '')));

    if v_email is null or v_email = '' then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    -- Skip if email already exists
    if exists (
      select 1
      from public.recruitment_applications
      where lower(email) = v_email
    ) then
      v_skipped_count := v_skipped_count + 1;
      continue;
    end if;

    v_first_name := trim(coalesce(v_row ->> 'first_name', ''));
    v_middle_name := nullif(trim(coalesce(v_row ->> 'middle_name', '')), '');
    v_last_name := trim(coalesce(v_row ->> 'last_name', ''));
    v_full_name := trim(coalesce(
      v_row ->> 'full_name',
      concat_ws(' ', v_first_name, nullif(v_middle_name, ''), v_last_name)
    ));
    v_nickname := trim(coalesce(v_row ->> 'nickname', v_first_name));
    v_phone := trim(coalesce(v_row ->> 'phone', ''));
    v_dob := (v_row ->> 'date_of_birth')::date;
    v_gender := coalesce(v_row ->> 'gender', 'Male');
    v_life_stage := coalesce(v_row ->> 'life_stage', 'Single');
    v_desired_role := coalesce(v_row ->> 'desired_role', 'Usher');
    v_confirmed_role := nullif(trim(coalesce(v_row ->> 'confirmed_role', '')), '');
    v_status := coalesce(v_row ->> 'status', 'active');
    v_current_step := coalesce((v_row ->> 'current_step')::integer, 1);
    v_created_at := coalesce((v_row ->> 'created_at')::timestamptz, now());
    v_attested_at := coalesce((v_row ->> 'applicant_attested_at')::timestamptz, v_created_at);

    v_personal_details := case
      when jsonb_typeof(v_row -> 'personal_details') = 'object' then v_row -> 'personal_details'
      else '{}'::jsonb
    end;

    v_emergency_contact := case
      when jsonb_typeof(v_row -> 'emergency_contact') = 'object' then v_row -> 'emergency_contact'
      else '{}'::jsonb
    end;

    v_application_history := case
      when jsonb_typeof(v_row -> 'application_history') = 'object' then v_row -> 'application_history'
      else '{}'::jsonb
    end;

    v_spiritual_background := case
      when jsonb_typeof(v_row -> 'spiritual_background') = 'object' then v_row -> 'spiritual_background'
      else '{}'::jsonb
    end;

    v_dgroup_info := case
      when jsonb_typeof(v_row -> 'dgroup_info') = 'object' then v_row -> 'dgroup_info'
      else '{}'::jsonb
    end;

    v_is_endorsed := coalesce((v_row ->> 'is_endorsed')::boolean, false);
    v_transactions := v_row -> 'transactions';

    -- Insert recruitment application
    insert into public.recruitment_applications (
      email,
      first_name,
      middle_name,
      last_name,
      full_name,
      nickname,
      phone,
      date_of_birth,
      gender,
      life_stage,
      desired_role,
      confirmed_role,
      status,
      current_step,
      created_at,
      updated_at,
      applicant_attested_at,
      personal_details,
      emergency_contact,
      application_history,
      spiritual_background,
      dgroup_info,
      survey_answers,
      survey_score,
      survey_total
    ) values (
      v_email,
      v_first_name,
      v_middle_name,
      v_last_name,
      v_full_name,
      v_nickname,
      v_phone,
      v_dob,
      v_gender,
      v_life_stage,
      v_desired_role,
      v_confirmed_role,
      v_status,
      v_current_step,
      v_created_at,
      v_created_at,
      v_attested_at,
      v_personal_details,
      v_emergency_contact,
      v_application_history,
      v_spiritual_background,
      v_dgroup_info,
      '{}'::jsonb,
      0,
      0
    )
    returning id into v_app_id;

    -- If applicant is endorsed, synthesize approval_requests entry
    if v_is_endorsed then
      insert into public.approval_requests (
        entity_type,
        entity_id,
        status,
        title,
        summary,
        requester_name,
        requester_email,
        assigned_to_email,
        decided_at,
        metadata,
        created_at,
        updated_at
      ) values (
        'recruitment_endorsement',
        v_app_id,
        'approved',
        'Recruitment Endorsement - ' || v_full_name,
        'Historical endorsement from legacy recruitment record',
        v_full_name,
        v_email,
        nullif(lower(trim(coalesce(v_dgroup_info ->> 'leader_email', ''))), ''),
        v_created_at,
        jsonb_build_object(
          'leader_name', v_dgroup_info ->> 'leader_name',
          'leader_phone', v_dgroup_info ->> 'leader_phone',
          'applicant_name', v_full_name,
          'migrated_from_legacy', true
        ),
        v_created_at,
        v_created_at
      )
      returning id into v_approval_id;

      update public.recruitment_applications
      set dgroup_approval_id = v_approval_id
      where id = v_app_id;
    end if;

    -- Insert pipeline transactions if provided
    if v_transactions is not null and jsonb_typeof(v_transactions) = 'array' then
      for v_tx in
        select value
        from jsonb_array_elements(v_transactions)
      loop
        v_step_number := (v_tx ->> 'step_number')::integer;
        v_step_key := v_tx ->> 'step_key';
        v_tx_type := coalesce(v_tx ->> 'transaction_type', 'completed');
        v_tx_status := coalesce(v_tx ->> 'status', 'completed');
        v_scheduled_at := (v_tx ->> 'scheduled_at')::timestamptz;
        v_completed_at := coalesce((v_tx ->> 'completed_at')::timestamptz, v_created_at);

        insert into public.recruitment_pipeline_transactions (
          application_id,
          step_number,
          step_key,
          attempt_number,
          transaction_type,
          status,
          scheduled_at,
          completed_at,
          notes,
          created_at
        ) values (
          v_app_id,
          v_step_number,
          v_step_key,
          1,
          v_tx_type,
          v_tx_status,
          v_scheduled_at,
          case when v_tx_status = 'completed' then v_completed_at else null end,
          coalesce(v_tx ->> 'notes', 'Migrated from legacy application record'),
          v_created_at
        )
        on conflict (application_id, step_number, attempt_number) do nothing;
      end loop;
    end if;

    v_inserted_count := v_inserted_count + 1;
  end loop;

  return query select v_inserted_count, v_skipped_count;
end;
$$;

revoke all on function public.apply_bulk_recruitment_import (jsonb)
from
  public,
  anon,
  authenticated;

grant
execute on function public.apply_bulk_recruitment_import (jsonb) to authenticated,
service_role;

commit;
