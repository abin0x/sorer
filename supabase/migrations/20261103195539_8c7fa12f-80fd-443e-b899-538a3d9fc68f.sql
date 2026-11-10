-- 1) Ledger columns that the payments screens, reports and overdue queue already read.
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS is_refund boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS family_email text,
  ADD COLUMN IF NOT EXISTS team_id text,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS branch_name text,
  ADD COLUMN IF NOT EXISTS due_date text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

-- 2) Overdue-payment resolution cases (one per family account), written by the server.
CREATE TABLE IF NOT EXISTS public.payment_resolutions (
  id text PRIMARY KEY DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 24),
  created_date timestamptz NOT NULL DEFAULT now(),
  updated_date timestamptz NOT NULL DEFAULT now(),
  created_by text,
  created_by_id text,
  is_sample boolean DEFAULT false,
  club_id text NOT NULL,
  account_key text NOT NULL,
  source_type text,
  source_id text,
  source_label text,
  player_id text,
  player_name text,
  guardian_name text,
  family_email text,
  team_name text,
  branch_name text,
  amount_outstanding numeric NOT NULL DEFAULT 0,
  late_payment_count integer NOT NULL DEFAULT 0,
  late_payment_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  due_date text,
  last_late_payment_date text,
  days_overdue integer NOT NULL DEFAULT 0,
  aging_bucket text,
  priority text DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  assigned_to text,
  assigned_name text,
  next_follow_up text,
  contact_attempts integer NOT NULL DEFAULT 0,
  last_contacted_at text,
  last_contact_channel text,
  reminder_count integer NOT NULL DEFAULT 0,
  last_reminder_at text,
  plan_installments integer,
  plan_amount numeric,
  plan_first_due text,
  resolution_type text,
  resolution_note text,
  resolved_at text,
  resolved_by text,
  last_synced_at text,
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE (club_id, account_key)
);

GRANT SELECT ON public.payment_resolutions TO authenticated;
GRANT ALL ON public.payment_resolutions TO service_role;

ALTER TABLE public.payment_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_resolutions_read ON public.payment_resolutions
  FOR SELECT TO authenticated USING (public.is_club_manager(club_id));
CREATE POLICY tenant_module_required ON public.payment_resolutions
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.tenant_has_console_module(club_id, 'club_nexus'))
  WITH CHECK (public.tenant_has_console_module(club_id, 'club_nexus'));

CREATE INDEX IF NOT EXISTS payment_resolutions_club_status_idx ON public.payment_resolutions (club_id, status);

CREATE TRIGGER payment_resolutions_touch BEFORE UPDATE ON public.payment_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.staticbot_touch_updated_date();

-- 3) Eclipse Select SC demo ledger: link charges to their registrations, use the
--    app's standard statuses, and spread missed installments across aging tiers.
UPDATE public.payments p SET
  source_id = COALESCE(p.source_id, r.id),
  team_id = COALESCE(p.team_id, r.team_id),
  team_name = COALESCE(p.team_name, r.team_name),
  branch_id = COALESCE(p.branch_id, r.location_id),
  branch_name = COALESCE(p.branch_name, r.location_name)
FROM public.registrations r
WHERE p.club_id = 'eclipse-select' AND r.club_id = 'eclipse-select' AND r.player_id = p.player_id;

UPDATE public.payments p SET family_email = g.email, guardian_name = COALESCE(NULLIF(trim(coalesce(g.first_name,'') || ' ' || coalesce(g.last_name,'')), ''), p.guardian_name)
FROM public.guardians g
WHERE p.club_id = 'eclipse-select' AND g.club_id = 'eclipse-select' AND g.email IS NOT NULL
  AND g.player_ids::text LIKE '%' || p.player_id || '%';

UPDATE public.payments SET status = 'paid_in_full' WHERE club_id = 'eclipse-select' AND status = 'paid';
UPDATE public.payments SET status = 'scheduled', due_date = payment_date WHERE club_id = 'eclipse-select' AND status = 'pending';

WITH late AS (
  SELECT id, row_number() OVER (ORDER BY player_id) AS n
  FROM public.payments WHERE club_id = 'eclipse-select' AND status = 'overdue'
)
UPDATE public.payments p SET
  status = CASE WHEN late.n % 9 = 0 THEN 'payment_failed' ELSE 'past_due' END,
  payment_date = to_char(current_date - (CASE late.n % 4 WHEN 0 THEN 12 WHEN 1 THEN 38 WHEN 2 THEN 71 ELSE 104 END), 'YYYY-MM-DD'),
  due_date = to_char(current_date - (CASE late.n % 4 WHEN 0 THEN 12 WHEN 1 THEN 38 WHEN 2 THEN 71 ELSE 104 END), 'YYYY-MM-DD'),
  notes = CASE WHEN late.n % 9 = 0 THEN 'Card declined — insufficient funds' ELSE 'Installment not received by due date' END
FROM late WHERE p.id = late.id;