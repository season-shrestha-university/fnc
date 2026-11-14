-- Allow optional date of birth when creating or updating members
alter table public.members
  alter column dob drop not null;
