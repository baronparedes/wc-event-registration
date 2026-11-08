begin;

-- Seed Resend template record for volunteer recruitment application received notification
insert into
  public.email_templates (
    slug,
    name,
    resend_template_id,
    required_variables
  )
values
  (
    'recruitment-application-received',
    'Recruitment Application Received',
    'tmpl_recruitment_received_placeholder',
    '["first_name", "full_name", "desired_role", "tracking_url"]'::jsonb
  )
on conflict (slug) do nothing;

commit;
