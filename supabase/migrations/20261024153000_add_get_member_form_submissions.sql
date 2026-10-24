-- Migration: 20261024153000_add_get_member_form_submissions.sql
-- Description: Create get_member_form_submissions RPC for member profile view
create or replace function public.get_member_form_submissions (p_user_id uuid) returns jsonb language plpgsql security definer stable
set
  search_path = public as $$
begin
  if not (
    public.is_admin_or_slod ()
    or exists (
      select 1
      from public.users u
      where u.id = p_user_id
        and u.email is not null
        and lower(u.email) = lower(auth.jwt() ->> 'email')
    )
  ) then
    raise exception 'unauthorized';
  end if;

  return (
    with submissions as (
      select
        jsonb_build_object(
          'submission_id', fs.id,
          'form_id', f.id,
          'form_title', f.title,
          'form_slug', f.slug,
          'form_description', f.description,
          'status', fs.status,
          'submitted_at', fs.submitted_at,
          'updated_at', fs.updated_at,
          'answers', coalesce(answers_lateral.answers, '[]'::jsonb),
          'approval_requests', coalesce(approvals_lateral.requests, '[]'::jsonb)
        ) as item,
        fs.submitted_at as sort_key
      from public.form_submissions fs
      join public.forms f on f.id = fs.form_id
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', fsa.id,
            'form_field_id', fsa.form_field_id,
            'field_key', ff.field_key,
            'label', ff.label,
            'field_type', ff.field_type,
            'answer_text',
              case
                when fsa.answer_text is not null then fsa.answer_text
                when fsa.answer_boolean is not null then fsa.answer_boolean::text
                when fsa.answer_date is not null then fsa.answer_date::text
                when fsa.answer_json is not null then fsa.answer_json::text
                else null
              end,
            'answer_number',
              case
                when fsa.answer_text is not null then null
                else fsa.answer_number
              end
          )
          order by ff.display_order
        ) as answers
        from public.form_submission_answers fsa
        join public.form_fields ff on ff.id = fsa.form_field_id
        where fsa.submission_id = fs.id
      ) as answers_lateral on true
      left join lateral (
        select jsonb_agg(
          jsonb_build_object(
            'id', ar.id,
            'status', ar.status,
            'title', ar.title,
            'summary', ar.summary,
            'assigned_to_email', ar.assigned_to_email,
            'decided_by_email', ar.decided_by_email,
            'decided_at', ar.decided_at,
            'decision_notes', ar.decision_notes,
            'field_label', coalesce(ar.metadata ->> 'field_label', ar.title),
            'field_key', ar.metadata ->> 'field_key'
          )
          order by ar.created_at asc
        ) as requests
        from public.approval_requests ar
        where ar.entity_type = 'form_submission'
          and ar.entity_id = fs.id
      ) as approvals_lateral on true
      where fs.user_id = p_user_id
    )
    select coalesce(jsonb_agg(item order by sort_key desc nulls last), '[]'::jsonb)
    from submissions
  );
end;
$$;

grant
execute on function public.get_member_form_submissions (uuid) to authenticated;
