begin;

    -- ============================================================
    -- Chunk 11 (Gate C): Admin audit trail
    --
    -- Records privileged admin actions for traceability.
    -- Admin users can read/insert through RLS. Service role is
    -- granted explicit table access for Edge Function writes.
    -- ============================================================

    create table public.admin_audit_logs
    (
        id uuid primary key default gen_random_uuid(),
        admin_id uuid references public.admins (id) on delete set null,
        action text not null,
        resource_type text not null,
        resource_id text,
        metadata jsonb not null default '{}'
        ::jsonb,
        created_at timestamptz not null default now
        (),
        constraint admin_audit_logs_action_allowed check
        (
            action in
        (
                'create_event',
                'update_event',
                'publish_event',
                'archive_event',
                'cancel_registration',
                'reactivate_registration',
                'export_registrations_csv'
            )
        ),
        constraint admin_audit_logs_resource_type_allowed check
        (
            resource_type in
        ('event', 'registration', 'export')
        )
    );

        create index admin_audit_logs_admin_created_idx
        on public.admin_audit_logs (admin_id, created_at desc);

        create index admin_audit_logs_resource_created_idx
        on public.admin_audit_logs (resource_type, resource_id, created_at desc);

        create index admin_audit_logs_created_idx
        on public.admin_audit_logs (created_at desc);

        alter table public.admin_audit_logs enable row level security;

    create policy "admins can read audit logs"
      on public.admin_audit_logs for
    select
        to authenticated
    using
    (public.is_admin
    ());

    create policy "admins can insert audit logs"
      on public.admin_audit_logs for
    insert
      to authenticated
      with check (public.
    is_admin()
    );

    grant select, insert on table public.admin_audit_logs to authenticated;
    grant all on table public.admin_audit_logs to service_role;

    commit;
