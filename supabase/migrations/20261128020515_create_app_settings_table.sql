begin;

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  is_public boolean not null default false,
  description text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

alter table public.app_settings enable row level security;

drop policy if exists "authenticated can read permitted app settings" on public.app_settings;

create policy "authenticated can read permitted app settings" on public.app_settings for
select
  to authenticated using (
    is_public = true
    or public.is_admin_viewer ()
    or (
      key = 'recruitment'
      and public.is_recruitment_reviewer ()
    )
  );

drop policy if exists "service role can manage app settings" on public.app_settings;

create policy "service role can manage app settings" on public.app_settings for all to service_role using (true)
with
  check (true);

revoke all on public.app_settings
from
  public,
  anon,
  authenticated;

grant
select
  on public.app_settings to authenticated;

grant all on public.app_settings to service_role;

drop trigger if exists app_settings_set_updated_at on public.app_settings;

create trigger app_settings_set_updated_at
before update on public.app_settings for each row
execute function public.set_updated_at ();

-- Public security-definer RPC returning only settings explicitly marked is_public = true
create or replace function public.get_public_app_settings (p_keys text[] default null) returns jsonb language sql security definer stable
set
  search_path = public as $$
  select coalesce(
    jsonb_object_agg(s.key, s.value),
    '{}'::jsonb
  )
  from public.app_settings s
  where s.is_public = true
    and (p_keys is null or s.key = any(p_keys));
$$;

revoke
execute on function public.get_public_app_settings (text[])
from
  public;

grant
execute on function public.get_public_app_settings (text[]) to anon,
authenticated,
service_role;

-- Seed Tier 1 & Tier 2 system defaults
insert into
  public.app_settings (key, value, is_public, description)
values
  (
    'service_staffing_targets',
    '{
      "9AM": {"Usher": 17, "Backroom Support": 11, "Prayer Coach": 50, "IMT Support": 4, "VMT Support": 2},
      "12NN": {"Usher": 15, "Backroom Support": 11, "Prayer Coach": 40, "IMT Support": 4, "VMT Support": 2},
      "3PM": {"Usher": 19, "Backroom Support": 13, "Prayer Coach": 60, "IMT Support": 4, "VMT Support": 2}
    }'::jsonb,
    false,
    'Target volunteer headcount per service time slot and ministry role.'
  ),
  (
    'forecast_confidence_thresholds',
    '{"solid": 0.7, "moderate": 0.4, "default_turnup_rate": 0.8}'::jsonb,
    false,
    'Turnup probability thresholds for Solid/Moderate/At Risk tiers and baseline turnup rate for new members.'
  ),
  (
    'attendance_scoring_weights',
    '{"attended": 1.0, "absence": -1.0, "excused": -0.5, "walk_in_9am_3pm": 0.5, "walk_in_5th_sunday": 1.0}'::jsonb,
    false,
    'Scoring weights used to compute volunteer commitment attendance ratings.'
  ),
  (
    'long_leave_policy',
    '{"min_days": 28, "min_weeks": 4, "require_sunday_dates": true}'::jsonb,
    true,
    'Minimum duration and Sunday-boundary policy for volunteer long leave requests.'
  ),
  (
    'service_time_slots',
    '[
      {"key": "9AM", "label": "9:00 AM", "sort_order": 1, "is_active": true},
      {"key": "12NN", "label": "12:00 NN", "sort_order": 2, "is_active": true},
      {"key": "3PM", "label": "3:00 PM", "sort_order": 3, "is_active": true}
    ]'::jsonb,
    true,
    'Configured Sunday service time slots, display labels, ordering, and active state.'
  ),
  (
    'volunteer_roles',
    '[
      {"key": "Usher", "label": "Usher", "sort_order": 1, "is_active": true, "is_recruitment_enabled": true, "is_staffing_target": true},
      {"key": "Backroom Support", "label": "Backroom Support", "sort_order": 2, "is_active": true, "is_recruitment_enabled": false, "is_staffing_target": true},
      {"key": "Prayer Coach", "label": "Prayer Coach", "sort_order": 3, "is_active": true, "is_recruitment_enabled": true, "is_staffing_target": true},
      {"key": "IMT Support", "label": "IMT Support", "sort_order": 4, "is_active": true, "is_recruitment_enabled": true, "is_staffing_target": true},
      {"key": "VMT Support", "label": "VMT Support", "sort_order": 5, "is_active": true, "is_recruitment_enabled": true, "is_staffing_target": true},
      {"key": "OIC", "label": "OIC", "sort_order": 6, "is_active": true, "is_recruitment_enabled": false, "is_staffing_target": false}
    ]'::jsonb,
    true,
    'Configured volunteer ministry roles, recruitment availability, and staffing target participation.'
  ),
  (
    'weekly_debrief_config',
    '{"recipient_roles": ["OIC"]}'::jsonb,
    false,
    'Target roles that receive automated weekly Sunday executive debrief notifications and emails.'
  )
on conflict (key) do nothing;

commit;
