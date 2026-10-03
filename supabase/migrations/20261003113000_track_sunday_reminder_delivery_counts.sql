begin;

-- 1. Add delivery tracking columns to push_reminder_logs
alter table public.push_reminder_logs
add column if not exists total_queued int not null default 0,
add column if not exists succeeded_count int not null default 0,
add column if not exists failed_count int not null default 0,
add column if not exists status text not null default 'completed',
add column if not exists updated_at timestamptz not null default now();

-- Add status check constraint defensively
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'push_reminder_logs_status_check'
  ) then
    alter table public.push_reminder_logs
      add constraint push_reminder_logs_status_check
      check (status in ('queued', 'completed', 'partial_failure', 'failed'));
  end if;
end;
$$;

-- 2. Add delivery tracking columns to email_reminder_logs
alter table public.email_reminder_logs
add column if not exists total_queued int not null default 0,
add column if not exists succeeded_count int not null default 0,
add column if not exists failed_count int not null default 0,
add column if not exists status text not null default 'completed',
add column if not exists updated_at timestamptz not null default now();

-- Add status check constraint defensively
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'email_reminder_logs_status_check'
  ) then
    alter table public.email_reminder_logs
      add constraint email_reminder_logs_status_check
      check (status in ('queued', 'completed', 'partial_failure', 'failed'));
  end if;
end;
$$;

-- Ensure volunteer-schedule template exists in email_templates
insert into
  public.email_templates (slug, name, resend_template_id)
values
  (
    'volunteer-schedule',
    'Volunteer Schedule Reminder',
    'volunteer-schedule'
  )
on conflict (slug) do nothing;

-- 3. RPC to update push reminder delivery stats
create or replace function public.update_push_reminder_delivery_stats (
  p_sunday_date date,
  p_succeeded_count int default 0,
  p_failed_count int default 0
) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  update public.push_reminder_logs
  set
    succeeded_count = succeeded_count + coalesce(p_succeeded_count, 0),
    failed_count = failed_count + coalesce(p_failed_count, 0),
    status = case
      when (succeeded_count + coalesce(p_succeeded_count, 0) + failed_count + coalesce(p_failed_count, 0)) >= total_queued then
        case
          when (failed_count + coalesce(p_failed_count, 0)) > 0 and (succeeded_count + coalesce(p_succeeded_count, 0)) > 0 then 'partial_failure'
          when (failed_count + coalesce(p_failed_count, 0)) > 0 and (succeeded_count + coalesce(p_succeeded_count, 0)) = 0 then 'failed'
          else 'completed'
        end
      else 'queued'
    end,
    updated_at = now()
  where sunday_date = p_sunday_date;
end;
$$;

grant
execute on function public.update_push_reminder_delivery_stats (date, int, int) to authenticated,
service_role;

-- 4. RPC to update email reminder delivery stats
create or replace function public.update_email_reminder_delivery_stats (
  p_sunday_date date,
  p_succeeded_count int default 0,
  p_failed_count int default 0
) returns void language plpgsql security definer
set
  search_path = public as $$
begin
  update public.email_reminder_logs
  set
    succeeded_count = succeeded_count + coalesce(p_succeeded_count, 0),
    failed_count = failed_count + coalesce(p_failed_count, 0),
    status = case
      when (succeeded_count + coalesce(p_succeeded_count, 0) + failed_count + coalesce(p_failed_count, 0)) >= total_queued then
        case
          when (failed_count + coalesce(p_failed_count, 0)) > 0 and (succeeded_count + coalesce(p_succeeded_count, 0)) > 0 then 'partial_failure'
          when (failed_count + coalesce(p_failed_count, 0)) > 0 and (succeeded_count + coalesce(p_succeeded_count, 0)) = 0 then 'failed'
          else 'completed'
        end
      else 'queued'
    end,
    updated_at = now()
  where sunday_date = p_sunday_date;
end;
$$;

grant
execute on function public.update_email_reminder_delivery_stats (date, int, int) to authenticated,
service_role;

