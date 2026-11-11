alter table public.events enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'events'
  loop
    execute format('drop policy if exists %I on public.events', policy_name);
  end loop;
end
$$;

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
