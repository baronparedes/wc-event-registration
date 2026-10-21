begin;

insert into
  public.email_templates (
    slug,
    name,
    resend_template_id,
    required_variables
  )
values
  (
    'sunday-executive-debrief',
    'Sunday Executive Debrief',
    'tmpl_sunday_debrief_placeholder',
    '["sunday_date", "turnup_rate", "peak_slot", "total_committed", "total_present", "total_walk_ins", "summary", "key_highlights_html", "action_url"]'::jsonb
  )
on conflict (slug) do nothing;

commit;
