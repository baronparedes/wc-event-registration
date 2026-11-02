begin;

create or replace function public.complete_recruitment_vmt_registration (
  p_application_id uuid,
  p_actor_user_id uuid,
  p_actor_email text
) returns jsonb language plpgsql security definer
set
  search_path = public as $$
declare
  v_application public.recruitment_applications%rowtype;
  v_transaction_id uuid;
  v_transaction_status text;
  v_attempt_number integer;
begin
  if auth.role() <> 'service_role' and current_user <> 'service_role' then
    raise exception 'unauthorized';
  end if;

  if p_actor_user_id is null or nullif(trim(p_actor_email), '') is null then
    raise exception 'Applicant identity is required';
  end if;

  select application.*
  into v_application
  from public.recruitment_applications application
  where application.id = p_application_id
  for update;

  if not found then
    raise exception 'Recruitment application not found';
  end if;

  if v_application.auth_user_id is not null then
    if v_application.auth_user_id <> p_actor_user_id then
      raise exception 'unauthorized';
    end if;
  elsif lower(v_application.email) <> lower(trim(p_actor_email)) then
    raise exception 'unauthorized';
  end if;

  if v_application.vmt_registered and v_application.current_step >= 8 then
    return jsonb_build_object(
      'success', true,
      'application_id', v_application.id,
      'current_step', v_application.current_step,
      'vmt_registered', true,
      'already_completed', true
    );
  end if;

  if v_application.current_step <> 7 then
    raise exception 'CCF VMT registration is not the current step';
  end if;

  select transaction.id, transaction.status
  into v_transaction_id, v_transaction_status
  from public.recruitment_pipeline_transactions transaction
  where transaction.application_id = v_application.id
    and transaction.step_number = 7
  order by transaction.attempt_number desc
  limit 1
  for update;

  if found and v_transaction_status not in ('completed', 'skipped', 'declined') then
    update public.recruitment_pipeline_transactions
    set transaction_type = 'completed',
        from_step = 7,
        to_step = 8,
        status = 'completed',
        completed_at = now(),
        created_by_user_id = p_actor_user_id
    where id = v_transaction_id;
  else
    select coalesce(max(transaction.attempt_number), 0) + 1
    into v_attempt_number
    from public.recruitment_pipeline_transactions transaction
    where transaction.application_id = v_application.id
      and transaction.step_number = 7;

    insert into public.recruitment_pipeline_transactions (
      application_id,
      step_number,
      step_key,
      attempt_number,
      transaction_type,
      from_step,
      to_step,
      status,
      created_by_user_id,
      completed_at
    )
    values (
      v_application.id,
      7,
      'vmt_registration',
      v_attempt_number,
      'completed',
      7,
      8,
      'completed',
      p_actor_user_id,
      now()
    );
  end if;

  update public.recruitment_applications
  set auth_user_id = coalesce(auth_user_id, p_actor_user_id),
      vmt_registered = true,
      vmt_registered_at = coalesce(vmt_registered_at, now()),
      current_step = 8
  where id = v_application.id;

  return jsonb_build_object(
    'success', true,
    'application_id', v_application.id,
    'current_step', 8,
    'vmt_registered', true,
    'already_completed', false
  );
end;
$$;

revoke
execute on function public.complete_recruitment_vmt_registration (uuid, uuid, text)
from
  public,
  anon,
  authenticated;

grant
execute on function public.complete_recruitment_vmt_registration (uuid, uuid, text) to service_role;

commit;
