begin;

    alter type public.duplicate_policy
    add value
    if not exists 'allow_multiple_update';

commit;
