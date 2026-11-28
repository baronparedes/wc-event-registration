begin;

-- Migrate existing recruitment_settings row into app_settings ('recruitment') with extended copy & category defaults
do $$
declare
  v_existing record;
  v_default_payload jsonb := jsonb_build_object(
    'is_recruitment_open', false,
    'eligibility_rules', jsonb_build_object(
      'min_age', 18,
      'max_age', 45,
      'requires_glc1_completed', true,
      'min_dgroup_months', 6
    ),
    'vmt_registration_url', '',
    'orientation_instructions', '',
    'survey_questions', '[]'::jsonb,
    'endorsement_questions', '[]'::jsonb,
    'categories', '["Men","Women","Singles","Youth","B1G","NXTGen"]'::jsonb,
    'role_overview_intro', 'We have the following roles available from which you can choose. Please take a few moments to read through.',
    'role_responsibilities', jsonb_build_object(
      'Prayer Coach', E'Provides a warm and friendly welcome to the guests, gives information about CCF and its ministries, prays for the guests, and shares the gospel as needed.\n\n**This role requires that you have completed CCF''s GLC LEVEL 1 (Book 1 to 4).**',
      'Usher', E'Stationed at the entrance of the Welcome Center to serve as greeters for incoming guests as well as provide support to other volunteers.\n\n- Provides logistical materials needed by the prayer coaches to attend to the guests.\n- Collects and reports data to support church and ministry planning.\n\n**This role requires that you have completed CCF''s GLC LEVEL 1 (Book 1 to 4).**',
      'VMT Support', E'To assist VMT in the recruitment process on Sundays and to follow up on WC volunteers for updates and data gathering.\n\nKnowledgeable in MS Office or willing to be trained.\n\n**This role requires that you have completed CCF''s GLC LEVEL 1 (Book 1 to 4).**',
      'IMT Support', E'To assist IMT in the Guest DGroup Placement on Sundays and to follow up on guests for updates and data gathering.\n\nKnowledgeable in MS Office or willing to be trained.\n\n**This role requires that you have completed CCF''s GLC LEVEL 1 (Book 1 to 4).**',
      'Backroom Support', '[Replace with approved Backroom Support responsibilities.]'
    ),
    'privacy_waiver_notice', 'The information collected and stored will be used solely for the purpose of the CCF WC Ministry, which is not limited to the application and registration process during related events and activities. Changes will only be made upon the collection of updates by CCF WC Ministry and/or the request of the participant. Any and all disposal of data will be carried out securely and within the timeframe provided by CCF. Information stored in a third-party database system is subject to the privacy policy of CCF. The participant waives any and all possible liability upon the disclosure of personal data to CCF.',
    'applicant_attestation', jsonb_build_array(
      'I am a committed member of a DGroup.',
      'I am saved by grace through faith in Jesus and experiencing life transformation.',
      'I pursue spiritual disciplines such as consistent prayer and quiet time.',
      'I do my best to honor God through a daily lifestyle that is above reproach and does not indulge in worldly pleasures and gossiping.',
      'I will practice sexual purity and forgiveness.',
      'I am not involved in a romantic relationship with an unbeliever.',
      'I manage my finances well by minimizing debt and tithing regularly.',
      'I do my best to live a life of integrity in public, private, and social media.',
      'I have a teachable and humble heart, open to accountability and correction by my DGroup and ministry leader.',
      'I want to be used by God to disciple others and help to disciple others.',
      'I have completed GLC Level 1 (Book 1 to 4).',
      'I know by heart CCF''s mission and vision.'
    ),
    'applicant_attestation_confirmation', 'I confirm the truth of the foregoing and hereby commit with all my heart to continue living my life pursuant to these principles.'
  );
  v_final_payload jsonb;
begin
  if to_regclass('public.recruitment_settings') is not null then
    select
      is_recruitment_open,
      eligibility_rules,
      vmt_registration_url,
      orientation_instructions,
      survey_questions,
      endorsement_questions
    into v_existing
    from public.recruitment_settings
    where id = 1;

    if found then
      v_final_payload := v_default_payload || jsonb_build_object(
        'is_recruitment_open', v_existing.is_recruitment_open,
        'eligibility_rules', v_existing.eligibility_rules,
        'vmt_registration_url', v_existing.vmt_registration_url,
        'orientation_instructions', v_existing.orientation_instructions,
        'survey_questions', v_existing.survey_questions,
        'endorsement_questions', v_existing.endorsement_questions
      );
    else
      v_final_payload := v_default_payload;
    end if;
  else
    v_final_payload := v_default_payload;
  end if;

  insert into public.app_settings (key, value, is_public, description)
  values (
    'recruitment',
    v_final_payload,
    false,
    'Volunteer recruitment pipeline configuration, eligibility rules, doctrinal survey, endorsement questions, and applicant copy.'
  )
  on conflict (key) do update
  set value = excluded.value;
end $$;

-- Update get_public_recruitment_config to read from app_settings ('recruitment')
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
  where s.key = 'recruitment';
$$;

revoke
execute on function public.get_public_recruitment_config ()
from
  public;

grant
execute on function public.get_public_recruitment_config () to anon,
authenticated,
service_role;

-- Drop legacy singleton recruitment_settings table
drop table if exists public.recruitment_settings;

commit;
