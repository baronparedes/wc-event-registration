-- Local seed data for Chunk 3 public registration testing.
insert into public.events
    (
    slug,
    title,
    description,
    location,
    starts_at,
    ends_at,
    registration_opens_at,
    registration_closes_at,
    status,
    duplicate_policy,
    registration_mode,
    metadata
    )
values
    (
        'sample-event',
        'Sample Event Registration',
        'Primary local test event for the public ID-first gate.',
        'West Campus Hall A',
        now() + interval
'14 days',
		now
() + interval '14 days 4 hours',
		now
() - interval '1 day',
		now
() + interval '7 days',
		'published',
		'block',
		'open',
		'{"seeded": true, "scenario": "open"}'::jsonb
	),
(
		'future-event',
		'Future Event (Not Open Yet)',
		'Published event with a future registration open date.',
		'West Campus Hall B',
		now
() + interval '30 days',
		now
() + interval '30 days 3 hours',
		now
() + interval '3 days',
		now
() + interval '20 days',
		'published',
		'allow_update',
		'open',
		'{"seeded": true, "scenario": "not_open_yet"}'::jsonb
	),
(
		'closed-event',
		'Closed Event',
		'Published event with closed registration window.',
		'West Campus Hall C',
		now
() + interval '5 days',
		now
() + interval '5 days 2 hours',
		now
() - interval '10 days',
		now
() - interval '1 day',
		'published',
		'block',
		'open',
		'{"seeded": true, "scenario": "closed"}'::jsonb
	)
on conflict
(slug)
do
update
set
	title = excluded.title,
	description = excluded.description,
	location = excluded.location,
	starts_at = excluded.starts_at,
	ends_at = excluded.ends_at,
	registration_opens_at = excluded.registration_opens_at,
	registration_closes_at = excluded.registration_closes_at,
	status = excluded.status,
	duplicate_policy = excluded.duplicate_policy,
	registration_mode = excluded.registration_mode,
	metadata = excluded.metadata;