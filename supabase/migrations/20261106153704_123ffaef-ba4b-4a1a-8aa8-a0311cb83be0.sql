ALTER TABLE public.marketplace_orders
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS processor_form_url text,
  ADD COLUMN IF NOT EXISTS processor_transaction_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;