-- 5. Upgrade generate_upcoming_sunday_push_reminders to initialize delivery stats
create or replace function public.generate_upcoming_sunday_push_reminders (
  p_target_date date default null,
  p_force boolean default false
) returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_user record;
  v_message text;
  v_formatted_slots text;
  v_enqueued int := 0;
begin
  v_target_sunday := coalesce(p_target_date, public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date));

  if not p_force and exists (select 1 from public.push_reminder_logs where sunday_date = v_target_sunday) then
    return 0;
  end if;

  v_ordinal := ceil(date_part('day', v_target_sunday) / 7.0)::int;

  if v_ordinal = 1 then v_sunday_key := 'first_sunday';
  elsif v_ordinal = 2 then v_sunday_key := 'second_sunday';
  elsif v_ordinal = 3 then v_sunday_key := 'third_sunday';
  elsif v_ordinal = 4 then v_sunday_key := 'fourth_sunday';
  else v_sunday_key := 'fifth_sunday';
  end if;

  for v_user in
    select
      auth_user.id as user_id,
      trim(both ' ' from nullif((member.metadata->>v_sunday_key), '')) as slots_str
    from public.users member
    join auth.users auth_user
      on lower(trim(member.email)) = lower(trim(auth_user.email::text))
    where member.email is not null
      and auth_user.email is not null
      and nullif((member.metadata->>v_sunday_key), '') is not null
      and trim(both ' ' from (member.metadata->>v_sunday_key)) != ''
      and exists (
        select 1
        from public.user_push_subscriptions subscription
        where subscription.user_id = auth_user.id
      )
  loop
    v_formatted_slots := public.format_sunday_commitment_slots(v_user.slots_str);

    if v_formatted_slots != '' then
      v_message := 'Reminder: You are scheduled this Sunday at ' || v_formatted_slots || '.';

      perform public.enqueue_push_reminder(
        jsonb_build_object(
          'user_id', v_user.user_id,
          'message', v_message,
          'target_date', v_target_sunday,
          'target_url', '/profile?tab=commitments'
        )
      );
      v_enqueued := v_enqueued + 1;
    end if;
  end loop;

  insert into public.push_reminder_logs (
    sunday_date,
    processed_at,
    total_queued,
    succeeded_count,
    failed_count,
    status,
    updated_at
  ) values (
    v_target_sunday,
    now(),
    v_enqueued,
    0,
    0,
    case when v_enqueued = 0 then 'completed' else 'queued' end,
    now()
  )
  on conflict (sunday_date) do update set
    processed_at = now(),
    total_queued = excluded.total_queued,
    succeeded_count = 0,
    failed_count = 0,
    status = excluded.status,
    updated_at = now();

  return v_enqueued;
end;
$$;

-- 6. Upgrade generate_upcoming_sunday_email_reminders to initialize delivery stats
create or replace function public.generate_upcoming_sunday_email_reminders (
  p_target_date date default null,
  p_force boolean default false
) returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_user record;
  v_formatted_slots text;
  v_sunday_label text;
  v_greeting_name text;
  v_profile_url constant text := 'https://welcomehub.app/profile?tab=commitments';
  v_enqueued int := 0;
