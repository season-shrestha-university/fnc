alter table public.events enable row level security;

drop policy if exists "Allow event reads" on public.events;
create policy "Allow event reads"
  on public.events
  for select
  to authenticated
  using (true);

drop policy if exists "Allow event creation" on public.events;
create policy "Allow event creation"
  on public.events
  for insert
  to authenticated
  with check (true);

drop policy if exists "Allow event updates" on public.events;
create policy "Allow event updates"
  on public.events
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Allow event deletion" on public.events;
create policy "Allow event deletion"
  on public.events
  for delete
  to authenticated
  using (true);
