-- Add description column to products table
ALTER TABLE products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comment
COMMENT ON COLUMN products.description IS 'Rich text description of the product for PDF export';