begin
  v_target_sunday := coalesce(p_target_date, public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date));

  if not p_force and exists (select 1 from public.email_reminder_logs where sunday_date = v_target_sunday) then
    return 0;
  end if;

  v_ordinal := ceil(date_part('day', v_target_sunday) / 7.0)::int;

  if v_ordinal = 1 then v_sunday_key := 'first_sunday';
  elsif v_ordinal = 2 then v_sunday_key := 'second_sunday';
  elsif v_ordinal = 3 then v_sunday_key := 'third_sunday';
  elsif v_ordinal = 4 then v_sunday_key := 'fourth_sunday';
  else v_sunday_key := 'fifth_sunday';
  end if;

  v_sunday_label := to_char(v_target_sunday, 'FMDay, FMMonth FMDD, YYYY');

  for v_user in
    select
      u.id as user_id,
      u.email,
      coalesce(nullif(trim(u.first_name), ''), nullif(trim(split_part(u.full_name, ' ', 1)), '')) as display_name,
      trim(both ' ' from nullif((u.metadata->>v_sunday_key), '')) as slots_str
    from public.users u
    where u.email is not null
      and trim(u.email) != ''
      and u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      and nullif((u.metadata->>v_sunday_key), '') is not null
      and trim(both ' ' from (u.metadata->>v_sunday_key)) != ''
  loop
    v_formatted_slots := public.format_sunday_commitment_slots(v_user.slots_str);

    if v_formatted_slots = '' then
      continue;
    end if;

    v_greeting_name := coalesce(v_user.display_name, 'there');

    perform public.enqueue_email_notification(
      jsonb_build_object(
        'event_type', 'email_notification',
        'recipient', v_user.email,
        'template_slug', 'volunteer-schedule',
        'subject', 'Service Reminder for ' || v_sunday_label,
        'text',
        'Hi ' || v_greeting_name || ',' || chr(10) || chr(10) ||
        'Reminder: You are scheduled this Sunday (' || v_sunday_label || ') at ' || v_formatted_slots || '.' || chr(10) || chr(10) ||
        'You can review your schedule anytime here: ' || v_profile_url,
        'metadata', jsonb_build_object(
          'user_id', v_user.user_id,
          'first_name', v_greeting_name,
          'service_times', v_formatted_slots,
          'sunday_date', v_target_sunday,
          'sunday_label', v_sunday_label,
          'profile_url', v_profile_url,
          'target_url', '/profile?tab=commitments'
        )
      )
    );

    v_enqueued := v_enqueued + 1;
  end loop;

  insert into public.email_reminder_logs (
    sunday_date,
    processed_at,
    total_queued,
    succeeded_count,
    failed_count,
    status,
    updated_at
  ) values (
    v_target_sunday,
    now(),
    v_enqueued,
    0,
    0,
    case when v_enqueued = 0 then 'completed' else 'queued' end,
    now()
  )
  on conflict (sunday_date) do update set
    processed_at = now(),
    total_queued = excluded.total_queued,
    succeeded_count = 0,
    failed_count = 0,
    status = excluded.status,
    updated_at = now();

  return v_enqueued;
end;
$$;

-- 7. Upgrade get_sunday_schedule_reminders_preview to include delivery tracking stats
create or replace function public.get_sunday_schedule_reminders_preview (p_sunday_date date default null) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_push_log record;
  v_email_log record;
  v_volunteers jsonb := '[]'::jsonb;
  v_total_volunteers int := 0;
  v_push_eligible_count int := 0;
  v_email_eligible_count int := 0;
  v_pending_queue_count int := 0;
  v_archived_queue_count int := 0;
