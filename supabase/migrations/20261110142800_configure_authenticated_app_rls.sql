alter table public.members enable row level security;
alter table public.events enable row level security;
alter table public.check_ins enable row level security;

do $$
declare
  target_table text;
  policy_name text;
begin
  foreach target_table in array array['members', 'events', 'check_ins']
  loop
    for policy_name in
      select policyname
      from pg_catalog.pg_policies as policies
      where policies.schemaname = 'public'
        and policies.tablename = target_table
    loop
      execute format('drop policy if exists %I on public.%I', policy_name, target_table);
    end loop;
  end loop;
end
$$;

create policy "Allow authenticated member reads"
  on public.members
  for select
  to authenticated
  using (true);

create policy "Allow authenticated event reads"
  on public.events
  for select
  to authenticated
  using (true);

create policy "Allow authenticated event creation"
  on public.events
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated event updates"
  on public.events
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Allow authenticated event deletion"
  on public.events
  for delete
  to authenticated
  using (true);

create policy "Allow authenticated check-in reads"
  on public.check_ins
  for select
  to authenticated
  using (true);

create policy "Allow authenticated check-in creation"
  on public.check_ins
  for insert
  to authenticated
  with check (true);

create policy "Allow authenticated check-in deletion"
  on public.check_ins
  for delete
  to authenticated
  using (true);
