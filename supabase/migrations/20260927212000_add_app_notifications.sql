begin;

-- 1. App Notifications
create table if not exists public.app_notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  target_type text not null check (target_type in ('all', 'role', 'user')),
  target_role text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz default timezone ('utc'::text, now()) not null
);

create index if not exists app_notifications_created_by_idx on public.app_notifications (created_by);

create index if not exists app_notifications_created_at_idx on public.app_notifications (created_at desc);

-- 2. App Notification Recipients
create table if not exists public.app_notification_recipients (
  id uuid default gen_random_uuid() primary key,
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_read boolean default false not null,
  read_at timestamptz,
  created_at timestamptz default timezone ('utc'::text, now()) not null,
  unique (notification_id, user_id)
);

create index if not exists app_notification_recipients_user_read_idx on public.app_notification_recipients (user_id, is_read);

create index if not exists app_notification_recipients_notification_idx on public.app_notification_recipients (notification_id);

-- 3. Push Subscriptions
create table if not exists public.user_push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  auth_key text not null,
  p256dh_key text not null,
  created_at timestamptz default timezone ('utc'::text, now()) not null
);

create index if not exists user_push_subscriptions_user_idx on public.user_push_subscriptions (user_id);

-- Enable RLS
alter table public.app_notifications enable row level security;

alter table public.app_notification_recipients enable row level security;

alter table public.user_push_subscriptions enable row level security;

-- Policies: app_notifications
drop policy if exists "Users can read notifications" on public.app_notifications;

drop policy if exists "Users can read their notifications" on public.app_notifications;

create policy "Users can read their notifications" on public.app_notifications for
select
  to authenticated using (
    public.is_admin ()
    or created_by = auth.uid ()
    or target_type = 'all'
    or exists (
      select
        1
      from
        public.app_notification_recipients r
      where
        r.notification_id = app_notifications.id
        and r.user_id = auth.uid ()
    )
  );

drop policy if exists "Admins can insert notifications" on public.app_notifications;

drop policy if exists "Users can insert their own notifications" on public.app_notifications;

create policy "Users can insert their own notifications" on public.app_notifications for insert to authenticated
with
  check (
    created_by = auth.uid ()
    or public.is_admin ()
  );

drop policy if exists "Users can update their own notifications" on public.app_notifications;

create policy "Users can update their own notifications" on public.app_notifications
for update
  to authenticated using (
    created_by = auth.uid ()
    or public.is_admin ()
  )
with
  check (
    created_by = auth.uid ()
    or public.is_admin ()
  );

drop policy if exists "Users can delete their own notifications" on public.app_notifications;

create policy "Users can delete their own notifications" on public.app_notifications for delete to authenticated using (
  created_by = auth.uid ()
  or public.is_admin ()
);

-- Policies: app_notification_recipients
drop policy if exists "Users can read their own notification recipients" on public.app_notification_recipients;

create policy "Users can read their own notification recipients" on public.app_notification_recipients for
select
  to authenticated using (
    auth.uid () = user_id
    or public.is_admin ()
    or exists (
      select
        1
      from
        public.app_notifications n
      where
        n.id = app_notification_recipients.notification_id
        and n.created_by = auth.uid ()
    )
  );

drop policy if exists "Users can update their own notification recipients" on public.app_notification_recipients;

create policy "Users can update their own notification recipients" on public.app_notification_recipients
for update
  to authenticated using (
    auth.uid () = user_id
    or public.is_admin ()
    or exists (
      select
        1
      from
        public.app_notifications n
      where
        n.id = app_notification_recipients.notification_id
        and n.created_by = auth.uid ()
    )
  )
with
  check (
    auth.uid () = user_id
    or public.is_admin ()
    or exists (
      select
        1
      from
        public.app_notifications n
      where
        n.id = app_notification_recipients.notification_id
        and n.created_by = auth.uid ()
    )
  );

drop policy if exists "Admins can insert notification recipients" on public.app_notification_recipients;

