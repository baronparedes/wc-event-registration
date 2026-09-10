begin;

create table public.forms (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  title text not null,
  description text,
  status public.event_status not null default 'published',
  duplicate_policy public.duplicate_policy not null default 'block',
  audience text not null default 'members',
  metadata jsonb not null default '{}'::jsonb,
  created_by_admin_id uuid references public.admins (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forms_slug_not_blank check (length(trim(slug)) > 0),
  constraint forms_title_not_blank check (length(trim(title)) > 0),
  constraint forms_audience_allowed check (
    audience in ('members', 'public', 'members_and_public')
  )
);

create unique index forms_slug_unique_idx on public.forms (slug);

create index forms_status_idx on public.forms (status);

create trigger forms_set_updated_at
before update on public.forms for each row
execute function public.set_updated_at ();

create table public.form_fields (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  field_key text not null,
  label text not null,
  field_type public.event_field_type not null,
  is_required boolean not null default false,
  is_active boolean not null default true,
  placeholder text,
  help_text text,
  options jsonb not null default '[]'::jsonb,
  validation_rules jsonb not null default '{}'::jsonb,
  field_applicability text not null default 'all',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_fields_key_not_blank check (length(trim(field_key)) > 0),
  constraint form_fields_label_not_blank check (length(trim(label)) > 0),
  constraint form_fields_display_order_non_negative check (display_order >= 0),
  constraint form_fields_applicability_check check (
    field_applicability in ('all', 'member_only', 'public_only')
  )
);

create unique index form_fields_form_key_unique_idx on public.form_fields (form_id, field_key);

create index form_fields_form_display_idx on public.form_fields (form_id, display_order);

create index form_fields_form_active_idx on public.form_fields (form_id, is_active);

create trigger form_fields_set_updated_at
before update on public.form_fields for each row
execute function public.set_updated_at ();

create table public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  user_id uuid references public.users (id) on delete restrict,
  public_registrant_info jsonb default '{}'::jsonb,
  status text not null default 'submitted',
  idempotency_key text,
  source text not null default 'public',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_submissions_source_not_blank check (length(trim(source)) > 0),
  constraint form_submissions_status_check check (status in ('submitted', 'cancelled'))
);

create index form_submissions_form_status_idx on public.form_submissions (form_id, status);

create index form_submissions_user_idx on public.form_submissions (user_id);

create unique index form_submissions_idempotency_unique_idx on public.form_submissions (form_id, idempotency_key)
where
  idempotency_key is not null;

create trigger form_submissions_set_updated_at
before update on public.form_submissions for each row
execute function public.set_updated_at ();

create table public.form_submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.form_submissions (id) on delete cascade,
  form_field_id uuid not null references public.form_fields (id) on delete cascade,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_date date,
  answer_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index form_submission_answers_sub_field_unique_idx on public.form_submission_answers (submission_id, form_field_id);

create index form_submission_answers_field_idx on public.form_submission_answers (form_field_id);

create trigger form_submission_answers_set_updated_at
before update on public.form_submission_answers for each row
execute function public.set_updated_at ();

-- Enable RLS
alter table public.forms enable row level security;

alter table public.form_fields enable row level security;

alter table public.form_submissions enable row level security;

alter table public.form_submission_answers enable row level security;

-- Public / Member read policies for published forms and active fields
create policy "authenticated can read published forms" on public.forms for
select
  to authenticated using (status = 'published');

create policy "admin viewers can read all forms" on public.forms for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can manage forms" on public.forms for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "authenticated can read fields of published forms" on public.form_fields for
select
  to authenticated using (
    is_active = true
    and exists (
      select
        1
      from
        public.forms f
      where
        f.id = form_fields.form_id
        and f.status = 'published'
    )
  );

create policy "admin viewers can read form fields" on public.form_fields for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can manage form fields" on public.form_fields for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admin viewers can read form submissions" on public.form_submissions for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can manage form submissions" on public.form_submissions for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

create policy "admin viewers can read form submission answers" on public.form_submission_answers for
select
  to authenticated using (public.is_admin_viewer ());

create policy "admins can manage form submission answers" on public.form_submission_answers for all to authenticated using (public.is_admin ())
with
  check (public.is_admin ());

-- Member and Admin workflows must read published forms and form fields.
grant
select
  on table public.forms to authenticated;

grant
select
  on table public.form_fields to authenticated;

-- Authenticated role needs table privileges for admin workflows; RLS still limits rows/actions.
grant
select
,
  insert,
update,
delete on table public.forms to authenticated;

grant
select
,
  insert,
update,
delete on table public.form_fields to authenticated;

grant
select
,
  insert,
update,
delete on table public.form_submissions to authenticated;

grant
select
,
  insert,
update,
delete on table public.form_submission_answers to authenticated;

-- Service role needs full privileges for Edge Functions
grant all on table public.forms to service_role;

grant all on table public.form_fields to service_role;

grant all on table public.form_submissions to service_role;

grant all on table public.form_submission_answers to service_role;

commit;
