begin;

-- Create email_templates table
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  resend_template_id text not null,
  required_variables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS for email_templates
alter table public.email_templates enable row level security;

drop policy if exists "Allow read access to authenticated admins for email templates" on public.email_templates;

create policy "Allow read access to authenticated admins for email templates" on public.email_templates for
select
  to authenticated using (public.is_admin ());

drop policy if exists "Allow write access to authenticated admins for email templates" on public.email_templates;

create policy "Allow write access to authenticated admins for email templates" on public.email_templates for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

grant
select
,
  insert,
update,
delete on public.email_templates to authenticated;

grant all on public.email_templates to service_role;

commit;