drop policy if exists "Users can insert notification recipients" on public.app_notification_recipients;

create policy "Users can insert notification recipients" on public.app_notification_recipients for insert to authenticated
with
  check (
    public.is_admin ()
    or exists (
      select
        1
      from
        public.app_notifications n
      where
        n.id = app_notification_recipients.notification_id
        and n.created_by = auth.uid ()
    )
  );

drop policy if exists "Users can delete notification recipients" on public.app_notification_recipients;

create policy "Users can delete notification recipients" on public.app_notification_recipients for delete to authenticated using (
  auth.uid () = user_id
  or public.is_admin ()
  or exists (
    select
      1
    from
      public.app_notifications n
    where
      n.id = app_notification_recipients.notification_id
      and n.created_by = auth.uid ()
  )
);

-- Policies: user_push_subscriptions
drop policy if exists "Users can read their own push subscriptions" on public.user_push_subscriptions;

create policy "Users can read their own push subscriptions" on public.user_push_subscriptions for
select
  to authenticated using (auth.uid () = user_id);

drop policy if exists "Users can insert their own push subscriptions" on public.user_push_subscriptions;

create policy "Users can insert their own push subscriptions" on public.user_push_subscriptions for insert to authenticated
with
  check (auth.uid () = user_id);

drop policy if exists "Users can delete their own push subscriptions" on public.user_push_subscriptions;

create policy "Users can delete their own push subscriptions" on public.user_push_subscriptions for delete to authenticated using (auth.uid () = user_id);

drop policy if exists "Admins can read all push subscriptions" on public.user_push_subscriptions;

create policy "Admins can read all push subscriptions" on public.user_push_subscriptions for
select
  to authenticated using (public.is_admin ());

-- Table Grants
grant
select
,
  insert,
update,
delete on table public.app_notifications to authenticated;

grant
select
,
  insert,
update,
delete on table public.app_notification_recipients to authenticated;

grant
select
,
  insert,
update,
delete on table public.user_push_subscriptions to authenticated;

grant all on table public.app_notifications to service_role;

grant all on table public.app_notification_recipients to service_role;

grant all on table public.user_push_subscriptions to service_role;

-- 4. Broadcast RPC Function
drop function if exists public.broadcast_app_notification (text, text, text, text, uuid[]);

create or replace function public.broadcast_app_notification (
  p_title text,
  p_message text,
  p_target_type text,
  p_target_role text default null,
  p_user_ids uuid[] default null
) returns uuid language plpgsql security definer
set
  search_path = public as $$
declare
  v_notification_id uuid;
begin
  if not public.is_admin() then
    raise exception 'unauthorized';
  end if;

  if p_target_type not in ('all', 'role', 'user') then
    raise exception 'invalid target_type: %', p_target_type;
  end if;

  -- 1. Create master notification record
  insert into public.app_notifications (
    title,
    message,
    target_type,
    target_role,
    created_by
  )
  values (
    trim(p_title),
    trim(p_message),
    p_target_type,
    p_target_role,
    auth.uid()
  )
  returning id into v_notification_id;

  -- 2. Fan-out recipient records
  if p_target_type = 'all' then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, u.id
    from auth.users u
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'role' and p_target_role is not null then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, a.auth_user_id
    from public.admins a
    where a.role = p_target_role
    on conflict (notification_id, user_id) do nothing;

  elsif p_target_type = 'user' and p_user_ids is not null then
    insert into public.app_notification_recipients (notification_id, user_id)
    select v_notification_id, u_id
    from unnest(p_user_ids) as u_id
    on conflict (notification_id, user_id) do nothing;
  end if;

  return v_notification_id;
end;
$$;

grant
execute on function public.broadcast_app_notification (text, text, text, text, uuid[]) to authenticated;

grant
execute on function public.broadcast_app_notification (text, text, text, text, uuid[]) to service_role;

-- Realtime publication
alter publication supabase_realtime
add table public.app_notification_recipients;

commit;
