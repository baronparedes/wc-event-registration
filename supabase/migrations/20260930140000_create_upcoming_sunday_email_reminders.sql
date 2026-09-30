begin;

-- Track processed Sunday dates for the email reminder job (idempotency guard)
create table if not exists public.email_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  sunday_date date not null unique,
  processed_at timestamptz not null default now()
);

alter table public.email_reminder_logs enable row level security;

drop policy if exists "allow service_role all" on public.email_reminder_logs;

create policy "allow service_role all" on public.email_reminder_logs for all to service_role using (true)
with
  check (true);

grant all on public.email_reminder_logs to service_role;

-- Normalizes a stored Sunday commitment value into a human readable service time list
create or replace function public.format_sunday_commitment_slots (raw_value text) returns text language plpgsql immutable
set
  search_path = public as $$
declare
  v_slots text[];
  v_slot text;
  v_count int;
  v_result text := '';
begin
  if raw_value is null or btrim(raw_value) = '' then
    return '';
  end if;

  -- Values may be stored as a plain csv string or a stringified JSON array
  v_slots := string_to_array(translate(raw_value, '[]"', ''), ',');
  v_count := coalesce(array_length(v_slots, 1), 0);

  for i in 1..v_count loop
    v_slot := upper(btrim(v_slots[i]));

    if v_slot like '9%AM' then
      v_slot := '9:00 AM';
    elsif v_slot like '12%NN' then
      v_slot := '12:00 NN';
    elsif v_slot like '3%PM' then
      v_slot := '3:00 PM';
    end if;

    if v_slot = '' then
      continue;
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

revoke
execute on function public.format_sunday_commitment_slots (text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.format_sunday_commitment_slots (text) to service_role;

-- Redundant email reminder for the upcoming Sunday schedule, mirroring the push reminder job
create or replace function public.generate_upcoming_sunday_email_reminders () returns integer language plpgsql security definer
set
  search_path = public as $$
declare
  v_now_pht timestamptz;
  v_upcoming_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_user record;
  v_formatted_slots text;
  v_sunday_label text;
  v_greeting_name text;
  v_profile_url constant text := 'https://welcomehub.app/profile?tab=commitments';
  v_enqueued int := 0;
begin
  v_now_pht := timezone('Asia/Manila', now());
  v_upcoming_sunday := public.get_nearest_upcoming_sunday(v_now_pht::date);

  -- Ensure only one email batch per Sunday
  begin
    insert into public.email_reminder_logs (sunday_date) values (v_upcoming_sunday);
  exception when unique_violation then
    return 0;
  end;

  v_ordinal := ceil(date_part('day', v_upcoming_sunday) / 7.0);

  if v_ordinal = 1 then v_sunday_key := 'first_sunday';
  elsif v_ordinal = 2 then v_sunday_key := 'second_sunday';
  elsif v_ordinal = 3 then v_sunday_key := 'third_sunday';
  elsif v_ordinal = 4 then v_sunday_key := 'fourth_sunday';
  else v_sunday_key := 'fifth_sunday';
  end if;

  v_sunday_label := to_char(v_upcoming_sunday, 'FMDay, FMMonth FMDD, YYYY');

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
        -- subject/text are ignored by the worker while the template slug resolves
        'subject', 'Service Reminder for ' || v_sunday_label,
        'text',
        'Hi ' || v_greeting_name || ',' || chr(10) || chr(10) ||
        'Reminder: You are scheduled this Sunday (' || v_sunday_label || ') at ' || v_formatted_slots || '.' || chr(10) || chr(10) ||
        'You can review your schedule anytime here: ' || v_profile_url,
        'metadata', jsonb_build_object(
          'user_id', v_user.user_id,
          'first_name', v_greeting_name,
          'service_times', v_formatted_slots,
          'sunday_date', v_upcoming_sunday,
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
execute on function public.generate_upcoming_sunday_email_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_upcoming_sunday_email_reminders () to service_role;

commit;
