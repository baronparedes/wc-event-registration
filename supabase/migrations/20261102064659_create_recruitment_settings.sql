begin;

create table if not exists public.recruitment_settings (
  id integer primary key check (id = 1),
  is_recruitment_open boolean not null default false,
  eligibility_rules jsonb not null default '{}'::jsonb,
  vmt_registration_url text not null default '',
  orientation_instructions text not null default '',
  survey_questions jsonb not null default '[]'::jsonb,
  endorsement_questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  constraint recruitment_settings_survey_questions_array check (jsonb_typeof(survey_questions) = 'array'),
  constraint recruitment_settings_endorsement_questions_array check (jsonb_typeof(endorsement_questions) = 'array')
);

alter table public.recruitment_settings enable row level security;

drop policy if exists "recruitment reviewers can read recruitment settings" on public.recruitment_settings;

create policy "recruitment reviewers can read recruitment settings" on public.recruitment_settings for
select
  to authenticated using (public.is_recruitment_reviewer ());

drop policy if exists "service role can manage recruitment settings" on public.recruitment_settings;

create policy "service role can manage recruitment settings" on public.recruitment_settings for all to service_role using (true)
with
  check (true);

revoke all on public.recruitment_settings
from
  public,
  anon,
  authenticated;

grant
select
  on public.recruitment_settings to authenticated;

grant all on public.recruitment_settings to service_role;

drop trigger if exists recruitment_settings_set_updated_at on public.recruitment_settings;

create trigger recruitment_settings_set_updated_at
before update on public.recruitment_settings for each row
execute function public.set_updated_at ();

insert into
  public.recruitment_settings (
    id,
    is_recruitment_open,
    eligibility_rules,
    survey_questions,
    endorsement_questions
  )
