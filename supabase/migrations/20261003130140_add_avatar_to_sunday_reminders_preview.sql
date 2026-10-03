-- Add avatar_object_key to get_sunday_schedule_reminders_preview
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
      u.avatar_object_key,
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
          'avatar_object_key', avatar_object_key,
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
