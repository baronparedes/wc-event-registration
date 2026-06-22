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
() - interval '5 days',
		now
() - interval '5 days' + interval '2 hours',
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

delete from public.event_fields
where event_id in (
	select id
from public.events
where slug = 'sample-event'
);

insert into public.event_fields
	(
	event_id,
	field_key,
	label,
	field_type,
	is_required,
	is_active,
	placeholder,
	help_text,
	options,
	validation_rules,
	display_order
	)
values
	(
		(select id
		from public.events
		where slug = 'sample-event'),
		'team_name',
		'Team Name',
		'text',
		true,
		true,
		'Enter your team name',
		'Use your official small-group or service team name.',
		'[]'
::jsonb,
		'{"min_length": 3, "max_length": 60}'::jsonb,
		10
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'testimony',
		'Short Testimony',
		'textarea',
		false,
		true,
		'Share a short testimony (optional)',
		'Optional reflection to help event facilitators prepare.',
		'[]'::jsonb,
		'{"max_length": 300}'::jsonb,
		20
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'guests_count',
		'Number of Guests',
		'number',
		true,
		true,
		null,
		'How many guests will attend with you?',
		'[]'::jsonb,
		'{"min": 0, "max": 10}'::jsonb,
		30
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'contact_email',
		'Contact Email',
		'email',
		true,
		true,
		'name@example.com',
		'Used only for registration updates.',
		'[]'::jsonb,
		'{}'::jsonb,
		40
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'contact_phone',
		'Contact Phone',
		'phone',
		false,
		true,
		'+63 9XX XXX XXXX',
		'Optional mobile number for urgent event notices.',
		'[]'::jsonb,
		'{}'::jsonb,
		50
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'shirt_size',
		'Shirt Size',
		'select',
		true,
		true,
		null,
		'Select the closest available size.',
		'[{"label":"Small","value":"S"},{"label":"Medium","value":"M"},{"label":"Large","value":"L"},{"label":"XL","value":"XL"}]'::jsonb,
		'{}'::jsonb,
		60
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'attendance_slot',
		'Preferred Session',
		'radio',
		true,
		true,
		null,
		'Choose one preferred service session.',
		'[{"label":"9:00 AM","value":"9am"},{"label":"12:00 NN","value":"12nn"},{"label":"3:00 PM","value":"3pm"}]'::jsonb,
		'{}'::jsonb,
		70
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'bring_laptop',
		'I can bring a laptop',
		'checkbox',
		false,
		true,
		'Check if you can help by bringing a laptop.',
		'Optional logistics preference.',
		'[]'::jsonb,
		'{}'::jsonb,
		80
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'service_areas',
		'Service Areas',
		'multi_select',
		true,
		true,
		null,
		'Pick one or more service areas where you can help.',
		'[{"label":"Ushering","value":"ushering"},{"label":"Prayer Team","value":"prayer"},{"label":"Backroom","value":"backroom"},{"label":"VMT Support","value":"vmt"}]'::jsonb,
		'{"min_selections": 1, "max_selections": 3}'::jsonb,
		90
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'arrival_date',
		'Arrival Date',
		'date',
		true,
		true,
		null,
		'Select your expected arrival date.',
		'[]'::jsonb,
		'{}'::jsonb,
		100
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'arrival_time',
		'Arrival Date and Time',
		'datetime',
		false,
		true,
		null,
		'Optional detailed arrival estimate.',
		'[]'::jsonb,
		'{}'::jsonb,
		110
	),
(
		(select id
from public.events
where slug = 'sample-event')
,
		'code_of_conduct',
		'I agree to the event code of conduct',
		'boolean',
		true,
		true,
		'I agree to follow all event guidelines.',
		'Required before secure submit wiring in Chunk 5.',
		'[]'::jsonb,
		'{}'::jsonb,
		120
	);