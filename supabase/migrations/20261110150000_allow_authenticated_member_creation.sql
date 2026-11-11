alter table public.members enable row level security;

do $$
declare
  policy_name text;
begin
  for policy_name in
    select policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'members'
  loop
    execute format('drop policy if exists %I on public.members', policy_name);
  end loop;
end
$$;

create policy "Allow authenticated member reads"
  on public.members
  for select
  to authenticated
  using (true);

create policy "Allow authenticated member creation"
  on public.members
  for insert
  to authenticated
  with check (true);

grant select, insert on table public.members to authenticated;