values
  (
    1,
    false,
    '{"min_age":18,"max_age":45,"requires_glc1_completed":true,"min_dgroup_months":6}'::jsonb,
    $survey$[
    {"id":"sq_1","field_key":"survey_q1","label":"Jesus Christ is God.","field_type":"radio","is_required":true,"is_active":true,"display_order":1,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"Jesus Christ is God (John 1:1, 10:30; Colossians 2:9)."},
    {"id":"sq_2","field_key":"survey_q2","label":"Salvation is given by God's grace and cannot be earned by man through good works, baptism, church membership, or any other means.","field_type":"radio","is_required":true,"is_active":true,"display_order":2,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"Salvation is given by God's grace and cannot be earned through good works, baptism, or church membership."},
    {"id":"sq_3","field_key":"survey_q3","label":"Salvation means that the believer will no longer commit any sin.","field_type":"radio","is_required":true,"is_active":true,"display_order":3,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"Believers can still commit sin while being sanctified, though they are forgiven in Christ (1 John 1:8-9)."},
    {"id":"sq_4","field_key":"survey_q4","label":"Jesus is not the only mediator between God and man.","field_type":"radio","is_required":true,"is_active":true,"display_order":4,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"Jesus is the only mediator between God and man (1 Timothy 2:5)."},
    {"id":"sq_5","field_key":"survey_q5","label":"We can have a meaningful life on earth and a sure place in heaven if we are good enough.","field_type":"radio","is_required":true,"is_active":true,"display_order":5,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"No one is good enough on their own; a meaningful life and a sure place in heaven come only through Jesus Christ."},
    {"id":"sq_6","field_key":"survey_q6","label":"I will go to heaven if my good deeds outnumber my bad deeds.","field_type":"radio","is_required":true,"is_active":true,"display_order":6,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"We go to heaven by God's grace through faith in Jesus Christ, not by our good deeds outweighing our bad deeds."},
    {"id":"sq_7","field_key":"survey_q7","label":"True believers are secure in Christ and no one can snatch them away from the Father's hand.","field_type":"radio","is_required":true,"is_active":true,"display_order":7,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"True believers are secure in Christ and no one can snatch them away from the Father's hand (John 10:28-29)."},
    {"id":"sq_8","field_key":"survey_q8","label":"God does not discipline genuine believers because they are His children.","field_type":"radio","is_required":true,"is_active":true,"display_order":8,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"God disciplines genuine believers because He loves them as His children (Hebrews 12:6)."},
    {"id":"sq_9","field_key":"survey_q9","label":"Being filled with the Holy Spirit is moment-by-moment submission to God and His Word.","field_type":"radio","is_required":true,"is_active":true,"display_order":9,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"Being filled with the Holy Spirit is moment-by-moment submission to God and His Word."},
    {"id":"sq_10","field_key":"survey_q10","label":"The Holy Spirit is God, equal with the Father and the Son.","field_type":"radio","is_required":true,"is_active":true,"display_order":10,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"The Holy Spirit is God, equal with the Father and the Son."},
    {"id":"sq_11","field_key":"survey_q11","label":"The Holy Spirit is not a Person.","field_type":"radio","is_required":true,"is_active":true,"display_order":11,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"The Holy Spirit is a Person, the third Person of the Trinity."},
    {"id":"sq_12","field_key":"survey_q12","label":"There is no evidence for the reliability and accuracy of the Bible.","field_type":"radio","is_required":true,"is_active":true,"display_order":12,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"There are historical, prophetic, and manuscript evidences for the reliability and accuracy of the Bible."},
    {"id":"sq_13","field_key":"survey_q13","label":"The Bible is the highest and final authority in all things, not religious traditions or human authority.","field_type":"radio","is_required":true,"is_active":true,"display_order":13,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"The Bible is the highest and final authority in all things."},
    {"id":"sq_14","field_key":"survey_q14","label":"The Church is the genuine believers in Christ, not a place or a building.","field_type":"radio","is_required":true,"is_active":true,"display_order":14,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"The Church is the genuine believers in Christ, not a place or a building."},
    {"id":"sq_15","field_key":"survey_q15","label":"Salvation requires membership in the church.","field_type":"radio","is_required":true,"is_active":true,"display_order":15,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"Salvation does not require membership in the church; it is by grace through faith in Christ alone."},
    {"id":"sq_16","field_key":"survey_q16","label":"Salvation requires water baptism.","field_type":"radio","is_required":true,"is_active":true,"display_order":16,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"false","explanation":"Salvation does not require water baptism; baptism is an outward step of obedience after salvation."},
    {"id":"sq_17","field_key":"survey_q17","label":"Worship is our proper response to who God is and what He has done through Christ.","field_type":"radio","is_required":true,"is_active":true,"display_order":17,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"Worship is our proper response to who God is and what He has done through Christ."},
    {"id":"sq_18","field_key":"survey_q18","label":"The Holy Spirit empowers the believer for witnessing.","field_type":"radio","is_required":true,"is_active":true,"display_order":18,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"The Holy Spirit empowers the believer for witnessing (Acts 1:8)."},
    {"id":"sq_19","field_key":"survey_q19","label":"Success in witnessing is taking the initiative to share Christ in the power of the Holy Spirit and leaving the results to God.","field_type":"radio","is_required":true,"is_active":true,"display_order":19,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"Success in witnessing is taking the initiative to share Christ in the power of the Holy Spirit and leaving the results to God."},
    {"id":"sq_20","field_key":"survey_q20","label":"The command to witness is given to all followers of Christ.","field_type":"radio","is_required":true,"is_active":true,"display_order":20,"options":[{"label":"True","value":"true"},{"label":"False","value":"false"}],"correct_answer":"true","explanation":"The command to witness is given to all followers of Christ (Matthew 28:19-20)."}
  ]$survey$::jsonb,
    $endorsement$[
    {"id":"eq_1","field_key":"leader_full_name","label":"What is your full name?","field_type":"text","is_required":true,"is_active":true,"display_order":1,"validation_rules":{"min_length":1}},
    {"id":"eq_2","field_key":"disciple_dgroup_since","label":"Please enter when your disciple started in your DGroup (YYYY MMM)","field_type":"text","is_required":true,"is_active":true,"display_order":2,"validation_rules":{"pattern":"^\\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$"}},
    {"id":"eq_3","field_key":"is_disciple_dgroup_leader","label":"Is your disciple already a DGroup Leader?","field_type":"radio","is_required":true,"is_active":true,"display_order":3,"options":[{"label":"Yes","value":"Yes"},{"label":"No","value":"No"}]},
    {"id":"eq_4","field_key":"disciple_led_dgroup_since","label":"Please enter when your disciple started his/her own DGroup (YYYY MMM)","field_type":"text","is_required":false,"is_active":true,"display_order":4,"validation_rules":{"pattern":"^\\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$","visibility_rule":{"depends_on_field_key":"is_disciple_dgroup_leader","equals_value":"Yes"}}},
    {"id":"eq_5","field_key":"eval_prayer_and_devotion","label":"Has consistent prayer time, personal devotion and study of God's word","field_type":"rating","is_required":true,"is_active":true,"display_order":5,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_6","field_key":"eval_private_life_in_order","label":"Private life is in order - free from any form of addictions, uses time and resources wisely","field_type":"rating","is_required":true,"is_active":true,"display_order":6,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_7","field_key":"eval_scripture_priorities","label":"Makes decisions and sets priorities based on the Scriptures","field_type":"rating","is_required":true,"is_active":true,"display_order":7,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_8","field_key":"eval_shares_gospel","label":"Shares the gospel consistently","field_type":"rating","is_required":true,"is_active":true,"display_order":8,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_9","field_key":"eval_submits_to_authority","label":"Submits to God-given authorities (Government, Church Leaders, Parents, Superiors, etc.)","field_type":"rating","is_required":true,"is_active":true,"display_order":9,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_10","field_key":"eval_listens_to_counsel","label":"Listens to corrections and counsel","field_type":"rating","is_required":true,"is_active":true,"display_order":10,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_11","field_key":"eval_treats_people_with_respect","label":"Treats difficult people with respect and dignity; communicates with tact and due diligence","field_type":"rating","is_required":true,"is_active":true,"display_order":11,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_12","field_key":"eval_no_gossip","label":"Does not criticize, judge, badmouth, or gossip about other people","field_type":"rating","is_required":true,"is_active":true,"display_order":12,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_13","field_key":"eval_consistent_small_group","label":"Consistently leads and/or attends a small group","field_type":"rating","is_required":true,"is_active":true,"display_order":13,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_14","field_key":"eval_serves_others","label":"Serves others even when inconvenient","field_type":"rating","is_required":true,"is_active":true,"display_order":14,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_15","field_key":"eval_family_relationships","label":"Maintains good relationship with spouse and/or children, parents and/or siblings (as applicable)","field_type":"rating","is_required":true,"is_active":true,"display_order":15,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_16","field_key":"eval_quality_family_time","label":"Spends quality time with the family","field_type":"rating","is_required":true,"is_active":true,"display_order":16,"help_text":"1 = Not Observed; 2 = Observed Some of the time; 3 = Observed Most of the time","validation_rules":{"min":1,"max":3}},
    {"id":"eq_17","field_key":"disciple_strengths","label":"What are the strengths that you see in your disciple?","field_type":"textarea","is_required":true,"is_active":true,"display_order":17,"validation_rules":{"min_length":1}},
    {"id":"eq_18","field_key":"disciple_weaknesses","label":"What are the weaknesses that you see in your disciple?","field_type":"textarea","is_required":true,"is_active":true,"display_order":18,"validation_rules":{"min_length":1}},
    {"id":"eq_19","field_key":"disciple_improvements","label":"What can be improved on? How?","field_type":"textarea","is_required":true,"is_active":true,"display_order":19,"validation_rules":{"min_length":1}},
    {"id":"eq_20","field_key":"credibility_concerns","label":"Is there anything currently that may impact your disciple's effectiveness and credibility in serving in the Welcome Center?","field_type":"multi_select","is_required":false,"is_active":true,"display_order":20,"help_text":"Kindly check all that is appropriate. You may leave this blank if you do not see any impact.","options":[{"label":"Marriage and Family Issues","value":"Marriage and Family Issues"},{"label":"Divorce or Separation","value":"Divorce or Separation"},{"label":"Past Indiscretions","value":"Past Indiscretions"},{"label":"Immorality (Adultery, Fornication, Pornography, etc.)","value":"Immorality (Adultery, Fornication, Pornography, etc.)"},{"label":"Homosexuality","value":"Homosexuality"},{"label":"Financial Issues","value":"Financial Issues"},{"label":"Questionable Business Dealings","value":"Questionable Business Dealings"},{"label":"Church Conflict","value":"Church Conflict"},{"label":"Questionable Reputation in the Community","value":"Questionable Reputation in the Community"},{"label":"Legal Issues","value":"Legal Issues"},{"label":"Other","value":"Other"}]},
    {"id":"eq_21","field_key":"credibility_concerns_details","label":"Briefly describe why you chose the concerns above (if any)","field_type":"textarea","is_required":true,"is_active":true,"display_order":21,"help_text":"Write N/A if you did not choose any concerns above.","validation_rules":{"min_length":1}},
    {"id":"eq_22","field_key":"recommendation_decision","label":"Based on your previous feedback, would you recommend your disciple to volunteer to serve in the Welcome Center ministry?","field_type":"radio","is_required":true,"is_active":true,"display_order":22,"options":[{"label":"Yes","value":"Yes"},{"label":"Yes, with reservations","value":"Yes, with reservations"},{"label":"No (Not at this time)","value":"No (Not at this time)"}]},
    {"id":"eq_23","field_key":"recommendation_comments","label":"Write any comment that is significant based on your recommendation.","field_type":"textarea","is_required":false,"is_active":true,"display_order":23},
    {"id":"eq_24","field_key":"leader_attestation_statement","label":"The following statements are for your disciple.","field_type":"radio","is_required":true,"is_active":true,"display_order":24,"help_text":"1. Is a committed member of my DGroup. 2. Saved by grace through faith in Jesus and experiencing life transformation. 3. Pursues spiritual disciplines such as consistent prayer and quiet time. 4. Does his/her best to honor God through a daily lifestyle that is above reproach and does not indulge in worldly pleasures and gossiping. 5. Practices sexual purity and forgiveness. 6. Not involved in a romantic relationship with an unbeliever. 7. Manages his/her finances well by minimizing debt and tithing regularly. 8. Does his/her best to live a life of integrity in public, private, and social media. 9. Has a teachable and humble heart, open to accountability and correction by his/her DGroup and ministry leader. 10. Wants to be used by God to disciple others and help to disciple others. 11. Finished GLC 1 and/or attended a True Life Retreat. If he/she has not finished GLC 1 yet, he/she commits to finishing GLC 1 within the year and allows his/her DLeader or District Head to monitor progress. 12. Knows by heart CCF's mission and vision. I commit to supporting my disciple by regularly praying for, mentoring, and checking up on him/her as he/she volunteers in the Welcome Center throughout the year. I also consent to be contacted by Welcome Center leadership to discuss the growth and walk of my disciple as the need arises throughout the volunteer period.","options":[{"label":"I attest","value":"I attest"},{"label":"I DO NOT attest","value":"I DO NOT attest"}]},
    {"id":"eq_25","field_key":"attestation_comments","label":"Write any comments that are significant based on your attestation.","field_type":"textarea","is_required":false,"is_active":true,"display_order":25}
  ]$endorsement$::jsonb
  )
on conflict (id) do nothing;

create or replace function public.get_public_recruitment_config () returns jsonb language sql security definer stable
set
  search_path = public as $$
  select jsonb_build_object(
    'is_recruitment_open', s.is_recruitment_open,
    'eligibility_rules', s.eligibility_rules,
    'vmt_registration_url', s.vmt_registration_url,
    'orientation_instructions', s.orientation_instructions,
    'survey_questions', coalesce(
      (
        select jsonb_agg(question.value - 'correct_answer' - 'explanation' order by question.ordinality)
        from jsonb_array_elements(s.survey_questions) with ordinality as question(value, ordinality)
      ),
      '[]'::jsonb
    )
  )
  from public.recruitment_settings s
  where s.id = 1;
$$;

revoke
execute on function public.get_public_recruitment_config ()
from
  public;

grant
execute on function public.get_public_recruitment_config () to anon,
authenticated,
service_role;

commit;
