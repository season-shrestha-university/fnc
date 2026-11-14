-- Add optional contact fields to members
alter table public.members
  add column if not exists email text default '',
  add column if not exists phone text default '';

-- Grant update and delete permissions on members to authenticated volunteers
grant update, delete on table public.members to authenticated;

drop policy if exists "Allow authenticated member updates" on public.members;
create policy "Allow authenticated member updates"
  on public.members
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow authenticated member deletion" on public.members;
create policy "Allow authenticated member deletion"
  on public.members
  for delete
  to authenticated
  using (true);

-- Ensure deleting a member cascades to their check-ins
do $$
declare
  fk_name text;
begin
  for fk_name in
    select conname
    from pg_constraint
    where conrelid = 'public.check_ins'::regclass
      and confrelid = 'public.members'::regclass
      and contype = 'f'
  loop
    execute format('alter table public.check_ins drop constraint %I', fk_name);
  end loop;
end
$$;

alter table public.check_ins
  add constraint check_ins_member_id_fkey
  foreign key (member_id)
  references public.members(id)
  on delete cascade;

-- Provision public-read, authenticated-write storage bucket for member photos
insert into storage.buckets (id, name, public)
values ('member-photos', 'member-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Allow public read of member photos" on storage.objects;
create policy "Allow public read of member photos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'member-photos');

drop policy if exists "Allow authenticated upload of member photos" on storage.objects;
create policy "Allow authenticated upload of member photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'member-photos');

drop policy if exists "Allow authenticated update of member photos" on storage.objects;
create policy "Allow authenticated update of member photos"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'member-photos')
  with check (bucket_id = 'member-photos');

drop policy if exists "Allow authenticated delete of member photos" on storage.objects;
create policy "Allow authenticated delete of member photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'member-photos');
