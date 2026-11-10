ALTER TABLE public.clubs ADD COLUMN IF NOT EXISTS derived_brand_colors jsonb NOT NULL DEFAULT '{}'::jsonb;
NOTIFY pgrst, 'reload schema';