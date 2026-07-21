begin;

alter type public.event_field_type
add value if not exists 'multi_select_toggle';

commit;
