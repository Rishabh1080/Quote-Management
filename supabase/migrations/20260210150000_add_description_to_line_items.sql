-- Add description column to quote_line_items table
ALTER TABLE public.quote_line_items 
  ADD COLUMN description text DEFAULT '';

COMMENT ON COLUMN public.quote_line_items.description IS 'Optional description for the line item';