begin
  if not (public.is_admin_viewer() or auth.role() = 'service_role' or current_user = 'service_role') then
    raise exception 'Unauthorized to view Sunday schedule reminders preview';
  end if;

  v_target_sunday := coalesce(p_sunday_date, public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date));
  v_ordinal := ceil(date_part('day', v_target_sunday) / 7.0)::int;

  if v_ordinal = 1 then v_sunday_key := 'first_sunday';
  elsif v_ordinal = 2 then v_sunday_key := 'second_sunday';
  elsif v_ordinal = 3 then v_sunday_key := 'third_sunday';
  elsif v_ordinal = 4 then v_sunday_key := 'fourth_sunday';
  else v_sunday_key := 'fifth_sunday';
  end if;

  select * into v_push_log from public.push_reminder_logs where sunday_date = v_target_sunday limit 1;
  select * into v_email_log from public.email_reminder_logs where sunday_date = v_target_sunday limit 1;

  -- Auto-resolve push delivery status if in 'queued' state and queue is drained
  if v_push_log.sunday_date is not null and v_push_log.status = 'queued' then
    begin
      execute $dyn$
        select
          coalesce((select count(*) from pgmq.q_push_reminders where (message->>'target_date') = $1::text), 0),
          coalesce((select count(*) from pgmq.a_push_reminders where (message->>'target_date') = $1::text), 0)
      $dyn$
      into v_pending_queue_count, v_archived_queue_count
      using v_target_sunday;

      if v_pending_queue_count = 0 then
        update public.push_reminder_logs
        set
          succeeded_count = case when v_archived_queue_count > 0 then v_archived_queue_count else total_queued end,
          status = 'completed',
          updated_at = now()
        where sunday_date = v_target_sunday
        returning * into v_push_log;
      end if;
    exception when others then
      null;
    end;
  end if;

  -- Auto-resolve email delivery status if in 'queued' state and queue is drained
  if v_email_log.sunday_date is not null and v_email_log.status = 'queued' then
    begin
      execute $dyn$
        select
          coalesce((select count(*) from pgmq.q_email_notifications where (message->'metadata'->>'sunday_date') = $1::text), 0),
          coalesce((select count(*) from pgmq.a_email_notifications where (message->'metadata'->>'sunday_date') = $1::text), 0)
      $dyn$
      into v_pending_queue_count, v_archived_queue_count
      using v_target_sunday;

      if v_pending_queue_count = 0 then
        update public.email_reminder_logs
        set
          succeeded_count = case when v_archived_queue_count > 0 then v_archived_queue_count else total_queued end,
          status = 'completed',
          updated_at = now()
        where sunday_date = v_target_sunday
        returning * into v_email_log;
      end if;
    exception when others then
      null;
    end;
  end if;

  with scheduled_users as (
    select
      u.id as user_id,
      u.member_id,
      coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)), ''), u.full_name, u.email) as full_name,
      u.first_name,
      u.email,
      u.metadata ->> v_sunday_key as raw_slots,
      public.format_sunday_commitment_slots(u.metadata ->> v_sunday_key) as formatted_slots,
      exists(
        select 1
        from public.user_push_subscriptions sub
        join auth.users au on au.id = sub.user_id
        where lower(trim(au.email::text)) = lower(trim(u.email))
      ) as has_push,
      (u.email is not null and trim(u.email) != '' and u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') as has_email
    from public.users u
    where nullif(trim(u.metadata ->> v_sunday_key), '') is not null
      and trim(u.metadata ->> v_sunday_key) not in ('[]', '""', '')
  )
  select
    coalesce(count(*), 0),
    coalesce(count(*) filter (where has_push), 0),
    coalesce(count(*) filter (where has_email), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'member_id', member_id,
          'full_name', full_name,
          'email', email,
          'formatted_slots', formatted_slots,
          'has_push', has_push,
          'has_email', has_email
        )
        order by full_name asc
      ),
      '[]'::jsonb
    )
  into
    v_total_volunteers,
    v_push_eligible_count,
    v_email_eligible_count,
    v_volunteers
  from scheduled_users;

  return jsonb_build_object(
    'sunday_date', v_target_sunday,
    'ordinal', v_ordinal,
    'already_sent_push', (v_push_log.sunday_date is not null),
    'push_sent_at', v_push_log.processed_at,
    'already_sent_email', (v_email_log.sunday_date is not null),
    'email_sent_at', v_email_log.processed_at,
    'push_delivery', case
      when v_push_log.sunday_date is not null then
        jsonb_build_object(
          'already_sent', true,
          'sent_at', v_push_log.processed_at,
          'total_queued', v_push_log.total_queued,
          'succeeded_count', v_push_log.succeeded_count,
          'failed_count', v_push_log.failed_count,
          'status', v_push_log.status,
          'updated_at', v_push_log.updated_at
        )
      else null
    end,
    'email_delivery', case
      when v_email_log.sunday_date is not null then
        jsonb_build_object(
          'already_sent', true,
          'sent_at', v_email_log.processed_at,
          'total_queued', v_email_log.total_queued,
          'succeeded_count', v_email_log.succeeded_count,
          'failed_count', v_email_log.failed_count,
          'status', v_email_log.status,
          'updated_at', v_email_log.updated_at
        )
      else null
    end,
    'total_volunteers', v_total_volunteers,
    'push_eligible_count', v_push_eligible_count,
    'email_eligible_count', v_email_eligible_count,
    'volunteers', v_volunteers
  );
end;
$$;

commit;
