begin;

-- 1. Add soft-delete column to public.app_settings
alter table public.app_settings
add column if not exists deleted_at timestamptz null;

create index if not exists idx_app_settings_active on public.app_settings (key)
where
  deleted_at is null;

-- 2. Block hard DELETE on public.app_settings (enforce soft delete via deleted_at)
create or replace function public.prevent_app_settings_hard_delete () returns trigger language plpgsql as $$
begin
  raise exception 'Hard deleting rows from public.app_settings is not allowed; set deleted_at instead.';
end;
$$;

drop trigger if exists app_settings_prevent_hard_delete on public.app_settings;

create trigger app_settings_prevent_hard_delete
before delete on public.app_settings for each row
execute function public.prevent_app_settings_hard_delete ();

-- 3. Update RLS policy to exclude soft-deleted rows
drop policy if exists "authenticated can read permitted app settings" on public.app_settings;

create policy "authenticated can read permitted app settings" on public.app_settings for
select
  to authenticated using (
    deleted_at is null
    and (
      is_public = true
      or public.is_admin_viewer ()
      or (
        key = 'recruitment'
        and public.is_recruitment_reviewer ()
      )
    )
  );

-- 4. Update public RPCs & scoring helper to filter deleted_at is null
create or replace function public.get_public_app_settings (p_keys text[] default null) returns jsonb language sql security definer stable
set
  search_path = public as $$
  select coalesce(
    jsonb_object_agg(s.key, s.value),
    '{}'::jsonb
  )
  from public.app_settings s
  where s.is_public = true
    and s.deleted_at is null
    and (p_keys is null or s.key = any(p_keys));
$$;

revoke
execute on function public.get_public_app_settings (text[])
from
  public;

grant
execute on function public.get_public_app_settings (text[]) to anon,
authenticated,
service_role;

create or replace function public.get_public_recruitment_config () returns jsonb language sql security definer stable
set
  search_path = public as $$
  select jsonb_build_object(
    'is_recruitment_open', coalesce((s.value->>'is_recruitment_open')::boolean, false),
    'eligibility_rules', coalesce(s.value->'eligibility_rules', '{}'::jsonb),
    'vmt_registration_url', coalesce(s.value->>'vmt_registration_url', ''),
    'orientation_instructions', coalesce(s.value->>'orientation_instructions', ''),
    'categories', coalesce(s.value->'categories', '["Men","Women","Singles","Youth","B1G","NXTGen"]'::jsonb),
    'role_overview_intro', coalesce(s.value->>'role_overview_intro', ''),
    'role_responsibilities', coalesce(s.value->'role_responsibilities', '{}'::jsonb),
    'privacy_waiver_notice', coalesce(s.value->>'privacy_waiver_notice', ''),
    'applicant_attestation', coalesce(s.value->'applicant_attestation', '[]'::jsonb),
    'applicant_attestation_confirmation', coalesce(s.value->>'applicant_attestation_confirmation', ''),
    'survey_questions', coalesce(
      (
        select jsonb_agg(question.value - 'correct_answer' - 'explanation' order by question.ordinality)
        from jsonb_array_elements(coalesce(s.value->'survey_questions', '[]'::jsonb)) with ordinality as question(value, ordinality)
      ),
      '[]'::jsonb
    )
  )
  from public.app_settings s
  where s.key = 'recruitment'
    and s.deleted_at is null;
$$;

revoke
execute on function public.get_public_recruitment_config ()
from
  public;

grant
execute on function public.get_public_recruitment_config () to anon,
authenticated,
service_role;

create or replace function public.calculate_attendance_score (
  p_attended numeric,
  p_absences numeric,
  p_excused numeric,
  p_wi_9am_3pm numeric,
  p_wi_5th_sunday numeric default 0
) returns numeric language plpgsql security definer stable
set
  search_path = public as $$
declare
  v_weights jsonb;
  v_w_attended numeric := 1.0;
  v_w_absence numeric := -1.0;
  v_w_excused numeric := -0.5;
  v_w_wi_9am_3pm numeric := 0.5;
  v_w_wi_5th_sunday numeric := 1.0;
begin
  select s.value
  into v_weights
  from public.app_settings s
  where s.key = 'attendance_scoring_weights'
    and s.deleted_at is null;

  if v_weights is not null then
    v_w_attended := coalesce((v_weights->>'attended')::numeric, v_w_attended);
    v_w_absence := coalesce((v_weights->>'absence')::numeric, v_w_absence);
    v_w_excused := coalesce((v_weights->>'excused')::numeric, v_w_excused);
    v_w_wi_9am_3pm := coalesce((v_weights->>'walk_in_9am_3pm')::numeric, v_w_wi_9am_3pm);
    v_w_wi_5th_sunday := coalesce((v_weights->>'walk_in_5th_sunday')::numeric, v_w_wi_5th_sunday);
  end if;

  return (coalesce(p_attended, 0) * v_w_attended)
       + (coalesce(p_absences, 0) * v_w_absence)
       + (coalesce(p_excused, 0) * v_w_excused)
       + (coalesce(p_wi_9am_3pm, 0) * v_w_wi_9am_3pm)
       + (coalesce(p_wi_5th_sunday, 0) * v_w_wi_5th_sunday);
end;
$$;

revoke
execute on function public.calculate_attendance_score (numeric, numeric, numeric, numeric, numeric)
from
  public,
  anon;

grant
execute on function public.calculate_attendance_score (numeric, numeric, numeric, numeric, numeric) to authenticated,
service_role;

commit;
