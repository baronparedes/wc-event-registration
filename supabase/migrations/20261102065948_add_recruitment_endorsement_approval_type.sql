begin;

alter type public.approval_entity_type
add value if not exists 'recruitment_endorsement';

commit;
