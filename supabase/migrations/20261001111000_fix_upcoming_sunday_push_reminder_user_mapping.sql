begin;

create or replace function public.generate_upcoming_sunday_push_reminders () returns void language plpgsql security definer
set
  search_path = public as $$
declare
  v_now_pht timestamptz;
  v_upcoming_sunday date;
  v_ordinal int;
  v_sunday_key text;
  v_user record;
  v_commitments text;
  v_message text;
  v_slots text[];
  v_formatted_slots text;
  v_inserted_log boolean := false;
begin
  v_now_pht := timezone('Asia/Manila', now());
  v_upcoming_sunday := public.get_nearest_upcoming_sunday(v_now_pht::date);

  begin
    insert into public.push_reminder_logs (sunday_date) values (v_upcoming_sunday);
    v_inserted_log := true;
  exception when unique_violation then
    return;
  end;

  if not v_inserted_log then
    return;
  end if;

  v_ordinal := ceil(date_part('day', v_upcoming_sunday) / 7.0);

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
    v_commitments := v_user.slots_str;
    v_commitments := replace(v_commitments, '[', '');
    v_commitments := replace(v_commitments, ']', '');
    v_commitments := replace(v_commitments, '"', '');

    v_slots := string_to_array(v_commitments, ',');
    v_formatted_slots := '';

    for i in 1..array_length(v_slots, 1) loop
      declare
        v_slot_clean text := upper(trim(both ' ' from v_slots[i]));
      begin
        if v_slot_clean like '9%AM' then v_slot_clean := '9:00 AM';
        elsif v_slot_clean like '12%NN' then v_slot_clean := '12:00 NN';
        elsif v_slot_clean like '3%PM' then v_slot_clean := '3:00 PM';
        elsif v_slot_clean = '9AM' then v_slot_clean := '9:00 AM';
        elsif v_slot_clean = '12NN' then v_slot_clean := '12:00 NN';
        elsif v_slot_clean = '3PM' then v_slot_clean := '3:00 PM';
        end if;

        if i = 1 then
          v_formatted_slots := v_slot_clean;
        elsif i = array_length(v_slots, 1) then
          v_formatted_slots := v_formatted_slots || ' and ' || v_slot_clean;
        else
          v_formatted_slots := v_formatted_slots || ', ' || v_slot_clean;
        end if;
      end;
    end loop;

    if v_formatted_slots != '' then
      v_message := 'Reminder: You are scheduled this Sunday at ' || v_formatted_slots || '.';

      perform public.enqueue_push_reminder(
        jsonb_build_object(
          'user_id', v_user.user_id,
          'message', v_message,
          'target_date', v_upcoming_sunday,
          'target_url', '/profile?tab=commitments'
        )
      );
    end if;
  end loop;
end;
$$;

revoke
execute on function public.generate_upcoming_sunday_push_reminders ()
from
  public,
  anon,
  authenticated;

grant
execute on function public.generate_upcoming_sunday_push_reminders () to service_role;

commit;
