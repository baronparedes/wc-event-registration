begin;

-- 1. Create service_excuse_requests table
create table if not exists public.service_excuse_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  member_id text not null,
  request_date date not null,
  services text[] not null default array['All Services']::text[],
  reason text,
  status text not null default 'approved' check (status in ('approved', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists idx_service_excuse_requests_user_date on public.service_excuse_requests (user_id, request_date);

create index if not exists idx_service_excuse_requests_date on public.service_excuse_requests (request_date);

create index if not exists idx_service_excuse_requests_status on public.service_excuse_requests (status);

-- 3. Enable RLS
alter table public.service_excuse_requests enable row level security;

-- 4. RLS Policies
drop policy if exists "users and admins can view excuse requests" on public.service_excuse_requests;

create policy "users and admins can view excuse requests" on public.service_excuse_requests for
select
  to authenticated using (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "users and admins can insert excuse requests" on public.service_excuse_requests;

create policy "users and admins can insert excuse requests" on public.service_excuse_requests for insert to authenticated
with
  check (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "users and admins can update excuse requests" on public.service_excuse_requests;

create policy "users and admins can update excuse requests" on public.service_excuse_requests
for update
  to authenticated using (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  )
with
  check (
    public.is_admin_viewer ()
    or user_id = auth.uid ()
    or exists (
      select
        1
      from
        public.users u
      where
        u.id = service_excuse_requests.user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt () ->> 'email')
    )
  );

drop policy if exists "admins can delete excuse requests" on public.service_excuse_requests;

create policy "admins can delete excuse requests" on public.service_excuse_requests for delete to authenticated using (public.is_admin_viewer ());

drop policy if exists "service_role has full access to service_excuse_requests" on public.service_excuse_requests;

create policy "service_role has full access to service_excuse_requests" on public.service_excuse_requests for all to service_role using (true)
with
  check (true);

-- 5. Privileges
grant
select
,
  insert,
update,
delete on public.service_excuse_requests to authenticated;

grant all on public.service_excuse_requests to service_role;

-- 6. Migrate historical excuse registrations from events workaround into service_excuse_requests
insert into
  public.service_excuse_requests (
    user_id,
    member_id,
    request_date,
    services,
    reason,
    status,
    created_at
  )
select distinct
  on (r.id) r.user_id,
  u.member_id,
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) as request_date,
  case
    when ra_serv.answer_text is null
    or trim(ra_serv.answer_text) = '' then array['All Services']::text[]
    else string_to_array(
      replace(replace(ra_serv.answer_text, '[', ''), ']', ''),
      ', '
    )
  end as services,
  ra_reason.answer_text as reason,
  case
    when r.status = 'cancelled' then 'cancelled'
    else 'approved'
  end as status,
  r.created_at
from
  public.registrations r
  join public.users u on u.id = r.user_id
  join public.events e on e.id = r.event_id
  and (
    e.slug ilike '%excuse%'
    or e.title ilike '%excuse%'
  )
  join public.event_fields ef_date on ef_date.event_id = r.event_id
  and ef_date.field_key = 'request_date'
  join public.registration_answers ra_date on ra_date.registration_id = r.id
  and ra_date.event_field_id = ef_date.id
  left join public.event_fields ef_serv on ef_serv.event_id = r.event_id
  and ef_serv.field_key = 'services'
  left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
  and ra_serv.event_field_id = ef_serv.id
  left join public.event_fields ef_reason on ef_reason.event_id = r.event_id
  and ef_reason.field_key = 'reason'
  left join public.registration_answers ra_reason on ra_reason.registration_id = r.id
  and ra_reason.event_field_id = ef_reason.id
where
  coalesce(
    ra_date.answer_date,
    case
      when ra_date.answer_text ~ '^\d{4}-\d{2}-\d{2}' then substring(
        ra_date.answer_text
        from
          1 for 10
      )::date
      else null
    end
  ) is not null
on conflict do nothing;

commit;
