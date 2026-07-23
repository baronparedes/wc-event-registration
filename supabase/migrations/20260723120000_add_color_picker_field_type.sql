begin;

alter type public.event_field_type
add value if not exists 'color_picker';

alter type public.attendance_field_type
add value if not exists 'color_picker';

commit;
