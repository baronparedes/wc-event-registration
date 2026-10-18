begin;

-- 1. Create approval enums if they do not exist
do $$ begin
  if not exists (select 1 from pg_type where typname = 'approval_status') then
    create type public.approval_status as enum ('pending', 'approved', 'rejected', 'cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'approval_entity_type') then
    create type public.approval_entity_type as enum ('form_submission', 'service_excuse');
  end if;
end $$;

-- 2. Create approval_requests table
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type public.approval_entity_type not null,
  entity_id uuid not null,
  status public.approval_status not null default 'pending',
  title text not null,
  summary text,
  requester_user_id uuid references public.users (id) on delete set null,
  requester_name text not null,
  requester_email text,
  assigned_to_email text,
  assigned_to_user_id uuid references public.users (id) on delete set null,
  decided_by_user_id uuid references public.users (id) on delete set null,
  decided_by_email text,
  decided_at timestamptz,
  decision_notes text,
  access_token text not null unique default encode(gen_random_bytes (32), 'hex'),
  token_expires_at timestamptz not null default (now() + interval '14 days'),
  token_used_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Indexes for approval_requests
create index if not exists idx_approval_requests_status on public.approval_requests (status);

create index if not exists idx_approval_requests_entity on public.approval_requests (entity_type, entity_id);

create index if not exists idx_approval_requests_access_token on public.approval_requests (access_token);

create index if not exists idx_approval_requests_assigned_email on public.approval_requests (assigned_to_email);

create index if not exists idx_approval_requests_created_at on public.approval_requests (created_at desc);

-- 4. Enable RLS on approval_requests
alter table public.approval_requests enable row level security;

drop policy if exists "admin viewers can read approval requests" on public.approval_requests;

create policy "admin viewers can read approval requests" on public.approval_requests for
select
  to authenticated using (
    public.is_admin_viewer ()
    or requester_user_id = auth.uid ()
    or (
      assigned_to_email is not null
      and lower(assigned_to_email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "admin editors can update approval requests" on public.approval_requests;

create policy "admin editors can update approval requests" on public.approval_requests
for update
  to authenticated using (
    public.is_admin ()
    or (
      assigned_to_email is not null
      and lower(assigned_to_email) = lower(auth.jwt () ->> 'email')
    )
  )
with
  check (
    public.is_admin ()
    or (
      assigned_to_email is not null
      and lower(assigned_to_email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "admin editors can insert approval requests" on public.approval_requests;

create policy "admin editors can insert approval requests" on public.approval_requests for insert to authenticated
with
  check (public.is_admin ());

drop policy if exists "service_role has full access to approval_requests" on public.approval_requests;

create policy "service_role has full access to approval_requests" on public.approval_requests for all to service_role using (true)
with
  check (true);

grant
select
,
  insert,
update on public.approval_requests to authenticated;

grant all on public.approval_requests to service_role;

-- 5. Extend form_submissions table
alter table public.form_submissions
drop constraint if exists form_submissions_status_check;

alter table public.form_submissions
add constraint form_submissions_status_check check (
  status in (
    'submitted',
    'cancelled',
    'pending_approval',
    'approved',
    'rejected'
  )
);

alter table public.form_submissions
add column if not exists approval_request_id uuid references public.approval_requests (id) on delete set null;

-- 6. Extend service_excuse_requests table
alter table public.service_excuse_requests
drop constraint if exists service_excuse_requests_status_check;

alter table public.service_excuse_requests
add constraint service_excuse_requests_status_check check (
  status in ('pending', 'approved', 'rejected', 'cancelled')
);

alter table public.service_excuse_requests
add column if not exists start_date date;

alter table public.service_excuse_requests
add column if not exists end_date date;

alter table public.service_excuse_requests
add column if not exists is_long_leave boolean not null default false;

alter table public.service_excuse_requests
add column if not exists approval_request_id uuid references public.approval_requests (id) on delete set null;

update public.service_excuse_requests
set
  start_date = coalesce(start_date, request_date),
  end_date = coalesce(end_date, request_date)
where
  start_date is null
  or end_date is null;

create index if not exists idx_service_excuse_requests_date_range on public.service_excuse_requests (start_date, end_date);

create index if not exists idx_service_excuse_requests_is_long_leave on public.service_excuse_requests (is_long_leave);

-- 7. Atomic decision processing RPC
create or replace function public.apply_approval_decision (
  p_approval_id uuid,
  p_decision text,
  p_decision_notes text default null,
  p_decided_by_user_id uuid default null,
  p_decided_by_email text default null
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_approval public.approval_requests%rowtype;
  v_target_status text;
  v_status_enum public.approval_status;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision: %', p_decision;
  end if;

  v_status_enum := p_decision::public.approval_status;

  select * into v_approval
  from public.approval_requests
  where id = p_approval_id
  for update;

  if not found then
    raise exception 'Approval request not found';
  end if;

  if v_approval.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', 'Request already decided',
      'already_decided', true,
      'status', v_approval.status::text,
      'decided_at', v_approval.decided_at,
      'decided_by_email', v_approval.decided_by_email
    );
  end if;

  update public.approval_requests
  set status = v_status_enum,
      decided_by_user_id = coalesce(p_decided_by_user_id, auth.uid()),
      decided_by_email = coalesce(
        p_decided_by_email,
        (select email from public.users where id = p_decided_by_user_id),
        auth.jwt() ->> 'email'
      ),
      decided_at = now(),
      decision_notes = p_decision_notes,
      token_used_at = now(),
      updated_at = now()
  where id = p_approval_id;

  if v_approval.entity_type = 'form_submission' then
    v_target_status := case when p_decision = 'approved' then 'approved' else 'rejected' end;
    update public.form_submissions
    set status = v_target_status,
        updated_at = now()
    where id = v_approval.entity_id;
  elsif v_approval.entity_type = 'service_excuse' then
    v_target_status := case when p_decision = 'approved' then 'approved' else 'rejected' end;
    update public.service_excuse_requests
    set status = v_target_status,
        updated_at = now()
    where id = v_approval.entity_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'approval_id', p_approval_id,
    'status', p_decision,
    'entity_type', v_approval.entity_type::text,
    'entity_id', v_approval.entity_id,
    'requester_email', v_approval.requester_email,
    'requester_name', v_approval.requester_name,
    'title', v_approval.title
  );
end;
$$;

revoke
execute on function public.apply_approval_decision (uuid, text, text, uuid, text)
from
  public,
  anon;

grant
execute on function public.apply_approval_decision (uuid, text, text, uuid, text) to authenticated,
service_role;

commit;
