-- 0) Extensions (usually already present in Supabase, safe to keep)
create extension if not exists pgcrypto;

-- 1) Create public.users table if it does not exist
create table if not exists public.users (
  id uuid primary key,
  email text,
  name text,
  username text,
  can_approve boolean default false,
  created_at timestamptz default now()
);

-- 2) Add missing columns safely (if your table already existed)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'email'
  ) then
    alter table public.users add column email text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'name'
  ) then
    alter table public.users add column name text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'username'
  ) then
    alter table public.users add column username text;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'can_approve'
  ) then
    alter table public.users add column can_approve boolean default false;
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'created_at'
  ) then
    alter table public.users add column created_at timestamptz default now();
  end if;
end $$;

-- 3) Add FK from public.users.id to auth.users.id (id must match auth user id)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_id_fkey'
  ) then
    alter table public.users
      add constraint users_id_fkey
      foreign key (id) references auth.users(id)
      on delete cascade;
  end if;
end $$;

-- 4) Uniqueness rules
-- Email often matches auth email. Keep unique if you want, but only if your data is clean.
-- Username should be unique when present.
create unique index if not exists users_email_unique on public.users (email);
create unique index if not exists users_username_unique on public.users (username) where username is not null;

-- 5) Create trigger function that inserts a row into public.users on new auth user
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    now()
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- 6) Create trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- 7) Backfill: ensure every existing auth user has a public.users row
insert into public.users (id, email, name, created_at)
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data->>'name', au.email),
  now()
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- 8) Enable RLS
alter table public.users enable row level security;

-- 9) Policies: user can read and update only their own row
drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Note: no insert policy on purpose. Inserts happen via trigger.
