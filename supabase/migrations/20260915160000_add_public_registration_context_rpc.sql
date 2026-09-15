begin;

create or replace function public.get_public_registration_submission_context (p_event_slug text) returns table (
  event_id uuid,
  duplicate_policy text,
  allow_public_registrations boolean,
  registration_mode text,
  registration_opens_at timestamptz,
  registration_closes_at timestamptz,
  fields jsonb
) language sql security definer stable
set
  search_path = public as $$
  with selected_event as (
    select
      e.id,
      e.duplicate_policy::text,
      e.allow_public_registrations,
      e.registration_mode::text,
      e.registration_opens_at,
      e.registration_closes_at
    from public.events e
    where e.slug = p_event_slug
      and e.status = 'published'
    limit 1
  )
  select
    selected_event.id,
    selected_event.duplicate_policy,
    selected_event.allow_public_registrations,
    selected_event.registration_mode,
    selected_event.registration_opens_at,
    selected_event.registration_closes_at,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', field.id,
            'field_key', field.field_key,
            'label', field.label,
            'field_type', field.field_type,
            'applicability', field.applicability,
            'is_required', field.is_required,
            'options', field.options,
            'validation_rules', field.validation_rules
          )
          order by field.display_order, field.created_at
        )
        from public.event_fields field
        where field.event_id = selected_event.id
          and field.is_active = true
          and field.applicability in ('guests', 'both')
      ),
      '[]'::jsonb
    )
  from (select 1) anchor
  left join selected_event on true
$$;

grant
execute on function public.get_public_registration_submission_context (text) to service_role;

commit;
