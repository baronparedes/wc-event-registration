begin;

-- 1. Overload format_sunday_commitment_slots to accept optional excused_services
create or replace function public.format_sunday_commitment_slots (
  raw_value text,
  excused_services text default null
) returns text language plpgsql immutable
set
  search_path = public as $$
declare
  v_slots text[];
  v_raw_slot text;
  v_slot_label text;
  v_slot text;
  v_count int;
  v_is_excused boolean;
  v_result text := '';
begin
  if raw_value is null or btrim(raw_value) = '' then
    return '';
  end if;

  v_slots := string_to_array(translate(raw_value, '[]"', ''), ',');
  v_count := coalesce(array_length(v_slots, 1), 0);

  for i in 1..v_count loop
    v_raw_slot := upper(btrim(v_slots[i]));

    if v_raw_slot like '9%AM' then
      v_slot_label := '9:00 AM';
      v_is_excused := (
        excused_services is not null and btrim(excused_services) != '' and (
          excused_services ilike '%all%'
          or excused_services ilike '%9%AM%'
          or excused_services ilike '%9:00%'
        )
      );
    elsif v_raw_slot like '12%NN' or v_raw_slot like '12%PM' then
      v_slot_label := '12:00 NN';
      v_is_excused := (
        excused_services is not null and btrim(excused_services) != '' and (
          excused_services ilike '%all%'
          or excused_services ilike '%12%NN%'
          or excused_services ilike '%12:00%'
          or excused_services ilike '%12%PM%'
        )
      );
    elsif v_raw_slot like '3%PM' then
      v_slot_label := '3:00 PM';
      v_is_excused := (
        excused_services is not null and btrim(excused_services) != '' and (
          excused_services ilike '%all%'
          or excused_services ilike '%3%PM%'
          or excused_services ilike '%3:00%'
        )
      );
    else
      v_slot_label := v_raw_slot;
      v_is_excused := false;
    end if;

    if v_slot_label = '' then
      continue;
    end if;

    if v_is_excused then
      v_slot := v_slot_label || ' (Excused)';
    else
      v_slot := v_slot_label;
    end if;

    if v_result = '' then
      v_result := v_slot;
    elsif i = v_count then
      v_result := v_result || ' and ' || v_slot;
    else
      v_result := v_result || ', ' || v_slot;
    end if;
  end loop;

  return v_result;
end;
$$;

-- Preserve single-argument format_sunday_commitment_slots
create or replace function public.format_sunday_commitment_slots (raw_value text) returns text language plpgsql immutable
set
  search_path = public as $$
begin
  return public.format_sunday_commitment_slots(raw_value, null);
end;
$$;

grant
execute on function public.format_sunday_commitment_slots (text, text) to authenticated,
service_role;

grant
execute on function public.format_sunday_commitment_slots (text) to authenticated,
service_role;

-- 2. Helper function to check if volunteer commitment is fully excused
create or replace function public.is_sunday_commitment_fully_excused (raw_value text, excused_services text) returns boolean language plpgsql immutable
set
  search_path = public as $$
declare
  v_slots text[];
  v_raw_slot text;
  v_count int;
  v_valid_slots_count int := 0;
  v_excused_slots_count int := 0;
  v_is_excused boolean;
begin
  if raw_value is null or btrim(raw_value) = '' or excused_services is null or btrim(excused_services) = '' then
    return false;
  end if;

  if excused_services ilike '%all%' then
    return true;
  end if;

  v_slots := string_to_array(translate(raw_value, '[]"', ''), ',');
  v_count := coalesce(array_length(v_slots, 1), 0);

  if v_count = 0 then
    return false;
  end if;

  for i in 1..v_count loop
    v_raw_slot := upper(btrim(v_slots[i]));

    if v_raw_slot like '9%AM' then
      v_valid_slots_count := v_valid_slots_count + 1;
      v_is_excused := (excused_services ilike '%9%AM%' or excused_services ilike '%9:00%');
    elsif v_raw_slot like '12%NN' or v_raw_slot like '12%PM' then
      v_valid_slots_count := v_valid_slots_count + 1;
      v_is_excused := (excused_services ilike '%12%NN%' or excused_services ilike '%12:00%' or excused_services ilike '%12%PM%');
    elsif v_raw_slot like '3%PM' then
      v_valid_slots_count := v_valid_slots_count + 1;
      v_is_excused := (excused_services ilike '%3%PM%' or excused_services ilike '%3:00%');
    else
      v_is_excused := false;
    end if;

    if v_is_excused then
      v_excused_slots_count := v_excused_slots_count + 1;
    end if;
  end loop;

  return (v_valid_slots_count > 0 and v_excused_slots_count >= v_valid_slots_count);
end;
$$;

grant
execute on function public.is_sunday_commitment_fully_excused (text, text) to authenticated,
service_role;

