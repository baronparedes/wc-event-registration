-- Update generate_upcoming_sunday_push_reminders to replace commitments with commitment in target url
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
      v_message := 'Reminder: You are scheduled on ' || to_char(v_target_sunday, 'YYYY-MM-DD') || ' at ' || v_formatted_slots || '.';

      perform public.enqueue_push_reminder(
        jsonb_build_object(
          'user_id', v_user.user_id,
          'message', v_message,
          'target_url', '/profile?tab=commitment'
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
    'queued',
    now()
  )
  on conflict (sunday_date) do update set
    processed_at = now(),
    total_queued = excluded.total_queued,
    succeeded_count = 0,
    failed_count = 0,
    status = 'queued',
    updated_at = now();

  return v_enqueued;
end;
$$;

-- Update generate_upcoming_sunday_email_reminders to replace commitments with commitment in target url
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
  v_profile_url constant text := 'https://welcomehub.app/profile?tab=commitment';
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
        'Reminder: You are scheduled on ' || to_char(v_target_sunday, 'YYYY-MM-DD') || ' (' || v_sunday_label || ') at ' || v_formatted_slots || '.' || chr(10) || chr(10) ||
        'You can review your schedule anytime here: ' || v_profile_url,
        'metadata', jsonb_build_object(
          'user_id', v_user.user_id,
          'first_name', v_greeting_name,
          'service_times', v_formatted_slots,
          'sunday_date', v_target_sunday,
          'sunday_label', v_sunday_label,
          'profile_url', v_profile_url,
          'target_url', '/profile?tab=commitment'
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
    'queued',
    now()
  )
  on conflict (sunday_date) do update set
    processed_at = now(),
    total_queued = excluded.total_queued,
    succeeded_count = 0,
    failed_count = 0,
    status = 'queued',
    updated_at = now();

  return v_enqueued;
end;
$$;
