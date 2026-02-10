-- Add cost columns to quotes table to store quote-level costs
ALTER TABLE public.quotes 
  ADD COLUMN fixed_cost numeric DEFAULT NULL,
  ADD COLUMN man_days_cost numeric NOT NULL DEFAULT 0,
  ADD COLUMN stay_man_days_cost numeric NOT NULL DEFAULT 0;

-- Add comment to explain these fields
COMMENT ON COLUMN public.quotes.fixed_cost IS 'Optional fixed cost set at quote level';
COMMENT ON COLUMN public.quotes.man_days_cost IS 'Man days cost set at quote level (mandatory)';
COMMENT ON COLUMN public.quotes.stay_man_days_cost IS 'Stay cost set at quote level (mandatory)';
