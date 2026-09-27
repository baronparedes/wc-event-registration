create table if not exists public.app_notifications (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  target_type text not null check (target_type in ('all', 'role', 'user')),
  target_role text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

create table if not exists public.app_notification_recipients (
  id uuid default gen_random_uuid() primary key,
  notification_id uuid not null references public.app_notifications (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  is_read boolean default false not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null,
  unique (notification_id, user_id)
);

create table if not exists public.user_push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  auth_key text not null,
  p256dh_key text not null,
  created_at timestamp with time zone default timezone ('utc'::text, now()) not null
);

-- RLS for app_notifications
alter table public.app_notifications enable row level security;

create policy "Users can read notifications" on public.app_notifications for
select
  to authenticated using (true);

create policy "Admins can insert notifications" on public.app_notifications for insert to authenticated
with
  check (
    public.has_admin_role (auth.uid (), 'admin')
    or public.has_admin_role (auth.uid (), 'super_admin')
  );

-- RLS for app_notification_recipients
alter table public.app_notification_recipients enable row level security;

create policy "Users can read their own notification recipients" on public.app_notification_recipients for
select
  to authenticated using (auth.uid () = user_id);

create policy "Users can update their own notification recipients" on public.app_notification_recipients
for update
  to authenticated using (auth.uid () = user_id)
with
  check (auth.uid () = user_id);

create policy "Admins can insert notification recipients" on public.app_notification_recipients for insert to authenticated
with
  check (
    public.has_admin_role (auth.uid (), 'admin')
    or public.has_admin_role (auth.uid (), 'super_admin')
  );

-- RLS for user_push_subscriptions
alter table public.user_push_subscriptions enable row level security;

create policy "Users can read their own push subscriptions" on public.user_push_subscriptions for
select
  to authenticated using (auth.uid () = user_id);

create policy "Users can insert their own push subscriptions" on public.user_push_subscriptions for insert to authenticated
with
  check (auth.uid () = user_id);

create policy "Users can delete their own push subscriptions" on public.user_push_subscriptions for delete to authenticated using (auth.uid () = user_id);

create policy "Admins can read all push subscriptions" on public.user_push_subscriptions for
select
  to authenticated using (
    public.has_admin_role (auth.uid (), 'admin')
    or public.has_admin_role (auth.uid (), 'super_admin')
  );

-- Add app_notification_recipients to realtime
alter publication supabase_realtime
add table public.app_notification_recipients;
