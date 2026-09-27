begin;

-- Fix mutual RLS recursion between app_notifications and app_notification_recipients
-- 1. Reset and recreate policies for public.app_notifications
drop policy if exists "Users can read their notifications" on public.app_notifications;

drop policy if exists "Users can read notifications" on public.app_notifications;

drop policy if exists "Users can insert their own notifications" on public.app_notifications;

drop policy if exists "Admins can insert notifications" on public.app_notifications;

drop policy if exists "Users can update their own notifications" on public.app_notifications;

drop policy if exists "Users can delete their own notifications" on public.app_notifications;

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

create policy "Users can insert their own notifications" on public.app_notifications for insert to authenticated
with
  check (
    created_by = auth.uid ()
    or public.is_admin ()
  );

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

create policy "Users can delete their own notifications" on public.app_notifications for delete to authenticated using (
  created_by = auth.uid ()
  or public.is_admin ()
);

-- 2. Reset and recreate policies for public.app_notification_recipients (strictly non-recursive)
drop policy if exists "Users can read their own notification recipients" on public.app_notification_recipients;

drop policy if exists "Users can update their own notification recipients" on public.app_notification_recipients;

drop policy if exists "Users can insert notification recipients" on public.app_notification_recipients;

drop policy if exists "Admins can insert notification recipients" on public.app_notification_recipients;

drop policy if exists "Users can delete notification recipients" on public.app_notification_recipients;

create policy "Users can read their own notification recipients" on public.app_notification_recipients for
select
  to authenticated using (
    auth.uid () = user_id
    or public.is_admin ()
  );

create policy "Users can update their own notification recipients" on public.app_notification_recipients
for update
  to authenticated using (
    auth.uid () = user_id
    or public.is_admin ()
  )
with
  check (
    auth.uid () = user_id
    or public.is_admin ()
  );

create policy "Admins can insert notification recipients" on public.app_notification_recipients for insert to authenticated
with
  check (public.is_admin ());

create policy "Users can delete notification recipients" on public.app_notification_recipients for delete to authenticated using (
  auth.uid () = user_id
  or public.is_admin ()
);

commit;
