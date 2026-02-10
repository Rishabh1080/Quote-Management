
-- 1) companies
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);

-- 2) products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  base_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 3) statuses
CREATE TABLE public.statuses (
  code text PRIMARY KEY,
  label text NOT NULL
);
ALTER TABLE public.statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to statuses" ON public.statuses FOR ALL USING (true) WITH CHECK (true);

-- 4) additional_costs
CREATE TABLE public.additional_costs (
  code text PRIMARY KEY,
  label text NOT NULL,
  default_unit_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.additional_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to additional_costs" ON public.additional_costs FOR ALL USING (true) WITH CHECK (true);

-- 5) quotes
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_group_id uuid NOT NULL,
  version_number int NOT NULL DEFAULT 0,
  version_label text NOT NULL,
  is_latest boolean NOT NULL DEFAULT true,
  status_code text NOT NULL REFERENCES public.statuses(code),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  discount_percent int NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  subtotal numeric NOT NULL DEFAULT 0,
  net_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_quotes_group_version ON public.quotes (quote_group_id, version_number DESC);
CREATE INDEX idx_quotes_is_latest ON public.quotes (is_latest);
CREATE INDEX idx_quotes_status ON public.quotes (status_code);

-- 6) quote_line_items
CREATE TABLE public.quote_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('PRODUCT_BASE','FIXED','MAN_DAYS','STAY_MAN_DAYS')),
  label text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  line_total numeric NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quote_line_items" ON public.quote_line_items FOR ALL USING (true) WITH CHECK (true);

-- Seed data
INSERT INTO public.companies (name) VALUES ('Acme Corp'), ('Bright Dental'), ('Orion Labs'), ('Zen Pharma');
INSERT INTO public.products (name, base_price) VALUES ('LIMS', 1000), ('Athina', 1500);
INSERT INTO public.statuses (code, label) VALUES ('DRAFT', 'Saved as draft'), ('PENDING_APPROVAL', 'Pending for approval'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected');
INSERT INTO public.additional_costs (code, label, default_unit_price) VALUES ('FIXED', 'Fixed', 500), ('MAN_DAYS', 'Man days', 2000), ('STAY_MAN_DAYS', 'Stay', 3500);
