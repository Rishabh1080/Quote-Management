-- Add remarks and notes columns to quotes table
alter table public.quotes
add column if not exists remarks text,
add column if not exists notes text;
