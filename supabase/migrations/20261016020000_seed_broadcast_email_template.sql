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
    'broadcast',
    'Broadcast Notification',
    'tmpl_broadcast_placeholder',
    '["broadcast_title", "broadcast_message", "action_url", "action_text"]'::jsonb
  )
on conflict (slug) do nothing;

commit;