-- 3. Update generate_upcoming_sunday_push_reminders to suppress full excuses and format partial excuses
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
      trim(both ' ' from nullif((member.metadata->>v_sunday_key), '')) as slots_str,
      eb.excused_services
    from public.users member
    join auth.users auth_user
      on lower(trim(member.email)) = lower(trim(auth_user.email::text))
    left join (
      select
        r.user_id,
        string_agg(coalesce(nullif(trim(ra_serv.answer_text), ''), 'All'), ', ') as excused_services
      from public.registrations r
      join public.registration_answers ra_date on ra_date.registration_id = r.id
      join public.event_fields ef_date on ef_date.id = ra_date.event_field_id and ef_date.field_key = 'request_date'
      left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
      left join public.event_fields ef_serv on ef_serv.id = ra_serv.event_field_id and ef_serv.field_key = 'services'
      where r.status != 'cancelled'
        and coalesce(ra_date.answer_text, cast(ra_date.answer_date as text)) like (v_target_sunday::text || '%')
      group by r.user_id
    ) eb on eb.user_id = member.id
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
    -- Suppress push notification for fully excused volunteers
    if public.is_sunday_commitment_fully_excused(v_user.slots_str, v_user.excused_services) then
      continue;
    end if;

    v_formatted_slots := public.format_sunday_commitment_slots(v_user.slots_str, v_user.excused_services);

    if v_formatted_slots != '' then
      v_message := 'Reminder: You are scheduled on ' || to_char(v_target_sunday, 'YYYY-MM-DD') || ' at ' || v_formatted_slots || '.';

      perform public.enqueue_push_reminder(
        jsonb_build_object(
          'user_id', v_user.user_id,
          'message', v_message,
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

revoke
execute on function public.generate_upcoming_sunday_push_reminders (date, boolean)
from
  public,
  anon;

grant
execute on function public.generate_upcoming_sunday_push_reminders (date, boolean) to authenticated,
service_role;

-- 4. Update generate_upcoming_sunday_email_reminders to suppress full excuses and format partial excuses
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
      trim(both ' ' from nullif((u.metadata->>v_sunday_key), '')) as slots_str,
      eb.excused_services
    from public.users u
    left join (
      select
        r.user_id,
        string_agg(coalesce(nullif(trim(ra_serv.answer_text), ''), 'All'), ', ') as excused_services
      from public.registrations r
      join public.registration_answers ra_date on ra_date.registration_id = r.id
      join public.event_fields ef_date on ef_date.id = ra_date.event_field_id and ef_date.field_key = 'request_date'
      left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
      left join public.event_fields ef_serv on ef_serv.id = ra_serv.event_field_id and ef_serv.field_key = 'services'
      where r.status != 'cancelled'
        and coalesce(ra_date.answer_text, cast(ra_date.answer_date as text)) like (v_target_sunday::text || '%')
      group by r.user_id
    ) eb on eb.user_id = u.id
    where u.email is not null
      and trim(u.email) != ''
      and u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      and nullif((u.metadata->>v_sunday_key), '') is not null
      and trim(both ' ' from (u.metadata->>v_sunday_key)) != ''
  loop
    -- Suppress email for fully excused volunteers
    if public.is_sunday_commitment_fully_excused(v_user.slots_str, v_user.excused_services) then
      continue;
    end if;

    v_formatted_slots := public.format_sunday_commitment_slots(v_user.slots_str, v_user.excused_services);

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

revoke
execute on function public.generate_upcoming_sunday_email_reminders (date, boolean)
from
  public,
  anon;

grant
execute on function public.generate_upcoming_sunday_email_reminders (date, boolean) to authenticated,
service_role;

-- 5. Update get_sunday_schedule_reminders_preview to include excuse_status and adjust eligible counts
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
  v_fully_excused_count int := 0;
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
      u.avatar_object_key,
      u.metadata ->> v_sunday_key as raw_slots,
      public.format_sunday_commitment_slots(u.metadata ->> v_sunday_key, eb.excused_services) as formatted_slots,
      eb.excused_services,
      case
        when public.is_sunday_commitment_fully_excused(u.metadata ->> v_sunday_key, eb.excused_services) then 'full'
        when eb.excused_services is not null and public.format_sunday_commitment_slots(u.metadata ->> v_sunday_key, eb.excused_services) like '%(Excused)%' then 'partial'
        else 'none'
      end as excuse_status,
      exists(
        select 1
        from public.user_push_subscriptions sub
        join auth.users au on au.id = sub.user_id
        where lower(trim(au.email::text)) = lower(trim(u.email))
      ) as user_has_push,
      (u.email is not null and trim(u.email) != '' and u.email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$') as user_has_email
    from public.users u
    left join (
      select
        r.user_id,
        string_agg(coalesce(nullif(trim(ra_serv.answer_text), ''), 'All'), ', ') as excused_services
      from public.registrations r
      join public.registration_answers ra_date on ra_date.registration_id = r.id
      join public.event_fields ef_date on ef_date.id = ra_date.event_field_id and ef_date.field_key = 'request_date'
      left join public.registration_answers ra_serv on ra_serv.registration_id = r.id
      left join public.event_fields ef_serv on ef_serv.id = ra_serv.event_field_id and ef_serv.field_key = 'services'
      where r.status != 'cancelled'
        and coalesce(ra_date.answer_text, cast(ra_date.answer_date as text)) like (v_target_sunday::text || '%')
      group by r.user_id
    ) eb on eb.user_id = u.id
    where nullif(trim(u.metadata ->> v_sunday_key), '') is not null
      and trim(u.metadata ->> v_sunday_key) not in ('[]', '""', '')
  )
  select
    coalesce(count(*), 0),
    coalesce(count(*) filter (where excuse_status = 'full'), 0),
    coalesce(count(*) filter (where user_has_push and excuse_status != 'full'), 0),
    coalesce(count(*) filter (where user_has_email and excuse_status != 'full'), 0),
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'user_id', user_id,
          'member_id', member_id,
          'full_name', full_name,
          'email', email,
          'avatar_object_key', avatar_object_key,
          'formatted_slots', formatted_slots,
          'has_push', user_has_push,
          'has_email', user_has_email,
          'excuse_status', excuse_status
        )
        order by full_name asc
      ),
      '[]'::jsonb
    )
  into
    v_total_volunteers,
    v_fully_excused_count,
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
    'fully_excused_count', v_fully_excused_count,
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

commit;
