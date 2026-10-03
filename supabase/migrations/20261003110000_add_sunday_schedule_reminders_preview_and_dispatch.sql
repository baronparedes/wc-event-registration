begin;

-- 1. Grant format_sunday_commitment_slots to authenticated users so admin preview RPC can call it
grant
execute on function public.format_sunday_commitment_slots (text) to authenticated,
service_role;

-- 2. Drop old parameterless signatures to allow new defaulted parameter signatures
drop function if exists public.generate_upcoming_sunday_push_reminders ();

drop function if exists public.generate_upcoming_sunday_email_reminders ();

-- 3. Create updated generate_upcoming_sunday_push_reminders with custom target date and force flag
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

  if p_force then
    delete from public.push_reminder_logs where sunday_date = v_target_sunday;
  end if;

  begin
    insert into public.push_reminder_logs (sunday_date) values (v_target_sunday);
  exception when unique_violation then
    return 0;
  end;

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

  return v_enqueued;
end;
$$;

revoke
execute on function public.generate_upcoming_sunday_push_reminders (date, boolean)
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_upcoming_sunday_push_reminders (date, boolean) to authenticated,
service_role;

-- 4. Create updated generate_upcoming_sunday_email_reminders with custom target date and force flag
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

  if p_force then
    delete from public.email_reminder_logs where sunday_date = v_target_sunday;
  end if;

  begin
    insert into public.email_reminder_logs (sunday_date) values (v_target_sunday);
  exception when unique_violation then
    return 0;
  end;

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
      btrim(u.email) as email,
      coalesce(nullif(btrim(u.first_name), ''), nullif(btrim(u.full_name), '')) as display_name,
      nullif(btrim(u.metadata ->> v_sunday_key), '') as slots_str
    from public.users u
    where nullif(btrim(u.email), '') is not null
      and nullif(btrim(u.metadata ->> v_sunday_key), '') is not null
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

  return v_enqueued;
end;
$$;

revoke
execute on function public.generate_upcoming_sunday_email_reminders (date, boolean)
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_upcoming_sunday_email_reminders (date, boolean) to authenticated,
service_role;

-- 5. get_sunday_schedule_reminders_preview
create or replace function public.get_sunday_schedule_reminders_preview (p_sunday_date date default null) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_already_sent_push boolean := false;
  v_push_sent_at timestamptz := null;
  v_already_sent_email boolean := false;
  v_email_sent_at timestamptz := null;
  v_volunteers jsonb := '[]'::jsonb;
  v_total_volunteers int := 0;
  v_push_eligible_count int := 0;
  v_email_eligible_count int := 0;
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

  select exists(select 1 from public.push_reminder_logs where sunday_date = v_target_sunday),
         (select processed_at from public.push_reminder_logs where sunday_date = v_target_sunday limit 1)
  into v_already_sent_push, v_push_sent_at;

  select exists(select 1 from public.email_reminder_logs where sunday_date = v_target_sunday),
         (select processed_at from public.email_reminder_logs where sunday_date = v_target_sunday limit 1)
  into v_already_sent_email, v_email_sent_at;

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
  from scheduled_users
  where formatted_slots != '';

  return jsonb_build_object(
    'sunday_date', v_target_sunday,
    'ordinal', v_ordinal,
    'sunday_key', v_sunday_key,
    'already_sent_push', v_already_sent_push,
    'push_sent_at', v_push_sent_at,
    'already_sent_email', v_already_sent_email,
    'email_sent_at', v_email_sent_at,
    'total_volunteers', v_total_volunteers,
    'push_eligible_count', v_push_eligible_count,
    'email_eligible_count', v_email_eligible_count,
    'volunteers', v_volunteers
  );
end;
$$;

revoke
execute on function public.get_sunday_schedule_reminders_preview (date)
from
  public,
  anon;

grant
execute on function public.get_sunday_schedule_reminders_preview (date) to authenticated,
service_role;

-- 6. dispatch_sunday_schedule_reminders
create or replace function public.dispatch_sunday_schedule_reminders (
  p_target_date date default null,
  p_channels text[] default array['push', 'email'],
  p_force boolean default false
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_push_enqueued int := 0;
  v_email_enqueued int := 0;
begin
  if not (public.is_admin() or auth.role() = 'service_role' or current_user = 'service_role') then
    raise exception 'Unauthorized to dispatch Sunday schedule reminders';
  end if;

  v_target_sunday := coalesce(p_target_date, public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date));

  if 'push' = any(p_channels) then
    v_push_enqueued := public.generate_upcoming_sunday_push_reminders(v_target_sunday, p_force);
    if v_push_enqueued > 0 then
      perform public.trigger_push_reminder_processor();
    end if;
  end if;

  if 'email' = any(p_channels) then
    v_email_enqueued := public.generate_upcoming_sunday_email_reminders(v_target_sunday, p_force);
    if v_email_enqueued > 0 then
      perform public.trigger_email_processor();
    end if;
  end if;

  return jsonb_build_object(
    'success', true,
    'sunday_date', v_target_sunday,
    'push_enqueued', v_push_enqueued,
    'email_enqueued', v_email_enqueued
  );
end;
$$;

revoke
execute on function public.dispatch_sunday_schedule_reminders (date, text[], boolean)
from
  public,
  anon;

grant
execute on function public.dispatch_sunday_schedule_reminders (date, text[], boolean) to authenticated,
service_role;

-- 7. Update cron wrappers to use dispatch_sunday_schedule_reminders and pass the nearest upcoming sunday date explicitly
create or replace function public.generate_and_dispatch_upcoming_sunday_push_reminders () returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
begin
  v_target_sunday := public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date);
  perform public.dispatch_sunday_schedule_reminders(v_target_sunday, array['push'], false);
end;
$$;

revoke
execute on function public.generate_and_dispatch_upcoming_sunday_push_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_and_dispatch_upcoming_sunday_push_reminders () to service_role;

create or replace function public.generate_and_dispatch_upcoming_sunday_email_reminders () returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_target_sunday date;
  v_res jsonb;
begin
  v_target_sunday := public.get_nearest_upcoming_sunday(timezone('Asia/Manila', now())::date);
  v_res := public.dispatch_sunday_schedule_reminders(v_target_sunday, array['email'], false);
  return coalesce((v_res->>'email_enqueued')::int, 0);
end;
$$;

revoke
execute on function public.generate_and_dispatch_upcoming_sunday_email_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_and_dispatch_upcoming_sunday_email_reminders () to service_role;

commit;
