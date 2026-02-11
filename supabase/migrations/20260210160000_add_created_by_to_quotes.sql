-- Add created_by column to quotes table
ALTER TABLE public.quotes 
  ADD COLUMN created_by uuid REFERENCES public.users(id);

-- Add index for better query performance
CREATE INDEX idx_quotes_created_by ON public.quotes (created_by);

COMMENT ON COLUMN public.quotes.created_by IS 'User who created this quote';
