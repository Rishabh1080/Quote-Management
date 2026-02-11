-- First, add email column if it doesn't exist
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'email'
  ) then
    alter table public.users add column email text;
  end if;
end $$;

-- Update the trigger function to handle username from metadata
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, username, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    now()
  )
  on conflict (id) do update
    set 
      email = excluded.email,
      name = coalesce(excluded.name, public.users.name),
      username = coalesce(excluded.username, public.users.username);
  return new;
end;
$$;

-- The trigger already exists from the previous migration, but let's ensure it's there
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- Backfill any users that might be missing username (only if email column exists)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'email'
  ) then
    update public.users
    set username = split_part(email, '@', 1)
    where username is null and email is not null;
  end if;
end $$;
