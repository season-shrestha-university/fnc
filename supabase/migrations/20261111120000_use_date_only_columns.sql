alter table public.events
  alter column event_date drop default,
  alter column created_at drop default;

alter table public.events
  alter column event_date type date using event_date::date,
  alter column event_date set default current_date,
  alter column created_at type date using created_at::date,
  alter column created_at set default current_date;

alter table public.check_ins
  alter column created_at drop default;

alter table public.check_ins
  alter column created_at type date using created_at::date,
  alter column created_at set default current_date;
