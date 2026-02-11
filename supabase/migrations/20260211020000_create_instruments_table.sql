-- Create instruments table
create table if not exists public.instruments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  instrument_name text not null,
  quantity numeric not null default 1,
  man_days numeric not null default 0,
  integration_cost numeric not null default 0,
  hardware_cost numeric not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

-- Add index for faster lookups
create index if not exists instruments_quote_id_idx on public.instruments(quote_id);

-- Add RLS policies
alter table public.instruments enable row level security;

-- Allow authenticated users to read instruments
create policy "Users can read instruments"
  on public.instruments
  for select
  to authenticated
  using (true);

-- Allow authenticated users to insert instruments
create policy "Users can insert instruments"
  on public.instruments
  for insert
  to authenticated
  with check (true);

-- Allow authenticated users to update instruments
create policy "Users can update instruments"
  on public.instruments
  for update
  to authenticated
  using (true);

-- Allow authenticated users to delete instruments
create policy "Users can delete instruments"
  on public.instruments
  for delete
  to authenticated
  using (true);

-- Add hardware_cost to quotes table
alter table public.quotes
add column if not exists hardware_cost numeric default 0;

comment on column public.quotes.hardware_cost is 'Hardware cost default set at quote level';
