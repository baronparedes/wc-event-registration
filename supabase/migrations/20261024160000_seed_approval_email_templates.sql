begin;

-- Seed Resend templates for unified approval workflow notifications
insert into
  public.email_templates (
    slug,
    name,
    resend_template_id,
    required_variables
  )
values
  (
    'approval-review-request',
    'Approval Review Request',
    'tmpl_approval_review_placeholder',
    '["subject_title", "heading", "description", "review_url", "action_url", "action_text"]'::jsonb
  ),
  (
    'approval-outcome-notification',
    'Approval Outcome Notification',
    'tmpl_approval_outcome_placeholder',
    '["title", "requester_name", "decision", "decision_label", "notes"]'::jsonb
  )
on conflict (slug) do nothing;

commit;
