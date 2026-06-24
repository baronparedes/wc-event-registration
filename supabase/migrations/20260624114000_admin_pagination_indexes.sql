begin;

    -- ============================================================
    -- Chunk 11 (Gate C): Keyset pagination support
    --
    -- These indexes support stable DESC ordering with tie-breaker id.
    -- ============================================================

    create index events_created_id_desc_idx
      on public.events (created_at desc, id desc);

    create index registrations_event_submitted_id_desc_idx
      on public.registrations (event_id, submitted_at desc, id desc);

commit;
